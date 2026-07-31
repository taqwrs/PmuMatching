import { useState } from "react";
import PdfUploadField from "@/components/pmu/PdfUploadField";
import FundingResultCard from "@/components/pmu/FundingResultCard";
import { useAppAlert } from "@/components/pmu/AppAlerts";
import { createFunding, extractFunding } from "@/lib/api/pmuClient";
import { MAX_TEXT_CHARS } from "@/lib/constants/pmu";
import { validatePdf } from "@/lib/utils/file";

export default function FundingExtractor() {
  const { showAlert } = useAppAlert();
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

  function showActionError(message) {
    setError(message);
    showAlert(message, { type: "error" });
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
    setText("");
    setFileInputKey((key) => key + 1);
    resetResultState();
  }

  function handleFileSelect(selectedFile) {
    setFile(null);
    setText("");
    resetResultState();

    const validationError = validatePdf(selectedFile);
    if (validationError) {
      showActionError(validationError);
      return;
    }

    setFile(selectedFile);
    showAlert("เลือกไฟล์ PDF แล้ว", { type: "info" });
  }

  async function handleSubmit() {
    const content = text.trim().slice(0, MAX_TEXT_CHARS);

    if (mode === "text" && !content) {
      showActionError("กรุณาวางข้อความประกาศแหล่งทุน");
      return;
    }

    if (mode === "pdf" && !file) {
      showActionError("กรุณาเลือกไฟล์ PDF");
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
      showAlert("วิเคราะห์ข้อมูลแหล่งทุนสำเร็จ", { type: "success" });
    } catch (requestError) {
      showActionError(requestError.message || "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล");
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
      showAlert("บันทึกแหล่งทุนสำเร็จ", { type: "success" });
    } catch (requestError) {
      showActionError(requestError.message || "ไม่สามารถบันทึกแหล่งทุนได้");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-7 lg:p-8">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
              ตัวช่วยวิเคราะห์ข้อมูล
            </p>
            <h2 className="mt-0.5 text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl">
              สรุปประกาศและกรอบโจทย์วิจัยของแหล่งทุน
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              วางข้อความหรืออัปโหลด PDF เพื่อวิเคราะห์ข้อมูลสำคัญ
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className="mt-7">
          <label className="mb-2 block text-sm font-bold text-slate-800">
            URL อ้างอิง
            <span className="ml-1.5 text-xs font-medium text-slate-400">
              (ไม่บังคับ)
            </span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
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
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-inner shadow-slate-100/70 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.org/funding-announcement"
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mt-6">
          <span className="mb-2 block text-sm font-bold text-slate-800">
            รูปแบบข้อมูล
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
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
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
              <label className="mb-2 block text-sm font-bold text-slate-800">
                ประกาศหรือกรอบโจทย์แหล่งทุน
              </label>
              <div className="relative">
                <textarea
                  className="min-h-44 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 pb-10 text-sm leading-6 text-slate-800 shadow-inner shadow-slate-100/70 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:min-h-52"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="วางประกาศหรือกรอบโจทย์แหล่งทุนที่นี่..."
                />
                <div className="absolute bottom-3 right-4 text-xs text-slate-400">
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
                onFileClear={resetFile}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#4d39e8] via-[#7739f4] to-[#ff2e93] px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:text-base"
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
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
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
