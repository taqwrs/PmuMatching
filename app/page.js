"use client";

import { useState, useRef } from "react";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;
const TOP_N = 5;

function getScoreColor(score) {
  if (score >= 70) return "#0F6E56";
  if (score >= 40) return "#854F0B";
  return "#A32D2D";
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

async function readResponse(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return { success: false, error: "เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง" }; }
}

const Icon = {
  Target: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Funding: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  ),
  Upload: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Text: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Reset: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
    </svg>
  ),
  Link: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f4; color: #1a1a18; }

  .app { min-height: 100svh; padding-bottom: 80px; }
  @media (min-width: 768px) { .app { padding-bottom: 0; padding-top: 0; } }

  /* ─── Header ─── */
  .header { padding: 1.75rem 1.25rem 1rem; max-width: 1200px; margin: 0 auto; }
  @media (min-width: 768px) { .header { padding: 2.5rem 2rem 1.5rem; } }
  @media (min-width: 1280px) { .header { padding: 2.5rem 3rem 1.5rem; } }

  .badge { display: inline-flex; align-items: center; gap: 5px; background: #EEEDFE; color: #3C3489; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.02em; }
  .header h1 { margin-top: 10px; font-size: clamp(18px, 2.5vw, 26px); font-weight: 600; color: #1a1a18; line-height: 1.3; }
  .header p { margin-top: 5px; font-size: 14px; color: #5f5e5a; line-height: 1.6; }

  /* ─── Desktop nav ─── */
  .nav-desktop { display: none; }
  @media (min-width: 768px) {
    .nav-desktop { display: flex; gap: 4px; max-width: 1200px; margin: 0 auto 1.5rem; padding: 0 2rem; }
    .nav-desktop button { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 9px 20px; border-radius: 10px; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
    .nav-desktop button.active { background: #1a1a18; color: #f8f7f4; }
    .nav-desktop button:not(.active) { background: #fff; color: #5f5e5a; border: 0.5px solid #e0dfd8; }
    .nav-desktop button:not(.active):hover { background: #f0efea; }
  }
  @media (min-width: 1280px) { .nav-desktop { padding: 0 3rem; } }

  /* ─── Mobile bottom nav ─── */
  .nav-mobile { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 0.5px solid #e0dfd8; display: flex; z-index: 50; padding-bottom: env(safe-area-inset-bottom); }
  @media (min-width: 768px) { .nav-mobile { display: none; } }
  .nav-mobile button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px 8px; border: none; background: transparent; cursor: pointer; font-size: 11px; font-weight: 500; color: #888780; transition: color 0.15s; }
  .nav-mobile button.active { color: #534AB7; }
  .nav-mobile button .nav-icon { width: 44px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 20px; transition: background 0.15s; }
  .nav-mobile button.active .nav-icon { background: #EEEDFE; }

  /* ─── Content wrapper ─── */
  .content { max-width: 1200px; margin: 0 auto; padding: 0 1.25rem; }
  @media (min-width: 768px) { .content { padding: 0 2rem; } }
  @media (min-width: 1280px) { .content { padding: 0 3rem; } }

  /* ─── Two-column split on large screens ─── */
  .match-layout { display: flex; flex-direction: column; gap: 1.25rem; }
  @media (min-width: 1024px) {
    .match-layout { flex-direction: row; align-items: flex-start; gap: 1.5rem; }
    .match-input-col { flex: 0 0 420px; position: sticky; top: 1.5rem; }
    .match-results-col { flex: 1; min-width: 0; }
  }
  @media (min-width: 1280px) {
    .match-input-col { flex: 0 0 460px; }
  }

  /* ─── Card ─── */
  .card { background: #fff; border: 0.5px solid #e0dfd8; border-radius: 16px; padding: 1.25rem; }
  @media (min-width: 768px) { .card { padding: 1.75rem; } }

  .section-label { font-size: 11px; font-weight: 600; color: #534AB7; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }

  /* ─── Fields ─── */
  .field { margin-bottom: 1.25rem; }
  .field label { display: block; font-size: 13px; font-weight: 500; color: #444441; margin-bottom: 6px; }

  input[type="text"], textarea {
    width: 100%; padding: 10px 14px; border: 0.5px solid #d3d1c7; border-radius: 10px;
    font-size: 14px; color: #1a1a18; background: #faf9f7; outline: none;
    transition: border-color 0.15s, background 0.15s; font-family: inherit; resize: vertical;
  }
  input[type="text"]:focus, textarea:focus { border-color: #534AB7; background: #fff; box-shadow: 0 0 0 3px rgba(83,74,183,0.08); }
  input::placeholder, textarea::placeholder { color: #b4b2a9; }

  .mode-toggle { display: flex; gap: 6px; margin-bottom: 16px; }
  .mode-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 0.5px solid #d3d1c7; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; background: #fff; color: #5f5e5a; }
  .mode-btn.active { background: #1a1a18; color: #fff; border-color: #1a1a18; }
  .mode-btn:not(.active):hover { background: #f0efea; }

  .drop-zone { border: 1.5px dashed #d3d1c7; border-radius: 12px; padding: 2rem 1.25rem; text-align: center; background: #faf9f7; transition: border-color 0.15s; }
  .drop-zone:hover { border-color: #534AB7; }
  .drop-zone-icon { width: 44px; height: 44px; border-radius: 50%; background: #EEEDFE; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #534AB7; }
  .drop-zone p { font-size: 13px; color: #444441; font-weight: 500; }
  .drop-zone span { font-size: 12px; color: #888780; margin-top: 4px; display: block; }

  input[type="file"] { margin-top: 12px; width: 100%; font-size: 13px; color: #5f5e5a; }
  input[type="file"]::file-selector-button { padding: 7px 14px; background: #EEEDFE; color: #3C3489; border: none; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; margin-right: 12px; }
  input[type="file"]::file-selector-button:hover { background: #CECBF6; }

  .file-status { margin-top: 12px; background: #fff; border: 0.5px solid #d3d1c7; border-radius: 10px; padding: 12px 14px; }
  .file-status .status-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .file-status .status-name { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #0F6E56; min-width: 0; }
  .file-status .status-name span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-status .status-meta { font-size: 12px; color: #888780; margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; }
  .reset-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 6px; border: 0.5px solid #d3d1c7; background: #fff; font-size: 12px; color: #5f5e5a; cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
  .reset-btn:hover { background: #f0efea; border-color: #b4b2a9; }

  .submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px 20px; background: #1a1a18; color: #f8f7f4; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; margin-top: 1.25rem; font-family: inherit; }
  .submit-btn:hover:not(:disabled) { background: #2c2c2a; }
  .submit-btn:disabled { background: #d3d1c7; color: #888780; cursor: not-allowed; }

  .error-box { display: flex; align-items: flex-start; gap: 8px; background: #FCEBEB; border: 0.5px solid #F7C1C1; border-radius: 10px; padding: 12px 14px; margin-top: 14px; font-size: 13px; color: #791F1F; }

  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  .spinner-indigo { border-color: rgba(83,74,183,0.2); border-top-color: #534AB7; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider { height: 0.5px; background: #e0dfd8; margin: 1.5rem 0; }

  /* ─── Results ─── */
  .results-header { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; }
  .results-header h3 { font-size: 15px; font-weight: 600; }
  .count-badge { background: #EAF3DE; color: #3B6D11; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
  .hidden-badge { background: #f0efea; color: #888780; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }

  .result-item { border: 0.5px solid #e0dfd8; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 10px; background: #fff; transition: border-color 0.15s; }
  .result-item:hover { border-color: #AFA9EC; }
  .result-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .result-rank { width: 24px; height: 24px; border-radius: 50%; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .result-name { font-size: 14px; font-weight: 600; color: #1a1a18; flex: 1; line-height: 1.4; }
  .result-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: #534AB7; margin-top: 6px; text-decoration: none; }
  .result-link:hover { color: #3C3489; }
  .score-block { text-align: right; flex-shrink: 0; }
  .score-num { font-size: 26px; font-weight: 700; line-height: 1; }
  .score-label { font-size: 11px; color: #888780; margin-top: 2px; }

  .reason-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 0.5px solid #f0efea; }
  .reason-box { border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.6; }
  .reason-match { background: #E1F5EE; color: #085041; }
  .reason-mismatch { background: #FCEBEB; color: #711B13; }
  .reason-label { font-weight: 600; display: block; margin-bottom: 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.65; }

  .show-more-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; border: 0.5px dashed #d3d1c7; border-radius: 10px; background: transparent; font-size: 13px; color: #5f5e5a; cursor: pointer; margin-top: 4px; transition: all 0.15s; font-family: inherit; }
  .show-more-btn:hover { background: #f0efea; border-color: #b4b2a9; }

  /* ─── Funding result ─── */
  .funding-result { border: 0.5px solid #e0dfd8; border-radius: 12px; overflow: hidden; margin-top: 1rem; }
  .funding-result-header { background: #f8f7f4; padding: 1rem 1.25rem; border-bottom: 0.5px solid #e0dfd8; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .funding-result-name { font-size: 16px; font-weight: 600; color: #1a1a18; }
  .done-badge { background: #EAF3DE; color: #27500A; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
  .funding-result-body { padding: 1rem 1.25rem; }
  .info-row { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; padding: 8px 0; border-bottom: 0.5px solid #f0efea; }
  .info-row:last-child { border-bottom: none; }
  .info-key { color: #888780; font-weight: 500; min-width: 80px; flex-shrink: 0; display: flex; align-items: center; gap: 5px; }
  .info-val { color: #1a1a18; line-height: 1.6; }
`;

export default function Home() {
  const [tab, setTab] = useState("match");

  const [proposalMode, setProposalMode] = useState("text");
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [proposalFileName, setProposalFileName] = useState("");
  const [proposalPages, setProposalPages] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchResults, setMatchResults] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const proposalFileRef = useRef(null);

  const [fundingMode, setFundingMode] = useState("text");
  const [fundingUrl, setFundingUrl] = useState("");
  const [fundingText, setFundingText] = useState("");
  const [fundingFile, setFundingFile] = useState(null);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState("");
  const [fundingResult, setFundingResult] = useState(null);
  const fundingFileRef = useRef(null);

  function resetProposal() {
    setProposalText(""); setProposalFileName(""); setProposalPages(null);
    setProposalTitle(""); setMatchError(""); setMatchResults([]); setShowAll(false);
    if (proposalFileRef.current) proposalFileRef.current.value = "";
  }

  function resetFunding() {
    setFundingFile(null); setFundingText(""); setFundingError(""); setFundingResult(null);
    if (fundingFileRef.current) fundingFileRef.current.value = "";
  }

  async function handleProposalPdf(file) {
    setMatchError(""); setMatchResults([]); setShowAll(false);
    setProposalText(""); setProposalFileName(""); setProposalPages(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setMatchError("รองรับเฉพาะไฟล์ PDF"); return; }
    if (file.size > MAX_PDF_BYTES) { setMatchError("ไฟล์ PDF ต้องมีขนาดไม่เกิน 4 MB"); return; }
    setProposalLoading(true);
    setProposalFileName(`กำลังอ่านข้อความจาก ${file.name}`);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const response = await fetch("/api/proposals/upload", { method: "POST", body: formData });
      const data = await readResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || "ไม่สามารถอ่านข้อความจาก PDF ได้");
      setProposalText(data.text || "");
      const resolvedName = data.fileName || file.name;
      setProposalFileName(resolvedName);
      setProposalPages(data.totalPages || null);
      const nameWithoutExt = resolvedName.replace(/\.pdf$/i, "").trim();
      if (nameWithoutExt) setProposalTitle(nameWithoutExt);
    } catch (error) {
      setProposalFileName("");
      setMatchError(error.message || "ไม่สามารถอ่านข้อความจาก PDF ได้");
    } finally { setProposalLoading(false); }
  }

  async function handleMatch() {
    setMatchError(""); setMatchResults([]); setShowAll(false);
    const abstract = proposalText.trim().slice(0, MAX_TEXT_CHARS);
    if (!abstract) {
      setMatchError(proposalMode === "pdf" ? "กรุณาแนบ PDF และรอให้ระบบอ่านข้อความเสร็จ" : "กรุณาวางข้อความ Abstract ก่อน");
      return;
    }
    setMatchLoading(true);
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract, proposalTitle: proposalTitle.trim() }),
      });
      const data = await readResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || "ไม่สามารถวิเคราะห์ได้");
      setMatchResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      setMatchError(error.message || "เกิดข้อผิดพลาดในการวิเคราะห์");
    } finally { setMatchLoading(false); }
  }

  function handleFundingFile(file) {
    setFundingError(""); setFundingResult(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setFundingError("รองรับเฉพาะไฟล์ PDF"); return; }
    if (file.size > MAX_PDF_BYTES) { setFundingError("ไฟล์ PDF ต้องมีขนาดไม่เกิน 4 MB"); return; }
    setFundingFile(file);
  }

  async function handleFundingExtract() {
    setFundingError(""); setFundingResult(null);
    const text = fundingText.trim().slice(0, MAX_TEXT_CHARS);
    if (fundingMode === "text" && !text) { setFundingError("กรุณาวางข้อความประกาศแหล่งทุน"); return; }
    if (fundingMode === "pdf" && !fundingFile) { setFundingError("กรุณาเลือกไฟล์ PDF"); return; }
    setFundingLoading(true);
    try {
      const formData = new FormData();
      if (fundingUrl.trim()) formData.append("url", fundingUrl.trim());
      if (fundingMode === "pdf") formData.append("file", fundingFile, fundingFile.name);
      else formData.append("content", text);
      const response = await fetch("/api/funding/extract", { method: "POST", body: formData });
      const data = await readResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || "ไม่สามารถสกัดข้อมูลแหล่งทุนได้");
      setFundingResult(data);
    } catch (error) {
      setFundingError(error.message || "เกิดข้อผิดพลาดในการสกัดข้อมูลแหล่งทุน");
    } finally { setFundingLoading(false); }
  }

  const visibleResults = showAll ? matchResults : matchResults.slice(0, TOP_N);
  const hiddenCount = matchResults.length - TOP_N;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <span className="badge"><Icon.Sparkle /> PMU Matching</span>
          <h1>ระบบจับคู่โครงการกับแหล่งทุน</h1>
          <p>วิเคราะห์ความเหมาะสมของโครงการและสกัดข้อมูลประกาศแหล่งทุนด้วย AI</p>
        </div>

        <nav className="nav-desktop">
          <button type="button" className={tab === "match" ? "active" : ""} onClick={() => setTab("match")}>
            <Icon.Target /> วิเคราะห์โครงการ
          </button>
          <button type="button" className={tab === "funding" ? "active" : ""} onClick={() => setTab("funding")}>
            <Icon.Funding /> สกัดข้อมูลแหล่งทุน
          </button>
        </nav>

        <div className="content">

          {/* ── Match tab ── */}
          {tab === "match" && (
            <div className="match-layout">

              {/* Input column */}
              <div className="match-input-col">
                <div className="card">
                  <div className="section-label">วิเคราะห์ความเหมาะสม</div>

                  <div className="field">
                    <label>ชื่อโครงการ</label>
                    <input type="text" value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)}
                      placeholder="เช่น โครงการพัฒนา AI เพื่อการเกษตร" />
                  </div>

                  <div className="field">
                    <label>รูปแบบข้อมูล</label>
                    <div className="mode-toggle">
                      <button type="button" className={`mode-btn ${proposalMode === "text" ? "active" : ""}`}
                        onClick={() => { setProposalMode("text"); resetProposal(); }}>
                        <Icon.Text /> วางข้อความ
                      </button>
                      <button type="button" className={`mode-btn ${proposalMode === "pdf" ? "active" : ""}`}
                        onClick={() => { setProposalMode("pdf"); setProposalText(""); setMatchError(""); setMatchResults([]); setShowAll(false); }}>
                        <Icon.Upload /> แนบ PDF
                      </button>
                    </div>

                    {proposalMode === "text" ? (
                      <textarea value={proposalText} onChange={(e) => setProposalText(e.target.value)}
                        placeholder="วาง Abstract หรือบทคัดย่อโครงการที่นี่..." rows={8} />
                    ) : (
                      <div className="drop-zone">
                        <div className="drop-zone-icon"><Icon.Upload /></div>
                        <p>เลือกไฟล์ PDF โครงการ</p>
                        <span>รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB</span>
                        <input ref={proposalFileRef} type="file" accept=".pdf,application/pdf"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProposalPdf(f); }} />
                        {proposalLoading && (
                          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "#534AB7" }}>
                            <span className="spinner spinner-indigo" /> กำลังอ่านข้อความ...
                          </div>
                        )}
                        {proposalFileName && !proposalLoading && (
                          <div className="file-status">
                            <div className="status-row">
                              <span className="status-name"><Icon.Check /><span>{proposalFileName}</span></span>
                              <button type="button" className="reset-btn" onClick={resetProposal}><Icon.Reset /> เริ่มใหม่</button>
                            </div>
                            <div className="status-meta">
                              {proposalPages && <span>{proposalPages} หน้า</span>}
                              {proposalText && <span>{proposalText.length.toLocaleString()} ตัวอักษร</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="button" className="submit-btn" disabled={matchLoading || proposalLoading} onClick={handleMatch}>
                    {matchLoading ? <><span className="spinner" /> กำลังวิเคราะห์...</> : <><Icon.Sparkle /> วิเคราะห์ความเหมาะสม</>}
                  </button>

                  {matchError && <div className="error-box"><Icon.Alert /><span>{matchError}</span></div>}
                </div>
              </div>

              {/* Results column */}
              {matchResults.length > 0 && (
                <div className="match-results-col">
                  <div className="card">
                    <div className="results-header">
                      <h3>ผลการจับคู่ Top {Math.min(TOP_N, matchResults.length)}</h3>
                      <span className="count-badge">{Math.min(TOP_N, matchResults.length)} จาก {matchResults.length}</span>
                      {!showAll && hiddenCount > 0 && (
                        <span className="hidden-badge">+{hiddenCount} รายการ</span>
                      )}
                    </div>

                    {visibleResults.map((item, index) => {
                      const score = Math.round(Number(item.score) || 0);
                      const canOpenUrl = isSafeHttpUrl(item.url);
                      return (
                        <div key={`${item.funding_name}-${index}`} className="result-item">
                          <div className="result-top">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span className="result-rank">{index + 1}</span>
                                <span className="result-name">{item.funding_name}</span>
                              </div>
                              {canOpenUrl && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="result-link" style={{ marginLeft: 32 }}>
                                  <Icon.Link /> ดูรายละเอียด
                                </a>
                              )}
                            </div>
                            <div className="score-block">
                              <div className="score-num" style={{ color: getScoreColor(score) }}>{score}%</div>
                              <div className="score-label">ความเหมาะสม</div>
                            </div>
                          </div>
                          <div className="reason-grid">
                            <div className="reason-box reason-match">
                              <span className="reason-label">เหมาะสม</span>
                              {item.reason_match || "-"}
                            </div>
                            <div className="reason-box reason-mismatch">
                              <span className="reason-label">ข้อจำกัด</span>
                              {item.reason_mismatch || "-"}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!showAll && hiddenCount > 0 && (
                      <button type="button" className="show-more-btn" onClick={() => setShowAll(true)}>
                        <Icon.ChevronDown /> แสดงอีก {hiddenCount} แหล่งทุน
                      </button>
                    )}
                    {showAll && matchResults.length > TOP_N && (
                      <button type="button" className="show-more-btn" onClick={() => setShowAll(false)}>
                        แสดงน้อยลง
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Funding tab ── */}
          {tab === "funding" && (
            <div style={{ maxWidth: 680 }}>
              <div className="card">
                <div className="section-label">สกัดข้อมูลแหล่งทุน</div>

                <div className="field">
                  <label>URL อ้างอิง <span style={{ color: "#b4b2a9", fontWeight: 400 }}>(ไม่บังคับ)</span></label>
                  <input type="text" value={fundingUrl} onChange={(e) => setFundingUrl(e.target.value)}
                    placeholder="https://example.org/funding" />
                </div>

                <div className="field">
                  <label>รูปแบบข้อมูล</label>
                  <div className="mode-toggle">
                    <button type="button" className={`mode-btn ${fundingMode === "text" ? "active" : ""}`}
                      onClick={() => { setFundingMode("text"); setFundingFile(null); setFundingError(""); }}>
                      <Icon.Text /> วางข้อความ
                    </button>
                    <button type="button" className={`mode-btn ${fundingMode === "pdf" ? "active" : ""}`}
                      onClick={() => { setFundingMode("pdf"); setFundingText(""); setFundingError(""); }}>
                      <Icon.Upload /> แนบ PDF
                    </button>
                  </div>

                  {fundingMode === "text" ? (
                    <textarea value={fundingText} onChange={(e) => setFundingText(e.target.value)}
                      placeholder="วางประกาศหรือกรอบโจทย์แหล่งทุนที่นี่..." rows={8} />
                  ) : (
                    <div className="drop-zone">
                      <div className="drop-zone-icon"><Icon.Upload /></div>
                      <p>เลือกไฟล์ PDF ประกาศแหล่งทุน</p>
                      <span>รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB</span>
                      <input ref={fundingFileRef} type="file" accept=".pdf,application/pdf"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFundingFile(f); }} />
                      {fundingFile && (
                        <div className="file-status">
                          <div className="status-row">
                            <span className="status-name"><Icon.Check /><span>{fundingFile.name}</span></span>
                            <button type="button" className="reset-btn" onClick={resetFunding}><Icon.Reset /> เริ่มใหม่</button>
                          </div>
                          <div className="status-meta"><span>{(fundingFile.size / 1024).toFixed(0)} KB</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button type="button" className="submit-btn" disabled={fundingLoading} onClick={handleFundingExtract}>
                  {fundingLoading ? <><span className="spinner" /> กำลังสกัดข้อมูล...</> : <><Icon.Sparkle /> สกัดข้อมูลแหล่งทุน</>}
                </button>

                {fundingError && <div className="error-box"><Icon.Alert /><span>{fundingError}</span></div>}

                {fundingResult?.data && (
                  <div className="funding-result">
                    <div className="funding-result-header">
                      <div>
                        <div style={{ fontSize: 11, color: "#534AB7", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>ผลการสกัดข้อมูล</div>
                        <div className="funding-result-name">{fundingResult.data.name}</div>
                      </div>
                      <span className="done-badge">เสร็จสิ้น</span>
                    </div>
                    <div className="funding-result-body">
                      <div className="info-row">
                        <span className="info-key">สถานะ</span>
                        <span className="info-val">{fundingResult.data.status || "-"}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key"><Icon.Calendar /> วันปิดรับ</span>
                        <span className="info-val">{fundingResult.data.deadline || "ไม่ระบุ"}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">กรอบโจทย์</span>
                        <span className="info-val">{fundingResult.data.requirements || "-"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <nav className="nav-mobile" role="navigation">
          <button type="button" className={tab === "match" ? "active" : ""} onClick={() => setTab("match")}>
            <span className="nav-icon"><Icon.Target /></span>
            วิเคราะห์โครงการ
          </button>
          <button type="button" className={tab === "funding" ? "active" : ""} onClick={() => setTab("funding")}>
            <span className="nav-icon"><Icon.Funding /></span>
            สกัดแหล่งทุน
          </button>
        </nav>
      </div>
    </>
  );
}