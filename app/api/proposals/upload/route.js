import pdf from 'pdf-parse/lib/pdf-parse.js'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 12000

function cleanText(value, maxLength = MAX_TEXT_CHARS) {
  if (typeof value !== 'string') return ''
  return value.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export async function POST(request) {
  try {
    const { fileBase64, fileType, title } = await request.json()

    if (!fileBase64) {
      return Response.json({ success: false, error: 'กรุณาแนบไฟล์' }, { status: 400 })
    }

    if (fileType !== 'application/pdf') {
      return Response.json({ success: false, error: 'รองรับเฉพาะไฟล์ PDF' }, { status: 415 })
    }

    const raw = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64
    const buffer = Buffer.from(raw, 'base64')

    if (!buffer.length) {
      return Response.json({ success: false, error: 'ไม่สามารถอ่านไฟล์ได้' }, { status: 422 })
    }

    if (buffer.length > MAX_PDF_BYTES) {
      return Response.json({ success: false, error: 'ไฟล์มีขนาดใหญ่เกิน 10 MB' }, { status: 413 })
    }

    let extracted
    try {
      extracted = await pdf(buffer)
    } catch {
      return Response.json({ success: false, error: 'ไม่สามารถอ่าน PDF ได้ กรุณาตรวจสอบว่าไฟล์ไม่ได้ถูกล็อก' }, { status: 422 })
    }

    const text = cleanText(extracted.text)

    if (!text || text.length < 20) {
      return Response.json({
        success: false,
        error: 'PDF นี้อาจเป็นไฟล์ scan ที่ไม่มีข้อความ กรุณาวาง text แทน'
      }, { status: 422 })
    }

    // บันทึกลง Supabase ถ้ามีชื่อโครงการ
    if (title) {
      const cleanTitle = cleanText(title, 500)
      const { data, error } = await supabase
        .from('proposals')
        .insert({ title: cleanTitle, content_text: text })
        .select()
        .single()

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, text, proposal_id: data.id })
    }

    return Response.json({ success: true, text })

  } catch (err) {
    console.error('PDF UPLOAD ERROR:', err.message)
    return Response.json({ success: false, error: 'เกิดข้อผิดพลาดในการอ่าน PDF' }, { status: 500 })
  }
}