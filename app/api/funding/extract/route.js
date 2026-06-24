import Groq from 'groq-sdk'
import { supabase } from '@/lib/supabase'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(request) {
  try {
    const { url, name, content, fileBase64, fileType } = await request.json()

    if (!content && !url && !fileBase64) {
      return Response.json({ success: false, error: 'กรุณาใส่ข้อมูล' })
    }

    let plainText = ''

    // กรณีแนบไฟล์
    if (fileBase64) {
      if (fileType === 'application/pdf') {
        // ส่ง PDF ให้ Groq อ่านตรงๆ ไม่ได้ ต้องถอด text ก่อน
        // ใช้วิธีส่ง base64 เป็น text แล้วบอก model ว่าเป็น PDF content
        const buffer = Buffer.from(fileBase64, 'base64')
        plainText = buffer.toString('utf-8').replace(/[^\x20-\x7E\u0E00-\u0E7F\n]/g, ' ').slice(0, 8000)
      } else {
        // TXT file
        const buffer = Buffer.from(fileBase64, 'base64')
        plainText = buffer.toString('utf-8').slice(0, 8000)
      }
    }

    // กรณีวาง text
    if (!plainText && content) {
      plainText = content.slice(0, 8000)
    }

    // กรณีใส่แค่ URL
    if (!plainText && url) {
      const encodedUrl = encodeURI(url)
      const fetchRes = await fetch(encodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      const buffer = await fetchRes.arrayBuffer()
      const contentType = fetchRes.headers.get('content-type') || ''
      let html = ''
      if (contentType.includes('utf-8') || contentType.includes('UTF-8')) {
        html = new TextDecoder('utf-8').decode(buffer)
      } else {
        html = new TextDecoder('tis-620').decode(buffer)
      }
      plainText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `สกัดข้อมูลแหล่งทุนวิจัยจากข้อความด้านล่าง
ตอบเป็น JSON เท่านั้น มีฟิลด์ดังนี้
- name: ชื่อแหล่งทุนหรือโครงการ
- requirements: กรอบโจทย์และคุณสมบัติผู้สมัคร สรุปเป็นภาษาไทย
- deadline: วันปิดรับสมัคร รูปแบบ YYYY-MM-DD ถ้าไม่มีให้ใส่ null
- status: "open" ถ้าเปิดรับ, "closed" ถ้าปิดแล้ว, "upcoming" ถ้ายังไม่เปิด

ข้อความ:
${plainText}`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const extracted = JSON.parse(completion.choices[0].message.content)

    const { data, error } = await supabase
      .from('funding_sources')
      .insert({
        name: name || extracted.name,
        url: url || null,
        requirements: extracted.requirements,
        deadline: extracted.deadline,
        status: extracted.status || 'open'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message })
    }

    return Response.json({ success: true, data })

  } catch (err) {
    console.error('ERROR:', err.message)
    return Response.json({ success: false, error: err.message })
  }
}