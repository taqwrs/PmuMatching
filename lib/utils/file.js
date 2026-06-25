import { MAX_PDF_BYTES } from "@/lib/constants/pmu";

export function validatePdf(file) {
  if (!file) return "กรุณาเลือกไฟล์ PDF";

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) return "รองรับเฉพาะไฟล์ PDF";
  if (file.size > MAX_PDF_BYTES) return "ไฟล์ PDF ต้องมีขนาดไม่เกิน 4 MB";

  return "";
}

export function formatFileSize(bytes) {
  return `${Math.round(bytes / 1024).toLocaleString()} KB`;
}

export function fileNameWithoutExtension(fileName = "") {
  return fileName.replace(/\.pdf$/i, "").trim();
}
