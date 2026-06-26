import { isCaptchaVerified } from '@/lib/utils/captcha'

export async function GET(request) {
  return new Response(JSON.stringify({ success: true, verified: isCaptchaVerified(request) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
