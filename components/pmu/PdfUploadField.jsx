import { useRef, useState } from "react";

export default function PdfUploadField({
  id,
  label,
  description,
  disabled,
  onFileSelect,
  onFileClear,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleReset = () => {
    setFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileClear?.();
  };

  return (
    <div className="w-full">
      {/* Label */}
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-800"
      >
        {label}
        {/* <span className="ml-1.5 text-xs font-normal text-slate-400">
          (ไม่บังคับ)
        </span> */}
      </label>

      {/* Drop zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition ${
          isDragging
            ? "border-violet-400 bg-violet-50 shadow-lg shadow-violet-100"
            : fileName
              ? "border-violet-200 bg-violet-50/70 hover:border-violet-300"
              : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={disabled ? undefined : handleClick}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
      >
        {/* Hidden input */}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".pdf,application/pdf"
          disabled={disabled}
          className="hidden"
          onChange={handleFileChange}
        />

        {!fileName ? (
          // Empty state
          <div className="flex flex-col items-center gap-3 p-5 sm:p-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-violet-600 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800">
                {isDragging
                  ? "วางไฟล์ที่นี่"
                  : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {description || "รองรับไฟล์ PDF ขนาดไม่เกิน 4 MB"}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-800 sm:w-auto"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              เลือกไฟล์ PDF
            </button>
          </div>
        ) : (
          // File selected state
          <div className="flex flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-4" />
                <path d="M12 10h.01" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-800">
                {fileName}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">พร้อมใช้งาน</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <button
                type="button"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-violet-700 sm:flex-none"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                เปลี่ยน
              </button>
              <button
                type="button"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-red-600 sm:flex-none"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                ลบ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supported formats hint */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
        <span className="inline-flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          รองรับ PDF
        </span>
        <span className="h-3 w-px bg-slate-200" />
        <span className="inline-flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          ขนาดสูงสุด 4 MB
        </span>
        <span className="h-3 w-px bg-slate-200" />
        <span className="inline-flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          ปลอดภัย 100%
        </span>
      </div>
    </div>
  );
}
