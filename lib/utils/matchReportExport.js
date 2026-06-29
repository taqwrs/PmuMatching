const REPORT_TITLE = "รายงานผลการจับคู่แหล่งทุน";
const DEFAULT_REPORT_LIMIT = 3;
const DEFAULT_STATUS_FILTER = "open";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getScoreLevel(score) {
  if (score >= 70) return "สูง";
  if (score >= 40) return "ปานกลาง";
  return "ต่ำ";
}

function getFundingStatusLabel(status) {
  const labels = {
    open: "เปิดรับ",
    upcoming: "ยังไม่เปิดรับ",
    closed: "ปิดรับแล้ว",
  };

  return labels[status] || "ไม่ระบุสถานะ";
}

function formatDeadline(deadline) {
  if (!deadline) return "ไม่ระบุวันปิดรับ";

  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันปิดรับ";

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatGeneratedAt(date = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function slugifyFileName(value) {
  const cleaned = String(value || "match-report")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return cleaned || "match-report";
}

function normalizeReportLimit(limit) {
  if (limit === "all") return null;

  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return DEFAULT_REPORT_LIMIT;
  }

  return Math.floor(numericLimit);
}

export function getReportLimitLabel(limit) {
  const normalizedLimit = normalizeReportLimit(limit);
  return normalizedLimit ? `Top ${normalizedLimit}` : "ทั้งหมด";
}

function getReportLimitFileSuffix(limit) {
  const normalizedLimit = normalizeReportLimit(limit);
  return normalizedLimit ? `top-${normalizedLimit}` : "all";
}

function normalizeStatusFilter(statusFilter) {
  return statusFilter === "all" ? "all" : DEFAULT_STATUS_FILTER;
}

export function getReportStatusFilterLabel(statusFilter) {
  return normalizeStatusFilter(statusFilter) === "all"
    ? "ทุกสถานะ"
    : "เฉพาะที่เปิดรับอยู่";
}

function getReportStatusFileSuffix(statusFilter) {
  return normalizeStatusFilter(statusFilter) === "all" ? "all-statuses" : "open";
}

function normalizeResults({
  results,
  limit = DEFAULT_REPORT_LIMIT,
  statusFilter = DEFAULT_STATUS_FILTER,
}) {
  if (!Array.isArray(results)) return [];

  const normalizedLimit = normalizeReportLimit(limit);
  const normalizedStatusFilter = normalizeStatusFilter(statusFilter);
  const filteredResults = results.filter((item) => {
    if (normalizeScore(item?.score) <= 0) return false;
    if (normalizedStatusFilter === "all") return true;

    return item?.status === normalizedStatusFilter;
  });
  const limitedResults = normalizedLimit
    ? filteredResults.slice(0, normalizedLimit)
    : filteredResults;

  return limitedResults.map((item, index) => ({
    rank: index + 1,
    fundingName: item?.funding_name || "ไม่ระบุชื่อแหล่งทุน",
    score: normalizeScore(item?.score),
    scoreLevel: getScoreLevel(normalizeScore(item?.score)),
    status: getFundingStatusLabel(item?.status),
    deadline: formatDeadline(item?.deadline),
    reasonMatch: item?.reason_match || "-",
    reasonMismatch: item?.reason_mismatch || "-",
    url: item?.url || "",
  }));
}

function buildReportMeta({ proposalTitle, total, limit, statusFilter }) {
  return {
    title: REPORT_TITLE,
    proposalTitle: proposalTitle?.trim() || "ไม่ระบุชื่อโครงการ",
    generatedAt: formatGeneratedAt(),
    resultLabel: getReportLimitLabel(limit),
    statusFilterLabel: getReportStatusFilterLabel(statusFilter),
    total,
  };
}

function buildExcelHtml({ rows, meta }) {
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${row.rank}</td>
          <td>${escapeHtml(row.fundingName)}</td>
          <td class="number">${row.score}</td>
          <td>${escapeHtml(row.scoreLevel)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.deadline)}</td>
          <td>${escapeHtml(row.reasonMatch)}</td>
          <td>${escapeHtml(row.reasonMismatch)}</td>
          <td>${escapeHtml(row.url)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Tahoma, Arial, sans-serif; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .meta { margin-bottom: 18px; color: #4b5563; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #0f766e; color: #ffffff; font-weight: 700; text-align: left; }
    th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
    td { mso-number-format: "\\@"; }
    .number { mso-number-format: "0"; text-align: right; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(meta.title)}</h1>
  <div class="meta">
    <div><strong>โครงการ:</strong> ${escapeHtml(meta.proposalTitle)}</div>
    <div><strong>วันที่สร้าง:</strong> ${escapeHtml(meta.generatedAt)}</div>
    <div><strong>ตัวกรองสถานะ:</strong> ${escapeHtml(meta.statusFilterLabel)}</div>
    <div><strong>จำนวนผลลัพธ์:</strong> ${meta.total} รายการ</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ลำดับ</th>
        <th>แหล่งทุน</th>
        <th>คะแนน (%)</th>
        <th>ระดับ</th>
        <th>สถานะ</th>
        <th>วันปิดรับ</th>
        <th>จุดแข็ง</th>
        <th>ข้อควรระวัง</th>
        <th>ลิงก์</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
}

function buildPrintableHtml({ rows, meta }) {
  const rowsHtml = rows
    .map(
      (row) => `
        <article class="result">
          <div class="result-head">
            <div>
              <div class="rank">อันดับ ${row.rank}</div>
              <h2>${escapeHtml(row.fundingName)}</h2>
            </div>
            <div class="score">
              <strong>${row.score}%</strong>
              <span>${escapeHtml(row.scoreLevel)}</span>
            </div>
          </div>
          <div class="badges">
            <span>${escapeHtml(row.status)}</span>
            <span>ปิดรับ: ${escapeHtml(row.deadline)}</span>
          </div>
          <section>
            <h3>จุดแข็ง</h3>
            <p>${escapeHtml(row.reasonMatch)}</p>
          </section>
          <section>
            <h3>ข้อควรระวัง</h3>
            <p>${escapeHtml(row.reasonMismatch)}</p>
          </section>
          ${
            row.url
              ? `<p class="url"><strong>ลิงก์:</strong> ${escapeHtml(row.url)}</p>`
              : ""
          }
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      color: #111827;
      font-family: Tahoma, Arial, sans-serif;
      line-height: 1.55;
    }
    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px;
      background: #ffffff;
      min-height: 100vh;
    }
    header {
      border-bottom: 4px solid #0f766e;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.2;
      color: #0f172a;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .meta div {
      border: 1px solid #dbe3ea;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      font-size: 13px;
    }
    .meta span {
      display: block;
      color: #64748b;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .summary {
      margin: 0 0 18px;
      color: #475569;
      font-size: 14px;
    }
    .result {
      break-inside: avoid;
      border: 1px solid #dbe3ea;
      border-radius: 12px;
      padding: 18px;
      margin: 14px 0;
    }
    .result-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }
    .rank {
      color: #0f766e;
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
    }
    h2 {
      margin: 0;
      font-size: 18px;
      color: #0f172a;
    }
    .score {
      min-width: 92px;
      border-radius: 10px;
      background: #ecfdf5;
      color: #047857;
      padding: 10px;
      text-align: center;
    }
    .score strong {
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .score span {
      font-size: 12px;
      font-weight: 700;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }
    .badges span {
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
    }
    section {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #edf2f7;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 13px;
      color: #0f766e;
    }
    p {
      margin: 0;
      font-size: 13px;
    }
    .url {
      margin-top: 10px;
      color: #2563eb;
      overflow-wrap: anywhere;
    }
    footer {
      margin-top: 24px;
      color: #94a3b8;
      font-size: 11px;
      text-align: center;
    }
    @media print {
      body { background: #ffffff; }
      .page { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <h1>${escapeHtml(meta.title)}</h1>
      <div class="meta">
        <div><span>โครงการ</span>${escapeHtml(meta.proposalTitle)}</div>
        <div><span>วันที่สร้าง</span>${escapeHtml(meta.generatedAt)}</div>
        <div><span>จำนวนผลลัพธ์</span>${meta.total} รายการ</div>
      </div>
    </header>
    <p class="summary">แสดงผลการจับคู่${escapeHtml(meta.resultLabel)} (${escapeHtml(meta.statusFilterLabel)}) โดยจัดเรียงตามคะแนนความเหมาะสมจากมากไปน้อย เพื่อใช้ประกอบการพิจารณาแหล่งทุนที่เกี่ยวข้องกับโครงการ</p>
    ${rowsHtml}
    <footer>สร้างจากระบบ PMU Matching</footer>
  </main>
  <script>
    window.addEventListener("load", () => {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;
}

export function downloadMatchReportExcel({
  results,
  proposalTitle,
  limit,
  statusFilter,
}) {
  const rows = normalizeResults({ results, limit, statusFilter });
  const meta = buildReportMeta({
    proposalTitle,
    total: rows.length,
    limit,
    statusFilter,
  });
  const html = buildExcelHtml({ rows, meta });
  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = getReportLimitFileSuffix(limit);
  const statusSuffix = getReportStatusFileSuffix(statusFilter);
  const fileName = `${slugifyFileName(proposalTitle || "match-report")}-${suffix}-${statusSuffix}.xls`;

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printMatchReportPdf({
  results,
  proposalTitle,
  limit,
  statusFilter,
}) {
  const rows = normalizeResults({ results, limit, statusFilter });
  const meta = buildReportMeta({
    proposalTitle,
    total: rows.length,
    limit,
    statusFilter,
  });
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) return false;

  reportWindow.document.open();
  reportWindow.document.write(buildPrintableHtml({ rows, meta }));
  reportWindow.document.close();

  return true;
}
