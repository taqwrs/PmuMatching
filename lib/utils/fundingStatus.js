const ALLOWED_FUNDING_STATUS = ["open", "closed", "upcoming"];

export function getBangkokDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const getPart = (type) => parts.find((part) => part.type === type)?.value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

export function normalizeFundingStatus(value) {
  if (typeof value !== "string") return null;

  const status = value.trim().toLowerCase();

  return ALLOWED_FUNDING_STATUS.includes(status) ? status : null;
}

export function getEffectiveFundingStatus(status, deadline, today = getBangkokDate()) {
  const normalizedStatus = normalizeFundingStatus(status);

  if (typeof deadline === "string" && deadline < today) {
    return "closed";
  }

  return normalizedStatus;
}
