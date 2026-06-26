import { buildCaptchaCookieHeader, verifyRecaptchaToken, CaptchaErrorClass } from '@/lib/utils/captcha'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const token = body?.token

    await verifyRecaptchaToken(token)

    const setCookie = buildCaptchaCookieHeader()

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookie,
      },
    })
  } catch (error) {
    console.error('CAPTCHA VERIFY ERROR:', error?.message)

    if (error instanceof CaptchaErrorClass) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false, error: 'เกิดข้อผิดพลาดในการยืนยัน captcha' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
