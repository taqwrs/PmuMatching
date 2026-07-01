import { API_ROUTES } from "@/lib/constants/pmu";
import { readJsonResponse } from "@/lib/utils/http";

const FUNDING_SOURCES_CACHE_KEY = "pmu:funding-sources:v1";

function getBangkokDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function readFundingSourcesCache() {
  if (typeof window === "undefined") return null;

  try {
    const cachedValue = window.localStorage.getItem(FUNDING_SOURCES_CACHE_KEY);
    if (!cachedValue) return null;

    const cached = JSON.parse(cachedValue);
    if (cached?.date !== getBangkokDateKey() || !cached?.data?.success) {
      window.localStorage.removeItem(FUNDING_SOURCES_CACHE_KEY);
      return null;
    }

    return cached.data;
  } catch {
    window.localStorage.removeItem(FUNDING_SOURCES_CACHE_KEY);
    return null;
  }
}

function writeFundingSourcesCache(data) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FUNDING_SOURCES_CACHE_KEY,
      JSON.stringify({
        date: data.today || getBangkokDateKey(),
        data,
      }),
    );
  } catch {
    window.localStorage.removeItem(FUNDING_SOURCES_CACHE_KEY);
  }
}

function clearFundingSourcesCache() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(FUNDING_SOURCES_CACHE_KEY);
  } catch {
    // Ignore storage failures. The next GET can still refresh from the API.
  }
}

async function request(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
  });
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

export function listFundingSources({ forceRefresh = false } = {}) {
  const cachedData = forceRefresh ? null : readFundingSourcesCache();
  if (cachedData) return Promise.resolve(cachedData);

  return request(API_ROUTES.fundingSources, {
    method: "GET",
  }).then((data) => {
    writeFundingSourcesCache(data);
    return data;
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
  }).then((data) => {
    clearFundingSourcesCache();
    return data;
  });
}
