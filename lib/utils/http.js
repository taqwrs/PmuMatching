export async function readJsonResponse(response) {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      success: false,
      error: "เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง",
    };
  }
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
