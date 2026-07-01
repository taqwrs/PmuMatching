"use client";

import { useState } from "react";
import { useAppAlert } from "@/components/pmu/AppAlerts";
import { isSafeHttpUrl } from "@/lib/utils/http";
import {
  downloadMatchReportExcel,
  getReportLimitLabel,
  getReportStatusFilterLabel,
  printMatchReportPdf,
} from "@/lib/utils/matchReportExport";

const EXPORT_LIMIT_OPTIONS = [
  { value: "3", label: "Top 3" },
  { value: "5", label: "Top 5" },
  { value: "10", label: "Top 10" },
  { value: "all", label: "ทั้งหมด" },
];

const EXPORT_STATUS_OPTIONS = [
  { value: "open", label: "เปิดรับอยู่" },
  { value: "all", label: "ทุกสถานะ" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function scoreClasses(score) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-error";
}

function getScoreRing(score) {
  if (score >= 70) return "ring-success/20 bg-success/5";
  if (score >= 40) return "ring-warning/20 bg-warning/5";
  return "ring-error/20 bg-error/5";
}

function getScoreBarClass(score) {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-error";
}

function getScoreLevel(score) {
  if (score >= 70) {
    return {
      label: "สูง",
      className: "bg-success/15 text-success",
      dotClass: "bg-success",
    };
  }

  if (score >= 40) {
    return {
      label: "ปานกลาง",
      className: "bg-warning/15 text-warning",
      dotClass: "bg-warning",
    };
  }

  return {
    label: "ต่ำ",
    className: "bg-error/15 text-error",
    dotClass: "bg-error",
  };
}

function getFundingStatusLabel(status) {
  const labels = {
    open: "เปิดรับ",
    upcoming: "ยังไม่เปิดรับ",
    closed: "ปิดรับแล้ว",
  };

  return labels[status] || "ไม่ระบุสถานะ";
}

function getFundingStatusClass(status) {
  if (status === "open") return "badge-success";
  if (status === "upcoming") return "badge-warning";
  if (status === "closed") return "badge-error";

  return "badge-ghost";
}

function filterResultsByStatus(results, statusFilter) {
  if (statusFilter === "all") return results;
  return results.filter((item) => item?.status === statusFilter);
}

function limitResults(results, limit) {
  if (limit === "all") return results;

  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return results.slice(0, 3);
  }

  return results.slice(0, Math.floor(numericLimit));
}

function openGmailDraft({
  recipientInput,
  proposalTitle,
  resultLabel,
  statusLabel,
  resultCount,
}) {
  const emails = recipientInput
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (!emails.length) {
    return {
      ok: false,
      message: "กรุณาระบุอีเมลผู้รับอย่างน้อย 1 รายการ",
    };
  }

  const invalidEmails = emails.filter((email) => !EMAIL_PATTERN.test(email));

  if (invalidEmails.length) {
    return {
      ok: false,
      message: "พบรูปแบบอีเมลไม่ถูกต้อง",
    };
  }

  if (!resultCount) {
    return {
      ok: false,
      message: "ไม่พบแหล่งทุนตามสถานะที่เลือกสำหรับสร้างอีเมล",
    };
  }

  const safeProposalTitle = proposalTitle?.trim() || "ไม่ระบุชื่อโครงการ";
  const subject = `ผลการจับคู่แหล่งทุน: ${safeProposalTitle}`;
  const body = [
    "เรียน ผู้เกี่ยวข้อง",
    "",
    "ขอส่งผลการจับคู่แหล่งทุนสำหรับโครงการ:",
    safeProposalTitle,
    "",
    `จำนวนผลลัพธ์: ${resultLabel}`,
    `สถานะ: ${statusLabel}`,
    `จำนวนรายการ: ${resultCount} รายการ`,
    "",
    "กรุณาดาวน์โหลดรายงาน PDF หรือ Excel จากระบบ และแนบไฟล์ก่อนกดส่งอีเมล",
    "",
    "กรุณาช่วยประเมินความพึงพอใจ",
    "แบบประเมินความพึงพอใจ: https://forms.gle/7mxfNYgjmM3SwqHs9",
    "",
    "ขอแสดงความนับถือ",
  ].join("\n");

  const gmailUrl = new URL("https://mail.google.com/mail/");
  gmailUrl.searchParams.set("view", "cm");
  gmailUrl.searchParams.set("fs", "1");
  gmailUrl.searchParams.set("to", emails.join(","));
  gmailUrl.searchParams.set("su", subject);
  gmailUrl.searchParams.set("body", body);

  try {
    window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
  } catch {
    return {
      ok: false,
      message: "ไม่สามารถเปิด Gmail ได้ กรุณาลองใหม่อีกครั้ง",
    };
  }

  return { ok: true };
}

function formatDeadline(deadline) {
  if (!deadline) return "ไม่ระบุวันปิดรับ";

  const date = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันปิดรับ";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export default function MatchResultList({ results = [], proposalTitle = "" }) {
  const { showAlert } = useAppAlert();
  const [showAll, setShowAll] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportLimit, setExportLimit] = useState("3");
  const [exportStatusFilter, setExportStatusFilter] = useState("open");
  const [recipientInput, setRecipientInput] = useState("");

  const matchedResults = Array.isArray(results)
    ? results.filter((item) => Number(item?.score) > 0)
    : [];

  if (!matchedResults.length) return null;

  const visibleResults = showAll
    ? matchedResults
    : matchedResults.slice(0, 5);

  const hiddenCount = Math.max(0, matchedResults.length - 5);
  const exportLimitLabel = getReportLimitLabel(exportLimit);
  const exportStatusLabel = getReportStatusFilterLabel(exportStatusFilter);
  const exportableResults = filterResultsByStatus(
    matchedResults,
    exportStatusFilter,
  );
  const emailResults = limitResults(exportableResults, exportLimit);

  function handleExcelExport() {
    setExportError("");
    if (!exportableResults.length) {
      const message = "ไม่พบแหล่งทุนตามสถานะที่เลือกสำหรับส่งออก";
      setExportError(message);
      showAlert(message, { type: "warning" });
      return;
    }

    downloadMatchReportExcel({
      results: matchedResults,
      proposalTitle,
      limit: exportLimit,
      statusFilter: exportStatusFilter,
    });
    showAlert("ส่งออกรายงาน Excel สำเร็จ", { type: "success" });
  }

  function handlePdfExport() {
    setExportError("");
    if (!exportableResults.length) {
      const message = "ไม่พบแหล่งทุนตามสถานะที่เลือกสำหรับส่งออก";
      setExportError(message);
      showAlert(message, { type: "warning" });
      return;
    }

    const opened = printMatchReportPdf({
      results: matchedResults,
      proposalTitle,
      limit: exportLimit,
      statusFilter: exportStatusFilter,
    });

    if (!opened) {
      const message = "ไม่สามารถเปิดหน้าต่างรายงาน PDF ได้ กรุณาอนุญาต popup แล้วลองใหม่";
      setExportError(message);
      showAlert(message, { type: "error" });
      return;
    }

    showAlert("เปิดรายงาน PDF สำเร็จ", { type: "success" });
  }

  function handleEmailDraft() {
    setExportError("");

    const result = openGmailDraft({
      recipientInput,
      proposalTitle,
      resultLabel: exportLimitLabel,
      statusLabel: exportStatusLabel,
      resultCount: emailResults.length,
    });

    if (!result.ok) {
      setExportError(result.message);
      showAlert(result.message, { type: "warning" });
      return;
    }

    showAlert("เปิด Gmail พร้อมร่างข้อความแล้ว", { type: "success" });
  }

  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M11 8v6" />
              <path d="M8 11h6" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold leading-tight text-base-content">
              ผลการจับคู่
            </h2>
            <p className="text-sm text-base-content/40">
              แหล่งทุนที่ตรงกับโครงการของคุณ
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              aria-label="จำนวนรายการที่ส่งออก"
              className="select select-sm select-bordered w-28"
              value={exportLimit}
              onChange={(event) => setExportLimit(event.target.value)}
            >
              {EXPORT_LIMIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              aria-label="สถานะแหล่งทุนที่ส่งออก"
              className="select select-sm select-bordered w-36"
              value={exportStatusFilter}
              onChange={(event) => setExportStatusFilter(event.target.value)}
            >
              {EXPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-sm btn-outline gap-2"
              onClick={handlePdfExport}
            >
              <PrintIcon />
              PDF {exportLimitLabel}
            </button>

            <button
              type="button"
              className="btn btn-accent btn-sm btn-outline gap-2"
              onClick={handleExcelExport}
            >
              <DownloadIcon />
              Excel {exportLimitLabel}
            </button>

            <span className="badge badge-ghost hidden px-3 py-3 text-xs sm:inline-flex">
              {exportStatusLabel}: {exportableResults.length} รายการ
            </span>

            <span className="badge badge-success gap-1.5 px-4 py-3">
              <StatusIcon />
              {matchedResults.length} รายการ
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-base-content/60 lg:text-right"
              htmlFor="email-recipients"
            >
              อีเมลผู้รับ
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <input
                id="email-recipients"
                type="text"
                inputMode="email"
                className="input input-sm input-bordered w-full sm:w-80"
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                placeholder="example@email.com, team@email.com"
                aria-label="อีเมลผู้รับ"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleEmailDraft}
              >
                เปิดอีเมลพร้อมร่างข้อความ
              </button>
            </div>
            <p className="text-xs leading-relaxed text-base-content/50 lg:text-right">
              ระบบจะเปิด Gmail ในแท็บใหม่ กรุณาดาวน์โหลดและแนบไฟล์ PDF หรือ Excel เองก่อนส่ง
            </p>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="alert alert-warning mb-4 text-sm">
          <span>{exportError}</span>
        </div>
      )}

      <div className="space-y-4">
        {visibleResults.map((item, index) => {
          const score = Math.round(Number(item.score) || 0);
          const canOpenUrl = isSafeHttpUrl(item.url);
          const scoreLevel = getScoreLevel(score);

          return (
            <article
              key={`${item.funding_id || item.funding_name}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${getScoreBarClass(
                  score
                )}`}
              />

              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200/80 text-sm font-bold text-base-content/60 transition-colors group-hover:bg-base-200">
                        #{index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-tight text-base-content">
                          {item.funding_name || "ไม่ระบุชื่อแหล่งทุน"}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`badge badge-sm gap-1 ${getFundingStatusClass(
                              item.status
                            )}`}
                          >
                            <StatusIcon />
                            {getFundingStatusLabel(item.status)}
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs text-base-content/55">
                            <CalendarIcon />
                            ปิดรับ: {formatDeadline(item.deadline)}
                          </span>
                        </div>

                        {canOpenUrl && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary-focus"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            ดูรายละเอียด
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex shrink-0 items-center gap-4 rounded-2xl px-5 py-3 ring-1 ${getScoreRing(
                      score
                    )}`}
                  >
                    <div className="text-right">
                      <p
                        className={`text-3xl font-bold leading-none ${scoreClasses(
                          score
                        )}`}
                      >
                        {score}%
                      </p>
                      <p className="mt-1 text-xs font-medium text-base-content/40">
                        ความเหมาะสม
                      </p>
                    </div>

                    <div className="h-12 w-px bg-base-300/50" />

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${scoreLevel.className}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${scoreLevel.dotClass}`}
                      />
                      {scoreLevel.label}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-success/10 bg-success/5 p-4 transition-colors hover:bg-success/10">
                    <div className="flex items-center gap-2">
                      <span className="text-success">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </span>
                      <p className="text-sm font-semibold text-success">
                        จุดแข็ง
                      </p>
                    </div>

                    <p className="mt-1.5 text-sm leading-relaxed text-base-content/80">
                      {item.reason_match || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-error/10 bg-error/5 p-4 transition-colors hover:bg-error/10">
                    <div className="flex items-center gap-2">
                      <span className="text-error">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </span>
                      <p className="text-sm font-semibold text-error">
                        ข้อควรระวัง
                      </p>
                    </div>

                    <p className="mt-1.5 text-sm leading-relaxed text-base-content/80">
                      {item.reason_mismatch || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {matchedResults.length > 5 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="btn btn-outline btn-primary"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll
              ? "ซ่อนรายการเพิ่มเติม"
              : `ดูแหล่งทุนเพิ่มเติม ${hiddenCount} รายการ`}
          </button>
        </div>
      )}
    </section>
  );
}
