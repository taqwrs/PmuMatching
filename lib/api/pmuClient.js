import { API_ROUTES } from "@/lib/constants/pmu";
import { readJsonResponse } from "@/lib/utils/http";

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await readJsonResponse(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || "ไม่สามารถดำเนินการได้");
  }

  return data;
}

export function uploadProposalPdf(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  return request(API_ROUTES.proposalUpload, {
    method: "POST",
    body: formData,
  });
}

export function matchProposal({ abstract, proposalTitle }) {
  return request(API_ROUTES.match, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abstract, proposalTitle }),
  });
}

export function extractFunding({ mode, url, content, file }) {
  const formData = new FormData();

  if (url?.trim()) formData.append("url", url.trim());
  if (mode === "pdf") formData.append("file", file, file.name);
  else formData.append("content", content);

  return request(API_ROUTES.fundingExtract, {
    method: "POST",
    body: formData,
  });
}

export function createFunding(payload) {
  return request(API_ROUTES.fundingSources, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}