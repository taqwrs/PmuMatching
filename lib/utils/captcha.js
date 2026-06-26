import { createHmac } from 'crypto'

const COOKIE_NAME = 'captcha_verified'
const COOKIE_MAX_AGE = 60 * 60 // 1 hour in seconds
const COOKIE_SECRET = process.env.CAPTCHA_COOKIE_SECRET
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY

function parseCookies(request) {
  const header = request.headers.get('cookie') || ''
  return Object.fromEntries(
    header
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...rest] = cookie.split('=')
        return [name, rest.join('=')]
      }),
  )
}

function assertSecret() {
  if (!COOKIE_SECRET) {
    throw new Error('Missing CAPTCHA_COOKIE_SECRET environment variable')
  }
}

function signValue(value) {
  assertSecret()
  return createHmac('sha256', COOKIE_SECRET).update(value).digest('hex')
}

function createCookieValue(expiresAt) {
  return `${expiresAt}.${signValue(String(expiresAt))}`
}

function verifyCookieValue(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return false

  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false

  const [expiresAt, signature] = parts
  if (signValue(expiresAt) !== signature) return false

  const expires = Number(expiresAt)
  if (!Number.isFinite(expires)) return false
  return expires > Date.now()
}

export function isCaptchaVerified(request) {
  try {
    const cookies = parseCookies(request)
    return verifyCookieValue(cookies[COOKIE_NAME])
  } catch {
    return false
  }
}

export function buildCaptchaCookieHeader() {
  const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000
  const cookieValue = createCookieValue(expiresAt)
  const secure = process.env.NODE_ENV === 'production'
  const parts = [`${COOKIE_NAME}=${cookieValue}`, `Path=/`, `Max-Age=${COOKIE_MAX_AGE}`, `SameSite=Lax`, `HttpOnly`]

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

class CaptchaError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export async function verifyRecaptchaToken(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    throw new Error('Missing RECAPTCHA_SECRET_KEY environment variable')
  }

  if (!token || typeof token !== 'string') {
    throw new CaptchaError('กรุณายืนยัน captcha', 400)
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token,
    }),
  })

  if (!response.ok) {
    throw new CaptchaError('ไม่สามารถตรวจสอบ captcha ได้', 502)
  }

  const result = await response.json()

  if (!result.success) {
    throw new CaptchaError('การยืนยัน captcha ล้มเหลว', 403)
  }

  return true
}

export function ensureCaptchaVerified(request) {
  if (!isCaptchaVerified(request)) {
    throw new CaptchaError('กรุณายืนยัน captcha ก่อนใช้งาน', 403)
  }
}

export class CaptchaErrorClass extends CaptchaError {}
