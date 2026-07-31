const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

function toGeminiContents(messages) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }],
    }));
}

function getSystemInstruction(messages) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean)
    .join("\n\n");

  return systemText ? { parts: [{ text: systemText }] } : undefined;
}

function parseGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

export async function generateGeminiJson({
  messages,
  maxOutputTokens = 2000,
  timeoutMs = 60000,
}) {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: getSystemInstruction(messages),
        contents: toGeminiContents(messages),
        generationConfig: {
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini API error: ${response.status}`);
    }

    const content = parseGeminiText(data);
    if (!content) {
      throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");
    }

    return {
      content,
      usage: data?.usageMetadata
        ? {
            prompt_tokens: data.usageMetadata.promptTokenCount || 0,
            completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
          }
        : null,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("AI ใช้เวลานานเกินกำหนด");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
