import { useState } from "react";
import PdfUploadField from "@/components/pmu/PdfUploadField";
import FundingResultCard from "@/components/pmu/FundingResultCard";
import { createFunding, extractFunding } from "@/lib/api/pmuClient";
import { MAX_TEXT_CHARS } from "@/lib/constants/pmu";
import { formatFileSize, validatePdf } from "@/lib/utils/file";

export default function FundingExtractor() {
  const [mode, setMode] = useState("text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fundingForm, setFundingForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  function resetResultState() {
    setError("");
    setResult(null);
    setFundingForm(null);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetResultState();

    if (nextMode === "text") {
      setFile(null);
      setFileInputKey((key) => key + 1);
    } else {
      setText("");
    }
  }

  function resetFile() {
    setFile(null);
    setFileInputKey((key) => key + 1);
    resetResultState();
  }

  function handleFileSelect(selectedFile) {
    const validationError = validatePdf(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    resetResultState();
    setFile(selectedFile);
  }

  async function handleSubmit() {
    const content = text.trim().slice(0, MAX_TEXT_CHARS);

    if (mode === "text" && !content) {
      setError("กรุณาวางข้อความประกาศแหล่งทุน");
      return;
    }

    if (mode === "pdf" && !file) {
      setError("กรุณาเลือกไฟล์ PDF");
      return;
    }

    resetResultState();
    setIsExtracting(true);

    try {
      const data = await extractFunding({
        mode,
        url,
        content,
        file,
      });
      setResult(data);

      setFundingForm({
        name: data.data?.name || "",
        requirements: data.data?.requirements || "",
        deadline: data.data?.deadline || "",
        status: data.data?.status || "",
        url: data.data?.url || url.trim(),
      });
    } catch (requestError) {
      setError(requestError.message || "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล");
    } finally {
      setIsExtracting(false);
    }
  }
  async function handleSaveFunding() {
    if (!fundingForm) return;

    setError("");
    setIsSaving(true);

    try {
      await createFunding(fundingForm);

      // ล้างผลสกัดและฟอร์มที่แก้ไข
      setResult(null);
      setFundingForm(null);

      // ล้างข้อมูลต้นทาง
      setUrl("");
      setText("");
      setFile(null);
      setFileInputKey((key) => key + 1);

      // กลับไปโหมดวางข้อความ
      setMode("text");
    } catch (requestError) {
      setError(requestError.message || "ไม่สามารถบันทึกแหล่งทุนได้");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-lg transition-all duration-300">
      {/* Decorative linear */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-secondary to-primary/60" />
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
              ตัวช่วยวิเคราะห์ข้อมูล
            </p>
            <h2 className="mt-0.5 text-2xl font-bold leading-tight text-base-content">
              สรุปประกาศและกรอบโจทย์วิจัยของแหล่งทุน
            </h2>
            <p className="mt-1 text-sm text-base-content/60">
              วางข้อความหรืออัปโหลด PDF เพื่อวิเคราะห์ข้อมูลสำคัญ
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-base-content/70">
            URL อ้างอิง
            <span className="ml-1.5 text-xs font-normal text-base-content/40">
              (ไม่บังคับ)
            </span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/30">
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              type="url"
              className="w-full rounded-xl border border-base-300 bg-base-100/50 pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:border-primary/50 focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.org/funding-announcement"
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mt-6">
          <span className="block text-sm font-medium text-base-content/70">
            รูปแบบข้อมูล
          </span>
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
                ประกาศหรือกรอบโจทย์แหล่งทุน
              </label>
              <div className="relative mt-1.5">
                <textarea
                  className="min-h-52 w-full rounded-xl border border-base-300 bg-base-100/50 p-4 text-sm transition-all duration-200 focus:border-primary/50 focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="วางประกาศหรือกรอบโจทย์แหล่งทุนที่นี่..."
                />
                <div className="absolute bottom-3 right-3 text-xs text-base-content/30">
                  {text.length.toLocaleString()} /{" "}
                  {MAX_TEXT_CHARS.toLocaleString()} ตัวอักษร
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <PdfUploadField
                key={fileInputKey}
                id="funding-pdf"
                label="เลือกไฟล์ PDF ประกาศแหล่งทุน"
                description="รองรับ PDF ที่คัดลอกข้อความได้ ขนาดไม่เกิน 4 MB"
                disabled={isExtracting}
                onFileSelect={handleFileSelect}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="btn btn-primary mt-6 w-full h-12 gap-2 text-base shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
          disabled={isExtracting}
          onClick={handleSubmit}
        >
          {isExtracting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              กำลังวิเคราะห์ข้อมูล...
            </>
          ) : (
            <>
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
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              วิเคราะห์ข้อมูลแหล่งทุน
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-error/5 p-4 border border-error/20 text-error">
            <span className="mt-0.5 shrink-0">
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
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FundingResultCard
              result={result}
              form={fundingForm}
              onChange={setFundingForm}
              onSave={handleSaveFunding}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>
    </section>
  );
}
