"use client";

import { useState } from "react";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;

function getScoreColor(score) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function readResponse(response) {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      success: false,
      error: "เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง",
    };
  }
}

// SVG Icons from Google Material (without lucide-react)
const Icons = {
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Document: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Sparkle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5z"/>
      <path d="M19 5l-1 3 3 1-3 1 1 3-3-1-1 3-1-3-3-1 3-1-1-3 3 1z"/>
    </svg>
  ),
  Link: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Target: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  BarChart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Award: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
};

export default function Home() {
  const [tab, setTab] = useState("match");

  // ---------------------------
  // Matching states
  // ---------------------------
  const [proposalMode, setProposalMode] = useState("text");
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [proposalFileName, setProposalFileName] = useState("");
  const [proposalPages, setProposalPages] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchResults, setMatchResults] = useState([]);

  // ---------------------------
  // Funding extraction states
  // ---------------------------
  const [fundingMode, setFundingMode] = useState("text");
  const [fundingUrl, setFundingUrl] = useState("");
  const [fundingText, setFundingText] = useState("");
  const [fundingFile, setFundingFile] = useState(null);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState("");
  const [fundingResult, setFundingResult] = useState(null);

  async function handleProposalPdf(file) {
    setMatchError("");
    setMatchResults([]);
    setProposalText("");
    setProposalFileName("");
    setProposalPages(null);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setMatchError("รองรับเฉพาะไฟล์ PDF");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setMatchError("ไฟล์ PDF ต้องมีขนาดไม่เกิน 4 MB");
      return;
    }

    setProposalLoading(true);
    setProposalFileName(`กำลังอ่านข้อความจาก ${file.name}`);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch("/api/proposals/upload", {
        method: "POST",
        body: formData,
      });

      const data = await readResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถอ่านข้อความจาก PDF ได้");
      }

      setProposalText(data.text || "");
      setProposalFileName(data.fileName || file.name);
      setProposalPages(data.totalPages || null);
    } catch (error) {
      setProposalFileName("");
      setMatchError(error.message || "ไม่สามารถอ่านข้อความจาก PDF ได้");
    } finally {
      setProposalLoading(false);
    }
  }

  async function handleMatch() {
    setMatchError("");
    setMatchResults([]);

    const abstract = proposalText.trim().slice(0, MAX_TEXT_CHARS);

    if (!abstract) {
      setMatchError(
        proposalMode === "pdf"
          ? "กรุณาแนบ PDF และรอให้ระบบอ่านข้อความเสร็จ"
          : "กรุณาวางข้อความ Abstract ก่อน"
      );
      return;
    }

    setMatchLoading(true);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          abstract,
          proposalTitle: proposalTitle.trim(),
        }),
      });

      const data = await readResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถวิเคราะห์ได้");
      }

      setMatchResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      setMatchError(error.message || "เกิดข้อผิดพลาดในการวิเคราะห์");
    } finally {
      setMatchLoading(false);
    }
  }

  function handleFundingFile(file) {
    setFundingError("");
    setFundingResult(null);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFundingError("รองรับเฉพาะไฟล์ PDF");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setFundingError("ไฟล์ PDF ต้องมีขนาดไม่เกิน 4 MB");
      return;
    }

    setFundingFile(file);
  }

  async function handleFundingExtract() {
    setFundingError("");
    setFundingResult(null);

    const text = fundingText.trim().slice(0, MAX_TEXT_CHARS);

    if (fundingMode === "text" && !text) {
      setFundingError("กรุณาวางข้อความประกาศแหล่งทุน");
      return;
    }

    if (fundingMode === "pdf" && !fundingFile) {
      setFundingError("กรุณาเลือกไฟล์ PDF");
      return;
    }

    setFundingLoading(true);

    try {
      const formData = new FormData();

      if (fundingUrl.trim()) {
        formData.append("url", fundingUrl.trim());
      }

      if (fundingMode === "pdf") {
        formData.append("file", fundingFile, fundingFile.name);
      } else {
        formData.append("content", text);
      }

      const response = await fetch("/api/funding/extract", {
        method: "POST",
        body: formData,
      });

      const data = await readResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถสกัดข้อมูลแหล่งทุนได้");
      }

      setFundingResult(data);
    } catch (error) {
      setFundingError(
        error.message || "เกิดข้อผิดพลาดในการสกัดข้อมูลแหล่งทุน"
      );
    } finally {
      setFundingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8 text-slate-800 antialiased">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-600/10">
                <Icons.Sparkle />
                PMU Matching
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              ระบบจับคู่โครงการกับแหล่งทุน
            </h1>
            <p className="mt-1.5 text-slate-500">
              วิเคราะห์ความเหมาะสมของโครงการและสกัดข้อมูลประกาศแหล่งทุนด้วย AI
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            พร้อมใช้งาน
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setTab("match")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "match"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icons.Target />
            วิเคราะห์โครงการ
          </button>

          <button
            type="button"
            onClick={() => setTab("funding")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "funding"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icons.BarChart />
            สกัดข้อมูลแหล่งทุน
          </button>
        </div>

        {tab === "match" && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  วิเคราะห์ความเหมาะสม
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  วาง Abstract หรืออัปโหลด PDF เพื่อให้ AI จับคู่กับแหล่งทุน
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 ring-1 ring-indigo-600/10">
                ขั้นตอนที่ 1
              </span>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                ชื่อโครงการ
              </label>
              <input
                value={proposalTitle}
                onChange={(event) => setProposalTitle(event.target.value)}
                placeholder="เช่น โครงการพัฒนา AI เพื่อการเกษตร"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                รูปแบบข้อมูล
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProposalMode("text");
                    setProposalFileName("");
                    setProposalPages(null);
                    setMatchError("");
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    proposalMode === "text"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icons.Document />
                  วางข้อความ
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProposalMode("pdf");
                    setProposalText("");
                    setMatchError("");
                    setMatchResults([]);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    proposalMode === "pdf"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icons.Upload />
                  แนบ PDF
                </button>
              </div>
            </div>

            {proposalMode === "text" ? (
              <textarea
                value={proposalText}
                onChange={(event) => setProposalText(event.target.value)}
                placeholder="วาง Abstract หรือบทคัดย่อโครงการที่นี่..."
                className="mt-4 min-h-[200px] w-full rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-8 transition hover:border-indigo-300">
                <label className="block cursor-pointer text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icons.Upload />
                  </div>
                  <span className="block text-sm font-medium text-slate-700">
                    เลือกไฟล์ PDF เพื่ออ่านข้อความ
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB
                  </span>

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleProposalPdf(file);
                    }}
                  />
                </label>

                {proposalLoading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    กำลังอ่านข้อความจาก PDF...
                  </div>
                )}

                {proposalFileName && !proposalLoading && (
                  <div className="mt-4 rounded-lg bg-white p-4 text-sm ring-1 ring-slate-200">
                    <div className="flex items-center gap-2">
                      <Icons.Check />
                      <span className="font-medium text-emerald-600">
                        อ่านข้อความสำเร็จ
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">
                      <span className="font-medium">ไฟล์:</span>{" "}
                      {proposalFileName}
                    </p>
                    {proposalPages && (
                      <p className="mt-0.5 text-slate-600">
                        <span className="font-medium">จำนวนหน้า:</span>{" "}
                        {proposalPages}
                      </p>
                    )}
                    {proposalText && (
                      <p className="mt-0.5 text-slate-600">
                        <span className="font-medium">ข้อความที่อ่านได้:</span>{" "}
                        {proposalText.length.toLocaleString()} ตัวอักษร
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={matchLoading || proposalLoading}
              onClick={handleMatch}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {matchLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  กำลังวิเคราะห์...
                </>
              ) : (
                <>
                  <Icons.Sparkle />
                  วิเคราะห์ความเหมาะสม
                </>
              )}
            </button>

            {matchError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                <Icons.Alert />
                <span>{matchError}</span>
              </div>
            )}

            {matchResults.length > 0 && (
              <div className="mt-8">
                <div className="mb-5 flex items-center gap-2">
                  <Icons.Award />
                  <h3 className="text-lg font-semibold text-slate-900">
                    ผลการจับคู่
                  </h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                    {matchResults.length} รายการ
                  </span>
                </div>

                <div className="space-y-4">
                  {matchResults.map((item, index) => {
                    const score = Math.round(Number(item.score) || 0);
                    const canOpenUrl = isSafeHttpUrl(item.url);

                    return (
                      <article
                        key={`${item.funding_name}-${index}`}
                        className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-medium text-indigo-600">
                                {index + 1}
                              </span>
                              <h4 className="text-base font-semibold text-slate-900">
                                {item.funding_name}
                              </h4>
                            </div>

                            {canOpenUrl && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                              >
                                <Icons.Link />
                                ดูรายละเอียดแหล่งทุน
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                            <div className="text-right">
                              <span
                                className={`text-3xl font-bold ${getScoreColor(
                                  score
                                )}`}
                              >
                                {score}%
                              </span>
                              <p className="text-xs text-slate-400">
                                ความเหมาะสม
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm">
                          <div className="flex items-start gap-2 rounded-lg bg-emerald-50/50 p-2.5 text-emerald-700">
                            <span className="mt-0.5 font-semibold">
                              เหมาะสม:
                            </span>
                            <span>{item.reason_match || "-"}</span>
                          </div>

                          <div className="flex items-start gap-2 rounded-lg bg-rose-50/50 p-2.5 text-rose-700">
                            <span className="mt-0.5 font-semibold">
                              ข้อจำกัด:
                            </span>
                            <span>{item.reason_mismatch || "-"}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "funding" && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  สกัดข้อมูลแหล่งทุน
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  วางข้อความประกาศหรือแนบ PDF เพื่อให้ AI สรุปและบันทึกข้อมูล
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 ring-1 ring-indigo-600/10">
                ขั้นตอนที่ 2
              </span>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                URL อ้างอิง <span className="text-xs text-slate-400">(ไม่บังคับ)</span>
              </label>
              <input
                value={fundingUrl}
                onChange={(event) => setFundingUrl(event.target.value)}
                placeholder="https://example.org/funding"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                รูปแบบข้อมูล
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFundingMode("text");
                    setFundingFile(null);
                    setFundingError("");
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    fundingMode === "text"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icons.Document />
                  วางข้อความ
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFundingMode("pdf");
                    setFundingText("");
                    setFundingError("");
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    fundingMode === "pdf"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icons.Upload />
                  แนบ PDF
                </button>
              </div>
            </div>

            {fundingMode === "text" ? (
              <textarea
                value={fundingText}
                onChange={(event) => setFundingText(event.target.value)}
                placeholder="วางประกาศหรือกรอบโจทย์แหล่งทุนที่นี่..."
                className="mt-4 min-h-[200px] w-full rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-8 transition hover:border-indigo-300">
                <label className="block cursor-pointer text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icons.Upload />
                  </div>
                  <span className="block text-sm font-medium text-slate-700">
                    เลือกไฟล์ PDF ของประกาศแหล่งทุน
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB
                  </span>

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleFundingFile(file);
                    }}
                  />
                </label>

                {fundingFile && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
                    <Icons.Check />
                    <span className="font-medium text-emerald-600">
                      {fundingFile.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={fundingLoading}
              onClick={handleFundingExtract}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {fundingLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  กำลังสกัดข้อมูล...
                </>
              ) : (
                <>
                  <Icons.Sparkle />
                  สกัดข้อมูลแหล่งทุน
                </>
              )}
            </button>

            {fundingError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                <Icons.Alert />
                <span>{fundingError}</span>
              </div>
            )}

            {fundingResult?.data && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-indigo-600">
                      ผลการสกัดข้อมูล
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {fundingResult.data.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
                    เสร็จสิ้น
                  </span>
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-600 min-w-[80px]">
                      สถานะ:
                    </span>
                    <span className="text-slate-800">
                      {fundingResult.data.status || "-"}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="flex items-center gap-1 font-medium text-slate-600 min-w-[80px]">
                      <Icons.Calendar />
                      วันปิดรับ:
                    </span>
                    <span className="text-slate-800">
                      {fundingResult.data.deadline || "ไม่ระบุ"}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-600 min-w-[80px]">
                      กรอบโจทย์:
                    </span>
                    <span className="text-slate-800 leading-relaxed">
                      {fundingResult.data.requirements || "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}