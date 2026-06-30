import { getSupabase } from '@/lib/supabase'
import { ensureCaptchaVerified, CaptchaErrorClass } from '@/lib/utils/captcha'
import {
  getBangkokDate,
  getEffectiveFundingStatus,
  normalizeFundingStatus,
} from '@/lib/utils/fundingStatus'

function cleanText(value, maxLength = 5000) {
  if (typeof value !== 'string') return ''

  return value
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength)
}

function isValidIsoDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function normalizeUrl(value) {
  const url = cleanText(value, 2000)

  if (!url) return null

  try {
    const parsed = new URL(url)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    ensureCaptchaVerified(request)
    const body = await request.json()

    const name = cleanText(body.name, 500)
    const requirements = cleanText(body.requirements, 5000)
    const deadline = body.deadline || null
    const today = getBangkokDate()
    const status = getEffectiveFundingStatus(
      normalizeFundingStatus(body.status),
      deadline,
      today,
    )
    const url = normalizeUrl(body.url)

    if (!name) {
      return Response.json(
        { success: false, error: 'กรุณาระบุชื่อแหล่งทุน' },
        { status: 400 }
      )
    }

    if (deadline && !isValidIsoDate(deadline)) {
      return Response.json(
        { success: false, error: 'รูปแบบวันปิดรับไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('funding_sources')
      .insert({
        name,
        url,
        requirements: requirements || null,
        deadline,
        status,
      })
      .select()
      .single()

    if (error) {
      console.error('CREATE FUNDING ERROR:', error.message)

      return Response.json(
        { success: false, error: 'ไม่สามารถบันทึกแหล่งทุนได้' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('CREATE FUNDING ERROR:', error)

    if (error instanceof CaptchaErrorClass) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }

    return Response.json(
      { success: false, error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' },
      { status: 400 }
    )
  }
}
