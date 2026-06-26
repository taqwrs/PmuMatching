import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";
import { ensureCaptchaVerified, CaptchaErrorClass } from "@/lib/utils/captcha";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_ABSTRACT_CHARS = 12000;
const GROQ_TIMEOUT_MS = 60000;
const MIN_SCORE_TO_SAVE = 1; // ไม่บันทึกถ้าทุกแหล่งทุนได้ 0

function cleanText(value, maxLength = 2000) {
  // แก้จุดที่ 4: เปลี่ยน default เป็น 2000
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(request) {
  try {
    ensureCaptchaVerified(request)
    const { abstract, proposalTitle } = await request.json();

    const cleanAbstract = cleanText(abstract, MAX_ABSTRACT_CHARS);
    const cleanProposalTitle = cleanText(proposalTitle, 500);

    if (!cleanAbstract) {
      return Response.json(
        { success: false, error: "กรุณาใส่ abstract" },
        { status: 400 },
      );
    }

    const { data: fundings, error: fundingError } = await supabase
      .from("funding_sources")
      .select("id, name, requirements, deadline, status, url");
    // .eq('status', 'open')

    if (fundingError) {
      return Response.json(
        { success: false, error: fundingError.message },
        { status: 500 },
      );
    }

    if (!fundings || fundings.length === 0) {
      return Response.json(
        { success: false, error: "ไม่มีแหล่งทุนที่เปิดรับอยู่ในระบบ" },
        { status: 404 },
      );
    }

    const fundingList = fundings
      .map(
        (f, i) => `${i + 1}. FUNDING_ID: ${f.id}
ชื่อแหล่งทุน: ${f.name}
กรอบโจทย์/เงื่อนไข: ${f.requirements || "ไม่ระบุ"}
วันปิดรับ: ${f.deadline || "ไม่ระบุ"}`,
      )
      .join("\n\n");

    // แก้จุดที่ 1: เพิ่ม Groq timeout
    const groqPromise = groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `คุณคือผู้เชี่ยวชาญด้านการวิจัยและการจับคู่แหล่งทุน

ตอบกลับเป็น JSON object เท่านั้น ห้ามใช้ Markdown ห้ามมีข้อความก่อนหรือหลัง JSON

ต้องตอบตามรูปแบบนี้เท่านั้น:
{
  "results": [
    {
      "funding_id": "รหัส FUNDING_ID จากข้อมูลที่ได้รับ",
      "score": 0,
      "reason_match": "เหตุผลความเหมาะสม",
      "reason_mismatch": "ข้อจำกัดและสิ่งที่ควรปรับ"
    }
  ]
}

กติกาการประเมิน:
1. ต้องวิเคราะห์ทุก FUNDING_ID ที่ได้รับ และห้ามสร้าง FUNDING_ID ใหม่
2. score คือระดับความสอดคล้องของโครงการกับแหล่งทุน ไม่ใช่โอกาสได้รับทุนจริง
3. ถ้าแหล่งทุนมีหลายแผนงาน ให้เลือกประเมินจากแผนงานที่โครงการตรงที่สุด
4. ห้ามลดคะแนนเพียงเพราะโครงการไม่เกี่ยวข้องกับแผนงานอื่นของแหล่งทุนเดียวกัน
5. โครงการที่ตรงกับอย่างน้อย 1 แผนงานอย่างชัดเจน มีสิทธิ์ได้คะแนน 75 ขึ้นไป
6. reason_match ต้องระบุชื่อแผนงานที่ตรงที่สุดเสมอ หากมีหลายแผนงาน
7. พิจารณาความพร้อมต่อยอด เช่น นวัตกรรม เทคโนโลยี หน่วยงานนำร่อง ผู้ประกอบการร่วม
8. ห้ามสมมติรายละเอียดที่ไม่มีใน abstract หรือกรอบโจทย์

ช่วงคะแนน:
- 90-100: ตรงกับแผนงานโดยตรงมาก พร้อมทดลองใช้หรือขยายผล มีพันธมิตรชัดเจน
- 75-89: ตรงกับอย่างน้อย 1 แผนงานอย่างมีนัยสำคัญ แต่ยังต้องเพิ่มความพร้อมบางด้าน
- 60-74: เกี่ยวข้องกับประเด็นทุน แต่ยังไม่ชัดเจนว่าเข้ากรอบแผนงาน
- 40-59: เกี่ยวข้องในภาพรวม แต่ไม่ตรงกับกรอบโจทย์หลักอย่างชัดเจน
- 0-39: ไม่สอดคล้องกับแผนงานหรือเป้าหมายของแหล่งทุน

reason_match เขียน 2-3 ประโยค
reason_mismatch เขียน 1-2 ประโยค
เรียงผลลัพธ์จาก score สูงไปต่ำ`,
        },
        {
          role: "user",
          content: `ชื่อโครงการ:\n${cleanProposalTitle || "ไม่ระบุ"}\n\nAbstract โครงการ:\n${cleanAbstract}\n\nข้อมูลแหล่งทุน:\n${fundingList}`,
        },
      ],
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("AI ใช้เวลานานเกินกำหนด")),
        GROQ_TIMEOUT_MS,
      ),
    );

    const completion = await Promise.race([groqPromise, timeoutPromise]);
    const modelContent = completion.choices?.[0]?.message?.content;

    if (!modelContent) throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");

    let raw;
    try {
      raw = JSON.parse(modelContent);
    } catch {
      throw new Error("AI ส่งผลลัพธ์ที่ไม่ใช่ JSON");
    }

    if (!Array.isArray(raw.results))
      throw new Error("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง");

    const fundingIds = new Set(fundings.map((f) => String(f.id)));
    const aiResultsByFundingId = new Map();

    for (const item of raw.results) {
      const fundingId = String(item?.funding_id || "").trim();
      if (fundingIds.has(fundingId)) {
        aiResultsByFundingId.set(fundingId, item);
      }
    }

    const allResults = fundings
      .map((f) => {
        const ai = aiResultsByFundingId.get(String(f.id));

        return {
          funding_id: f.id,
          funding_name: f.name,
          url: f.url || null,
          status: f.status || null,
          deadline: f.deadline || null,
          score: normalizeScore(ai?.score),
          reason_match:
            cleanText(ai?.reason_match, 2000) ||
            "AI ไม่สามารถสรุปความเหมาะสมได้",
          reason_mismatch:
            cleanText(ai?.reason_mismatch, 1500) ||
            "ควรตรวจสอบกรอบโจทย์เพิ่มเติม",
        };
      })
      .sort((a, b) => b.score - a.score);

    // เอาเฉพาะคะแนนมากกว่า 0%
    // MIN_SCORE_TO_SAVE = 1 จึงเท่ากับ score > 0
    const results = allResults.filter(
      (item) => item.score >= MIN_SCORE_TO_SAVE,
    );

    const response = Response.json({
      success: true,
      results,
      total: results.length,
    });

    // บันทึกเฉพาะเมื่อมีชื่อโครงการ และมีผลจับคู่มากกว่า 0%
    if (cleanProposalTitle && results.length > 0) {
      try {
        const { data: proposal, error: proposalError } = await supabase
          .from("proposals")
          .insert({
            title: cleanProposalTitle,
            content_text: cleanAbstract,
          })
          .select()
          .single();

        if (proposalError) {
          console.error("PROPOSAL INSERT ERROR:", proposalError.message);
        } else {
          // results ตอนนี้ไม่มีรายการ 0% แล้ว
          const matchRows = results.map((result) => ({
            proposal_id: proposal.id,
            funding_id: result.funding_id,
            score: result.score,
            reason_match: result.reason_match,
            reason_mismatch: result.reason_mismatch,
          }));

          const { error: matchError } = await supabase
            .from("match_results")
            .insert(matchRows);

          if (matchError) {
            console.error("MATCH INSERT ERROR:", matchError.message);
          }
        }
      } catch (saveErr) {
        console.error("SAVE ERROR:", saveErr.message);
      }
    }

    return response;
  } catch (err) {
    console.error("MATCH ERROR:", err.message);

    if (err instanceof CaptchaErrorClass) {
      return Response.json(
        { success: false, error: err.message },
        { status: err.status },
      );
    }

    return Response.json(
      { success: false, error: err.message || "เกิดข้อผิดพลาดในการวิเคราะห์" },
      { status: 500 },
    );
  }
}
