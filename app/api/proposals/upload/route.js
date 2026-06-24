import { InvalidPDFException, PasswordException, PDFParse } from 'pdf-parse'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 12000

let pdfWorkerReady = false

class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function errorResponse(error, status = 400) {
  return Response.json({ success: false, error }, { status })
}

function cleanText(value, maxLength = MAX_TEXT_CHARS) {
  if (typeof value !== 'string') return ''
  return value.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function ensurePdfWorker() {
  if (pdfWorkerReady) return

  const workerPath = join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'esm', 'pdf.worker.mjs')
  PDFParse.setWorker(pathToFileURL(workerPath).href)
  pdfWorkerReady = true
}

function decodePdfBase64(fileBase64) {
  const raw = String(fileBase64).includes(',') ? String(fileBase64).split(',').pop() : String(fileBase64)
  const normalized = raw.replace(/\s/g, '')

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new AppError('ข้อมูลไฟล์ PDF ไม่ถูกต้อง กรุณาเลือกไฟล์ใหม่อีกครั้ง', 422)
  }

  const buffer = Buffer.from(normalized, 'base64')

  if (!buffer.length) {
    throw new AppError('ไม่สามารถอ่านไฟล์ได้', 422)
  }

  if (buffer.length > MAX_PDF_BYTES) {
    throw new AppError('ไฟล์มีขนาดใหญ่เกิน 10 MB', 413)
  }

  if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new AppError('ไฟล์ที่อัปโหลดไม่ใช่ PDF ที่ถูกต้อง', 415)
  }

  return buffer
}

async function extractPdfText(buffer) {
  let parser
  try {
    ensurePdfWorker()
    parser = new PDFParse({ data: buffer })
    return await parser.getText()
  } catch (err) {
    console.error('PDF PARSE ERROR:', err?.name, err?.message)

    if (err instanceof PasswordException || err?.name === 'PasswordException') {
      throw new AppError('PDF ถูกล็อกหรือต้องใช้รหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนอัปโหลด', 422)
    }

    if (err instanceof InvalidPDFException || err?.name === 'InvalidPDFException') {
      throw new AppError('PDF เสียหรือรูปแบบไม่ถูกต้อง กรุณาลองบันทึก/ส่งออกเป็น PDF ใหม่', 422)
    }

    throw new AppError('ไม่สามารถอ่าน PDF นี้ได้ กรุณาลองบันทึกเป็น PDF ใหม่หรือใช้ไฟล์อื่น', 422)
  } finally {
    try {
      await parser?.destroy()
    } catch (err) {
      console.warn('PDF PARSER DESTROY WARNING:', err?.message)
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { fileBase64, fileType, title } = body

    if (!fileBase64) {
      return Response.json({ success: false, error: 'กรุณาแนบไฟล์' }, { status: 400 })
    }

    if (fileType !== 'application/pdf') {
      return Response.json({ success: false, error: 'รองรับเฉพาะไฟล์ PDF' }, { status: 415 })
    }

    const buffer = decodePdfBase64(fileBase64)
    const extracted = await extractPdfText(buffer)

    const text = cleanText(extracted.text)

    if (!text || text.length < 20) {
      return Response.json({
        success: false,
        error: 'PDF นี้อาจเป็นไฟล์ scan ที่ไม่มีข้อความ กรุณาวาง text แทน'
      }, { status: 422 })
    }

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
    if (err instanceof AppError) {
      return errorResponse(err.message, err.status)
    }
    return Response.json({ success: false, error: 'เกิดข้อผิดพลาดในการอ่าน PDF' }, { status: 500 })
  }
}
