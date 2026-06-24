import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { url, name } = await request.json();

    if (!url) {
      return Response.json({ success: false, error: "กรุณาใส่ URL" });
    }

    // ดึง HTML จาก URL
    const fetchRes = await fetch(url);
    const html = await fetchRes.text();

    // ตัด HTML tag ออกให้เหลือแต่ text
    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    // ส่งให้ Gemini สกัดข้อมูล
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
จากข้อความด้านล่างนี้เป็นข้อมูลแหล่งทุนวิจัย
สกัดข้อมูลออกมาเป็น JSON โดยมีฟิลด์ดังนี้

- name: ชื่อแหล่งทุนหรือโครงการ
- requirements: กรอบโจทย์และคุณสมบัติผู้สมัคร สรุปให้กระชับ
- deadline: วันปิดรับสมัคร รูปแบบ YYYY-MM-DD ถ้าไม่มีให้ใส่ null
- status: "open" ถ้ายังเปิดรับ "closed" ถ้าปิดแล้ว "upcoming" ถ้ายังไม่เปิด

ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น

ข้อความ:
${plainText}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // แปลง JSON
    const clean = text.replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(clean);

    // บันทึกลง Supabase
    const { data, error } = await supabase
      .from("funding_sources")
      .insert({
        name: name || extracted.name,
        url: url,
        requirements: extracted.requirements,
        deadline: extracted.deadline,
        status: extracted.status || "open",
      })
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message });
    }

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
