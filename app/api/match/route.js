import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_ABSTRACT_CHARS = 12000;

function cleanText(value, maxLength = 1500) {
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
    const { abstract, proposalTitle } = await request.json();

    const cleanAbstract = cleanText(abstract, MAX_ABSTRACT_CHARS);
    const cleanProposalTitle = cleanText(proposalTitle, 500);

    if (!cleanAbstract) {
      return Response.json({
        success: false,
        error: "กรุณาใส่ abstract",
      });
    }

    const { data: fundings, error: fundingError } = await supabase
      .from("funding_sources")
      .select("id, name, requirements, deadline, status")
      .eq("status", "open");

    if (fundingError) {
      return Response.json({
        success: false,
        error: fundingError.message,
      });
    }

    if (!fundings || fundings.length === 0) {
      return Response.json({
        success: false,
        error: "ไม่มีแหล่งทุนที่เปิดรับอยู่ในระบบ",
      });
    }

    const fundingList = fundings
      .map((funding, index) => {
        return `${index + 1}. FUNDING_ID: ${funding.id}
ชื่อแหล่งทุน: ${funding.name}
กรอบโจทย์/เงื่อนไข: ${funding.requirements || "ไม่ระบุ"}
วันปิดรับ: ${funding.deadline || "ไม่ระบุ"}`;
      })
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_completion_tokens: 2500,
      response_format: {
        type: "json_object",
      },
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
3. ถ้าแหล่งทุนมีหลายแผนงาน ให้เลือกประเมินจาก “แผนงานที่โครงการตรงที่สุด”
4. ห้ามลดคะแนนเพียงเพราะโครงการไม่เกี่ยวข้องกับแผนงานอื่นของแหล่งทุนเดียวกัน
5. โครงการที่ตรงกับอย่างน้อย 1 แผนงานอย่างชัดเจน มีสิทธิ์ได้คะแนน 75 ขึ้นไป แม้ไม่ตรงกับทุกแผนงาน
6. reason_match ต้องระบุชื่อแผนงานที่ตรงที่สุดเสมอ หากข้อมูลแหล่งทุนมีแผนงานหลายข้อ
7. พิจารณาความพร้อมต่อยอดด้วย เช่น นวัตกรรม เทคโนโลยี การใช้จริง หน่วยงานนำร่อง ผู้ประกอบการร่วมดำเนินงาน การขยายผล และผลกระทบเชิงเศรษฐกิจ/สังคม
8. ห้ามสมมติรายละเอียดที่ไม่มีใน abstract หรือกรอบโจทย์

ช่วงคะแนน:
- 90-100: ตรงกับแผนงานโดยตรงมาก พร้อมทดลองใช้หรือขยายผล และมีผู้ใช้ประโยชน์/พันธมิตรชัดเจน
- 75-89: ตรงกับอย่างน้อย 1 แผนงานอย่างมีนัยสำคัญ แต่ยังต้องเพิ่มความพร้อมด้านต้นแบบ พันธมิตร หรือแผนขยายผล
- 60-74: เกี่ยวข้องกับประเด็นทุน แต่ยังไม่ชัดเจนว่าเข้ากรอบแผนงานหรือพร้อมใช้จริง
- 40-59: เกี่ยวข้องในภาพรวม แต่ไม่ตรงกับกรอบโจทย์หลักอย่างชัดเจน
- 0-39: ไม่สอดคล้องกับแผนงานหรือเป้าหมายของแหล่งทุน

reason_match เขียน 2-3 ประโยค
reason_mismatch เขียน 1-2 ประโยค
เรียงผลลัพธ์จาก score สูงไปต่ำ`,
        },
        {
          role: "user",
          content: `ชื่อโครงการ:
${cleanProposalTitle || "ไม่ระบุ"}

Abstract โครงการ:
${cleanAbstract}

ข้อมูลแหล่งทุน:
${fundingList}`,
        },
      ],
    });

    const modelContent = completion.choices?.[0]?.message?.content;

    if (!modelContent) {
      throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");
    }

    let raw;

    try {
      raw = JSON.parse(modelContent);
    } catch {
      throw new Error("AI ส่งผลลัพธ์ที่ไม่ใช่ JSON");
    }

    if (!Array.isArray(raw.results)) {
      throw new Error("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง");
    }

    const fundingIds = new Set(fundings.map((funding) => String(funding.id)));

    const aiResultsByFundingId = new Map();

    for (const item of raw.results) {
      const fundingId = String(item?.funding_id || "").trim();

      if (fundingIds.has(fundingId)) {
        aiResultsByFundingId.set(fundingId, item);
      }
    }

    const results = fundings
      .map((funding) => {
        const aiResult = aiResultsByFundingId.get(String(funding.id));

        return {
          funding_id: funding.id,
          funding_name: funding.name,
          score: normalizeScore(aiResult?.score),
          reason_match:
            cleanText(aiResult?.reason_match, 2000) ||
            "AI ไม่สามารถสรุปความเหมาะสมของแหล่งทุนนี้ได้",
          reason_mismatch:
            cleanText(aiResult?.reason_mismatch, 1500) ||
            "ควรตรวจสอบกรอบโจทย์และเงื่อนไขของแหล่งทุนเพิ่มเติม",
        };
      })
      .sort((a, b) => b.score - a.score);

    if (cleanProposalTitle) {
      const { data: proposal, error: proposalError } = await supabase
        .from("proposals")
        .insert({
          title: cleanProposalTitle,
          content_text: cleanAbstract,
        })
        .select()
        .single();

      if (proposalError) {
        throw new Error(proposalError.message);
      }

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
        throw new Error(matchError.message);
      }
    }

    return Response.json({
      success: true,
      results,
    });
  } catch (err) {
    console.error("MATCH ERROR:", err.message);

    return Response.json(
      {
        success: false,
        error: err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ความเหมาะสม",
      },
      {
        status: 500,
      },
    );
  }
}
