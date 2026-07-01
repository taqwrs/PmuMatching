import { useEffect, useRef, useState } from "react";
import FundingSourcesPanel from "@/components/pmu/FundingSourcesPanel";
import PdfUploadField from "@/components/pmu/PdfUploadField";
import MatchResultList from "@/components/pmu/MatchResultList";
import { useAppAlert } from "@/components/pmu/AppAlerts";
import {
  listFundingSources,
  matchProposal,
  uploadProposalPdf,
} from "@/lib/api/pmuClient";
import { MAX_TEXT_CHARS } from "@/lib/constants/pmu";
import { fileNameWithoutExtension, validatePdf } from "@/lib/utils/file";

const initialFileInfo = null;

function SparkleIcon({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.5 2 11 8l5.5 1.5L11 11 9.5 17 8 11 2.5 9.5 8 8z" />
      <path d="M19 14 20 17l3 1-3 1-1 3-1-3-3-1 3-1z" />
    </svg>
  );
}

function FormIcon() {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#4c39e8] to-[#b95cff] text-white shadow-lg shadow-violet-500/30">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15h6" />
        <path d="M9 18h4" />
      </svg>
    </div>
  );
}

export default function ProposalMatcher() {
  const { showAlert } = useAppAlert();
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [fileInfo, setFileInfo] = useState(initialFileInfo);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [fundingSources, setFundingSources] = useState([]);
  const [isLoadingFundingSources, setIsLoadingFundingSources] = useState(true);
  const [fundingSourcesError, setFundingSourcesError] = useState("");
  const isMountedRef = useRef(false);
  const hasResults = results.length > 0;

  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;

    async function loadFundingSources() {
      setIsLoadingFundingSources(true);
      setFundingSourcesError("");

      try {
        const data = await listFundingSources();
        const sources = Array.isArray(data.data) ? data.data : [];

        if (isActive) {
          setFundingSources(sources);
        }
      } catch (requestError) {
        if (isActive) {
          setFundingSourcesError(
            requestError.message || "ไม่สามารถโหลดรายการแหล่งทุนได้",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingFundingSources(false);
        }
      }
    }

    loadFundingSources();

    return () => {
      isActive = false;
      isMountedRef.current = false;
    };
  }, []);

  async function refreshFundingSources() {
    setIsLoadingFundingSources(true);
    setFundingSourcesError("");

    try {
      const data = await listFundingSources({ forceRefresh: true });
      const sources = Array.isArray(data.data) ? data.data : [];

      if (!isMountedRef.current) return;

      setFundingSources(sources);
      showAlert("อัปเดตข้อมูลแหล่งทุนแล้ว", { type: "success" });
    } catch (requestError) {
      if (!isMountedRef.current) return;

      const message =
        requestError.message || "ไม่สามารถโหลดรายการแหล่งทุนได้";

      setFundingSourcesError(message);
      showAlert(message, { type: "error" });
    } finally {
      if (isMountedRef.current) {
        setIsLoadingFundingSources(false);
      }
    }
  }

  function resetResultState() {
    setError("");
    setResults([]);
  }

  function showActionError(message) {
    setError(message);
    showAlert(message, { type: "error" });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetResultState();

    if (nextMode === "text") {
      setFileInfo(initialFileInfo);
      setFileInputKey((key) => key + 1);
    } else {
      setText("");
    }
  }

  async function handlePdfSelect(file) {
    const validationError = validatePdf(file);
    if (validationError) {
      showActionError(validationError);
      return;
    }

    resetResultState();
    setText("");
    setFileInfo({ name: file.name, pages: null, chars: null, pending: true });
    setIsReadingPdf(true);

    try {
      const data = await uploadProposalPdf(file);
      const resolvedName = data.fileName || file.name;
      const extractedText = data.text || "";

      setText(extractedText);
      setFileInfo({
        name: resolvedName,
        pages: data.totalPages || null,
        chars: extractedText.length,
        pending: false,
      });

      setTitle(
        (currentTitle) => currentTitle || fileNameWithoutExtension(resolvedName),
      );
      showAlert("อ่านไฟล์ PDF สำเร็จ", { type: "success" });
    } catch (requestError) {
      setFileInfo(initialFileInfo);
      showActionError(
        requestError.message || "ไม่สามารถอ่านข้อความจาก PDF ได้",
      );
    } finally {
      setIsReadingPdf(false);
    }
  }

  async function handleSubmit() {
    const abstract = text.trim().slice(0, MAX_TEXT_CHARS);

    if (!abstract) {
      showActionError(
        mode === "pdf"
          ? "กรุณาแนบ PDF และรอให้ระบบอ่านข้อความเสร็จ"
          : "กรุณาวางข้อความ Abstract ก่อน",
      );
      return;
    }

    resetResultState();
    setIsMatching(true);

    try {
      const data = await matchProposal({
        abstract,
        proposalTitle: title.trim(),
      });
      const nextResults = Array.isArray(data.results) ? data.results : [];
      setResults(nextResults);
      showAlert(
        nextResults.length
          ? `วิเคราะห์สำเร็จ พบผลลัพธ์ ${nextResults.length} รายการ`
          : "วิเคราะห์สำเร็จ แต่ยังไม่พบแหล่งทุนที่ตรงกัน",
        { type: nextResults.length ? "success" : "warning" },
      );
    } catch (requestError) {
      showActionError(
        requestError.message || "เกิดข้อผิดพลาดในการวิเคราะห์",
      );
    } finally {
      setIsMatching(false);
    }
  }

  return (
    <section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_32rem]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <div
            className={`min-w-0 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-7 lg:p-8 ${
              hasResults ? "" : "flex-1"
            }`}
          >
          <div className="flex items-start gap-3 sm:gap-4">
            <FormIcon />
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl">
                ข้อมูลโครงการของคุณ
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                กรอกข้อมูลให้ครบถ้วน เพื่อให้ AI วิเคราะห์ได้แม่นยำยิ่งขึ้น
              </p>
            </div>
          </div>

          <div className="mt-7">
            <label
              className="mb-2 block text-sm font-bold text-slate-800"
              htmlFor="proposal-title"
            >
              ชื่อโครงการ
            </label>
            <div className="relative">
              <input
                id="proposal-title"
                type="text"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-800 shadow-inner shadow-slate-100/70 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                value={title}
                maxLength={150}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เช่น โครงการพัฒนา AI เพื่อการเกษตรอัจฉริยะ"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {title.length} / 150
              </span>
            </div>
          </div>

          <div className="mt-6">
            <span className="mb-2 block text-sm font-bold text-slate-800">
              รูปแบบการป้อนข้อมูล
            </span>
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition sm:gap-2 sm:text-sm ${
                  mode === "text"
                    ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-400"
                    : "text-slate-500 hover:bg-white hover:text-slate-800"
                }`}
                onClick={() => changeMode("text")}
              >
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
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
                วางข้อความ
              </button>
              <button
                type="button"
                className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition sm:gap-2 sm:text-sm ${
                  mode === "pdf"
                    ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-400"
                    : "text-slate-500 hover:bg-white hover:text-slate-800"
                }`}
                onClick={() => changeMode("pdf")}
              >
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M12 18v-6" />
                  <path d="M9 15h6" />
                </svg>
                แนบ PDF
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              วางข้อความรายละเอียดโครงการหรือบทคัดย่อของคุณ
            </p>
          </div>

          <div className="mt-6">
            {mode === "text" ? (
              <div>
                <label
                  className="mb-2 block text-sm font-bold text-slate-800"
                  htmlFor="proposal-abstract"
                >
                  Abstract / บทคัดย่อ
                </label>
                <div className="relative">
                  <textarea
                    id="proposal-abstract"
                    className="min-h-44 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 pb-10 text-sm leading-6 text-slate-800 shadow-inner shadow-slate-100/70 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:min-h-52"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="วาง Abstract หรือบทคัดย่อโครงการที่นี่..."
                  />
                  <span className="absolute bottom-3 right-4 text-xs text-slate-400">
                    {text.length.toLocaleString()} /{" "}
                    {MAX_TEXT_CHARS.toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-5 text-violet-500 sm:text-sm">
                  <SparkleIcon className="h-4 w-4" />
                  แนะนำความยาวประมาณ 500 - 2,000 คำ เพื่อผลลัพธ์ที่ดีที่สุด
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <PdfUploadField
                  key={fileInputKey}
                  id="proposal-pdf"
                  label="เลือกไฟล์ PDF โครงการ"
                  description="รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB"
                  disabled={isReadingPdf || isMatching}
                  onFileSelect={handlePdfSelect}
                />

                {fileInfo && !fileInfo.pending && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                    อ่านไฟล์ {fileInfo.name} แล้ว
                    {fileInfo.chars
                      ? ` (${fileInfo.chars.toLocaleString()} ตัวอักษร)`
                      : ""}
                  </div>
                )}

                {isReadingPdf && (
                  <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <span className="loading loading-spinner loading-sm text-violet-700" />
                    <div>
                      <p className="text-sm font-bold text-violet-700">
                        กำลังอ่านข้อความจาก PDF...
                      </p>
                      <p className="text-xs text-violet-500">
                        กรุณารอสักครู่
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#4d39e8] via-[#7739f4] to-[#ff2e93] px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:text-base"
            disabled={isReadingPdf || isMatching}
            onClick={handleSubmit}
          >
            {isMatching ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                กำลังวิเคราะห์...
              </>
            ) : (
              <>
                <SparkleIcon />
                วิเคราะห์ความเหมาะสม
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
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
                className="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          )}
          </div>

          {hasResults && (
            <div className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-6">
              <MatchResultList results={results} proposalTitle={title} />
            </div>
          )}
        </div>

        <FundingSourcesPanel
          key={hasResults ? "results-visible" : "results-empty"}
          fundingSources={fundingSources}
          isLoading={isLoadingFundingSources}
          error={fundingSourcesError}
          collapseOnMobile={hasResults}
          onRefresh={refreshFundingSources}
        />
      </div>
    </section>
  );
}
