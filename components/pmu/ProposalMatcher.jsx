import { useState } from "react";
import PdfUploadField from "@/components/pmu/PdfUploadField";
import MatchResultList from "@/components/pmu/MatchResultList";
import { uploadProposalPdf, matchProposal } from "@/lib/api/pmuClient";
import { MAX_TEXT_CHARS } from "@/lib/constants/pmu";
import { fileNameWithoutExtension, validatePdf } from "@/lib/utils/file";

const initialFileInfo = null;

export default function ProposalMatcher() {
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [fileInfo, setFileInfo] = useState(initialFileInfo);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  function resetResultState() {
    setError("");
    setResults([]);
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

  function resetFile() {
    setText("");
    setFileInfo(initialFileInfo);
    setFileInputKey((key) => key + 1);
    resetResultState();
  }

  async function handlePdfSelect(file) {
    const validationError = validatePdf(file);
    if (validationError) {
      setError(validationError);
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

      setTitle((currentTitle) => currentTitle || fileNameWithoutExtension(resolvedName));
    } catch (requestError) {
      setFileInfo(initialFileInfo);
      setError(requestError.message || "ไม่สามารถอ่านข้อความจาก PDF ได้");
    } finally {
      setIsReadingPdf(false);
    }
  }

  async function handleSubmit() {
    const abstract = text.trim().slice(0, MAX_TEXT_CHARS);

    if (!abstract) {
      setError(
        mode === "pdf"
          ? "กรุณาแนบ PDF และรอให้ระบบอ่านข้อความเสร็จ"
          : "กรุณาวางข้อความ Abstract ก่อน"
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
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (requestError) {
      setError(requestError.message || "เกิดข้อผิดพลาดในการวิเคราะห์");
    } finally {
      setIsMatching(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-lg transition-all duration-300">
      {/* Decorative linear */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-secondary to-primary/60" />
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <path d="M18 8l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
              ตัวช่วยวิเคราะห์
            </p>
            <h2 className="mt-0.5 text-2xl font-bold leading-tight text-base-content">
              จับคู่โครงการกับแหล่งทุน
            </h2>
            <p className="mt-1 text-sm text-base-content/60">
              ระบุรายละเอียดโครงการเพื่อค้นหาแหล่งทุนที่เหมาะสม
            </p>
          </div>
        </div>

        {/* Title Input */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-base-content/70">
            ชื่อโครงการ
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21h16" />
                <path d="M12 17V3" />
                <path d="M8 7l4-4 4 4" />
              </svg>
            </span>
            <input
              type="text"
              className="w-full rounded-xl border border-base-300 bg-base-100/50 pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:border-primary/50 focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="เช่น โครงการพัฒนา AI เพื่อการเกษตร"
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mt-6">
          <span className="block text-sm font-medium text-base-content/70">รูปแบบข้อมูล</span>
          <div className="mt-1.5 flex gap-1.5 rounded-xl bg-base-200/50 p-1">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "text"
                  ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300/50"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-100/50"
              }`}
              onClick={() => changeMode("text")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              วางข้อความ
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "pdf"
                  ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300/50"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-100/50"
              }`}
              onClick={() => changeMode("pdf")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              แนบ PDF
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-6">
          {mode === "text" ? (
            <div>
              <label className="block text-sm font-medium text-base-content/70">
                Abstract / บทคัดย่อ
              </label>
              <div className="relative mt-1.5">
                <textarea
                  className="min-h-52 w-full rounded-xl border border-base-300 bg-base-100/50 p-4 text-sm transition-all duration-200 focus:border-primary/50 focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="วาง Abstract หรือบทคัดย่อโครงการที่นี่..."
                />
                <div className="absolute bottom-3 right-3 text-xs text-base-content/30">
                  {text.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} ตัวอักษร
                </div>
              </div>
              <p className="mt-2 text-xs text-base-content/40">
                ระบบจะใช้ไม่เกิน {MAX_TEXT_CHARS.toLocaleString()} ตัวอักษร
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

              {isReadingPdf && (
                <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4 border border-primary/20">
                  <span className="loading loading-spinner loading-sm text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">กำลังอ่านข้อความจาก PDF...</p>
                    <p className="text-xs text-primary/60">กรุณารอสักครู่</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="btn btn-primary mt-6 w-full h-12 gap-2 text-base shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M18 8l2 2 4-4" />
              </svg>
              วิเคราะห์ความเหมาะสม
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-error/5 p-4 border border-error/20 text-error">
            <span className="mt-0.5 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MatchResultList results={results} proposalTitle={title} />
          </div>
        )}
      </div>
    </section>
  );
}
