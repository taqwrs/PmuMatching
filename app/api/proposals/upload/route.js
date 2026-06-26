import { extractText, getDocumentProxy } from 'unpdf'
import { ensureCaptchaVerified, CaptchaErrorClass } from '@/lib/utils/captcha'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 12000

class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function errorResponse(error, status = 400) {
  return Response.json(
    {
      success: false,
      error,
    },
    { status }
  )
}

function cleanText(value, maxLength = MAX_TEXT_CHARS) {
  if (typeof value !== 'string') return ''

  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

async function getPdfBuffer(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new AppError('กรุณาแนบไฟล์ PDF', 400)
  }

  if (!file.size) {
    throw new AppError('ไม่สามารถอ่านไฟล์ได้', 422)
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new AppError('ไฟล์มีขนาดใหญ่เกิน 10 MB', 413)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ตรวจว่าเป็น PDF จริง ไม่ดูแค่นามสกุลไฟล์
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new AppError(
      'ไฟล์ที่อัปโหลดไม่ใช่ PDF ที่ถูกต้อง',
      415
    )
  }

  return buffer
}

async function extractPdfText(buffer) {
  let pdf

  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer))

    const { text, totalPages } = await extractText(pdf, {
      mergePages: true,
    })

    return {
      text,
      totalPages,
    }
  } catch (err) {
    console.error('PDF PARSE ERROR:', err?.name, err?.message)

    if (err?.name === 'PasswordException') {
      throw new AppError(
        'PDF ถูกล็อกหรือต้องใช้รหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนอัปโหลด',
        422
      )
    }

    if (
      err?.name === 'InvalidPDFException' ||
      err?.name === 'FormatError' ||
      err?.name === 'MissingPDFException'
    ) {
      throw new AppError(
        'PDF เสียหรือรูปแบบไม่ถูกต้อง กรุณาบันทึกหรือส่งออกเป็น PDF ใหม่',
        422
      )
    }

    throw new AppError(
      'ไม่สามารถอ่านข้อความจาก PDF นี้ได้ กรุณาลองใช้ไฟล์อื่น',
      422
    )
  } finally {
    try {
      await pdf?.destroy()
    } catch (err) {
      console.warn('PDF DESTROY WARNING:', err?.message)
    }
  }
}

export async function POST(request) {
  try {
    ensureCaptchaVerified(request)
    const formData = await request.formData()
    const file = formData.get('file')

    const buffer = await getPdfBuffer(file)
    const extracted = await extractPdfText(buffer)
    const text = cleanText(extracted.text)

    if (!text || text.length < 20) {
      return errorResponse(
        'PDF นี้อาจเป็นไฟล์สแกนที่ไม่มีข้อความ กรุณาใช้ PDF ที่เลือกและคัดลอกข้อความได้ หรือทำ OCR ก่อน',
        422
      )
    }

    return Response.json({
      success: true,
      fileName: file.name,
      totalPages: extracted.totalPages,
      text,
    })
  } catch (err) {
    console.error('PDF UPLOAD ERROR:', err?.message)

    if (err instanceof CaptchaErrorClass) {
      return errorResponse(err.message, err.status)
    }

    if (err instanceof AppError) {
      return errorResponse(err.message, err.status)
    }

    return errorResponse(
      'เกิดข้อผิดพลาดในการอ่าน PDF',
      500
    )
  }
}