import Groq from "groq-sdk";
import { getSupabase } from "@/lib/supabase";
import { ensureCaptchaVerified, CaptchaErrorClass } from "@/lib/utils/captcha";
import {
  getBangkokDate,
  getEffectiveFundingStatus,
} from "@/lib/utils/fundingStatus";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_ABSTRACT_CHARS = 12000;
const GROQ_TIMEOUT_MS = 60000;
const MIN_SCORE_TO_SAVE = 1;
const MATCH_BATCH_SIZE = 10;
const MATCH_BATCH_RETRY_LIMIT = 1;
const DEFAULT_PROPOSAL_TITLE = "Untitled proposal";

// ─── Groq client ──────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function cleanText(value, maxLength = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function fundingDebugLabel(funding) {
  return `${funding.id}: ${cleanText(funding.name, 80) || "Untitled funding"}`;
}

function summarizeUsage(batchDebugSummaries) {
  return batchDebugSummaries.reduce(
    (total, batch) => {
      for (const attempt of batch.attempts) {
        if (!attempt.usage) continue;
        total.prompt_tokens += Number(attempt.usage.prompt_tokens) || 0;
        total.completion_tokens += Number(attempt.usage.completion_tokens) || 0;
        total.total_tokens += Number(attempt.usage.total_tokens) || 0;
      }
      return total;
    },
    { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  );
}

// ─── AI prompt builders ───────────────────────────────────────────────────────

function buildFundingList(fundings, startIndex = 0) {
  return fundings
    .map(
      (f, i) =>
        `${startIndex + i + 1}. FUNDING_ID: ${f.id}
ชื่อแหล่งทุน: ${f.name}
กรอบโจทย์/เงื่อนไข: ${f.requirements || "ไม่ระบุ"}
วันปิดรับ: ${f.deadline || "ไม่ระบุ"}`,
    )
    .join("\n\n");
}

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการวิจัยและการจับคู่แหล่งทุน

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
เรียงผลลัพธ์จาก score สูงไปต่ำ`;

function buildUserPrompt({ proposalTitle, abstract, batchIndex, totalBatches, fundingList }) {
  return `ชื่อโครงการ:\n${proposalTitle || "ไม่ระบุ"}\n\nAbstract โครงการ:\n${abstract}\n\nBatch: ${batchIndex + 1}/${totalBatches}\nต้องประเมินเฉพาะ FUNDING_ID ใน batch นี้ และต้องตอบให้ครบทุก FUNDING_ID ที่ได้รับ\n\nข้อมูลแหล่งทุน:\n${fundingList}`;
}

// ─── AI layer ─────────────────────────────────────────────────────────────────

async function callGroqWithTimeout(messages) {
  const groqPromise = groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
    messages,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI ใช้เวลานานเกินกำหนด")), GROQ_TIMEOUT_MS),
  );

  return Promise.race([groqPromise, timeoutPromise]);
}

function parseGroqResponse(completion) {
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI ส่งผลลัพธ์ที่ไม่ใช่ JSON");
  }

  if (!Array.isArray(parsed.results)) {
    throw new Error("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง");
  }

  return { results: parsed.results, usage: completion.usage || null };
}

// ─── Batch matching ───────────────────────────────────────────────────────────

async function matchFundingBatch({ batchFundings, batchIndex, totalBatches, abstract, proposalTitle }) {
  const batchStartIndex = batchIndex * MATCH_BATCH_SIZE;
  const batchFundingIds = new Set(batchFundings.map((f) => String(f.id)));
  const resultsByFundingId = new Map();
  const attemptSummaries = [];
  let lastError = null;

  for (let attempt = 1; attempt <= MATCH_BATCH_RETRY_LIMIT + 1; attempt++) {
    const pendingFundings = batchFundings.filter(
      (f) => !resultsByFundingId.has(String(f.id)),
    );
    if (pendingFundings.length === 0) break;

    const fundingList = buildFundingList(pendingFundings, batchStartIndex);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt({ proposalTitle, abstract, batchIndex, totalBatches, fundingList }),
      },
    ];

    try {
      const completion = await callGroqWithTimeout(messages);
      const { results, usage } = parseGroqResponse(completion);

      for (const item of results) {
        const fundingId = String(item?.funding_id || "").trim();
        if (batchFundingIds.has(fundingId)) {
          resultsByFundingId.set(fundingId, item);
        }
      }

      attemptSummaries.push({
        attempt,
        requestedFundingCount: pendingFundings.length,
        aiResultCount: results.length,
        collectedValidResultCount: resultsByFundingId.size,
        missingResultCount: batchFundings.length - resultsByFundingId.size,
        usage,
      });

      lastError = null;
      if (resultsByFundingId.size === batchFundings.length) break;
    } catch (err) {
      lastError = err;
      attemptSummaries.push({ attempt, requestedFundingCount: pendingFundings.length, error: err.message });
      if (attempt > MATCH_BATCH_RETRY_LIMIT) throw err;
    }
  }

  return {
    resultsByFundingId,
    debugSummary: {
      batch: batchIndex + 1,
      fundingCount: batchFundings.length,
      validAiResultCount: resultsByFundingId.size,
      missingAiResultCount: batchFundings.length - resultsByFundingId.size,
      attempts: attemptSummaries,
      lastError: lastError?.message || null,
    },
  };
}

async function matchAllFundings({ fundings, abstract, proposalTitle }) {
  const batches = chunkArray(fundings, MATCH_BATCH_SIZE);
  const allRawResults = [];
  const batchDebugSummaries = [];

  for (const [batchIndex, batchFundings] of batches.entries()) {
    const { resultsByFundingId, debugSummary } = await matchFundingBatch({
      batchFundings,
      batchIndex,
      totalBatches: batches.length,
      abstract,
      proposalTitle,
    });

    allRawResults.push(...resultsByFundingId.values());
    batchDebugSummaries.push(debugSummary);
  }

  return { allRawResults, batchDebugSummaries };
}

// ─── Result processing ────────────────────────────────────────────────────────

function buildResults(fundings, allRawResults) {
  const fundingIds = new Set(fundings.map((f) => String(f.id)));
  const aiResultsByFundingId = new Map();
  const invalidAiFundingIds = [];
  const duplicateAiFundingIds = [];

  for (const item of allRawResults) {
    const fundingId = String(item?.funding_id || "").trim();
    if (!fundingIds.has(fundingId)) {
      if (fundingId) invalidAiFundingIds.push(fundingId);
      continue;
    }
    if (aiResultsByFundingId.has(fundingId)) {
      duplicateAiFundingIds.push(fundingId);
    }
    aiResultsByFundingId.set(fundingId, item);
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
        reason_match: cleanText(ai?.reason_match, 2000) || "AI ไม่สามารถสรุปความเหมาะสมได้",
        reason_mismatch: cleanText(ai?.reason_mismatch, 1500) || "ควรตรวจสอบกรอบโจทย์เพิ่มเติม",
      };
    })
    .sort((a, b) => b.score - a.score);

  const results = allResults.filter((item) => item.score >= MIN_SCORE_TO_SAVE);

  return { results, allResults, aiResultsByFundingId, invalidAiFundingIds, duplicateAiFundingIds };
}

// ─── Debug logging ────────────────────────────────────────────────────────────

function logDebugSummary({ fundings, allRawResults, results, allResults, aiResultsByFundingId, invalidAiFundingIds, duplicateAiFundingIds, batchDebugSummaries }) {
  const missingAiFundings = fundings.filter((f) => !aiResultsByFundingId.has(String(f.id)));
  const answeredBelowMinScore = allResults.filter(
    (item) =>
      aiResultsByFundingId.has(String(item.funding_id)) &&
      item.score < MIN_SCORE_TO_SAVE,
  );

  console.info("[MATCH DEBUG] summary", {
    fundingCount: fundings.length,
    aiResultCount: allRawResults.length,
    validAiResultCount: aiResultsByFundingId.size,
    invalidAiResultCount: invalidAiFundingIds.length,
    duplicateAiResultCount: duplicateAiFundingIds.length,
    missingAiResultCount: missingAiFundings.length,
    answeredBelowMinScoreCount: answeredBelowMinScore.length,
    savedResultCount: results.length,
    minScoreToSave: MIN_SCORE_TO_SAVE,
    batchSize: MATCH_BATCH_SIZE,
    batchRetryLimit: MATCH_BATCH_RETRY_LIMIT,
    totalUsage: summarizeUsage(batchDebugSummaries),
    batches: batchDebugSummaries,
  });

  if (missingAiFundings.length > 0) {
    console.info("[MATCH DEBUG] missing AI funding results", missingAiFundings.map(fundingDebugLabel));
  }

  if (answeredBelowMinScore.length > 0) {
    console.info(
      "[MATCH DEBUG] answered but filtered by score",
      answeredBelowMinScore.map(({ funding_id, funding_name, score }) => ({ funding_id, funding_name, score })),
    );
  }

  if (invalidAiFundingIds.length > 0 || duplicateAiFundingIds.length > 0) {
    console.info("[MATCH DEBUG] AI funding id issues", { invalidAiFundingIds, duplicateAiFundingIds });
  }
}

// ─── DB layer ─────────────────────────────────────────────────────────────────

async function closeExpiredFundings(supabase, fundings) {
  const today = getBangkokDate();
  const expiredFundingIds = fundings
    .filter((funding) => getEffectiveFundingStatus(funding.status, funding.deadline, today) === "closed")
    .filter((funding) => funding.status !== "closed")
    .map((funding) => funding.id);

  if (expiredFundingIds.length > 0) {
    const { error } = await supabase
      .from("funding_sources")
      .update({ status: "closed" })
      .in("id", expiredFundingIds);

    if (error) {
      throw new Error(`ไม่สามารถอัปเดตสถานะแหล่งทุนที่หมดเขตได้: ${error.message}`);
    }
  }

  return fundings.map((funding) => ({
    ...funding,
    status: getEffectiveFundingStatus(funding.status, funding.deadline, today),
  }));
}

async function saveMatchResults({ proposalTitle, abstract, results }) {
  const supabase = getSupabase();
  const title = cleanText(proposalTitle, 500) || DEFAULT_PROPOSAL_TITLE;

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({ title, content_text: abstract })
    .select()
    .single();

  if (proposalError) {
    console.error("PROPOSAL INSERT ERROR:", proposalError.message);
    throw new Error(`ไม่สามารถบันทึกข้อมูลโครงการได้: ${proposalError.message}`);
  }

  if (results.length === 0) {
    return proposal;
  }

  const matchRows = results.map((result) => ({
    proposal_id: proposal.id,
    funding_id: result.funding_id,
    score: result.score,
    reason_match: result.reason_match,
    reason_mismatch: result.reason_mismatch,
  }));

  const { error: matchError } = await supabase.from("match_results").insert(matchRows);
  if (matchError) {
    console.error("MATCH INSERT ERROR:", matchError.message);
    throw new Error(`ไม่สามารถบันทึกผลการจับคู่ได้: ${matchError.message}`);
  }

  return proposal;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    ensureCaptchaVerified(request);

    const { abstract, proposalTitle } = await request.json();
    const cleanAbstract = cleanText(abstract, MAX_ABSTRACT_CHARS);
    const cleanProposalTitle = cleanText(proposalTitle, 500);

    if (!cleanAbstract) {
      return Response.json({ success: false, error: "กรุณาใส่ abstract" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: fundings, error: fundingError } = await supabase
      .from("funding_sources")
      .select("id, name, requirements, deadline, status, url");

    if (fundingError) {
      return Response.json({ success: false, error: fundingError.message }, { status: 500 });
    }

    if (!fundings || fundings.length === 0) {
      return Response.json({ success: false, error: "ไม่มีแหล่งทุนที่เปิดรับอยู่ในระบบ" }, { status: 404 });
    }

    const effectiveFundings = await closeExpiredFundings(supabase, fundings);

    const { allRawResults, batchDebugSummaries } = await matchAllFundings({
      fundings: effectiveFundings,
      abstract: cleanAbstract,
      proposalTitle: cleanProposalTitle,
    });

    const { results, allResults, aiResultsByFundingId, invalidAiFundingIds, duplicateAiFundingIds } =
      buildResults(effectiveFundings, allRawResults);

    logDebugSummary({
      fundings: effectiveFundings,
      allRawResults,
      results,
      allResults,
      aiResultsByFundingId,
      invalidAiFundingIds,
      duplicateAiFundingIds,
      batchDebugSummaries,
    });

    const savedProposal = await saveMatchResults({
      proposalTitle: cleanProposalTitle,
      abstract: cleanAbstract,
      results,
    });

    return Response.json({
      success: true,
      results,
      total: results.length,
      proposalId: savedProposal.id,
    });
  } catch (err) {
    console.error("MATCH ERROR:", err.message);

    if (err instanceof CaptchaErrorClass) {
      return Response.json({ success: false, error: err.message }, { status: err.status });
    }

    return Response.json(
      { success: false, error: err.message || "เกิดข้อผิดพลาดในการวิเคราะห์" },
      { status: 500 },
    );
  }
}
