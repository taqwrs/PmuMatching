"use client"

import { useEffect, useRef, useState } from 'react'

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
const CAPTCHA_STATUS_URL = '/api/captcha/status'
const CAPTCHA_VERIFY_URL = '/api/captcha/verify'

function loadRecaptchaScript(onLoad) {
  if (typeof window === 'undefined') return

  if (window.grecaptcha) {
    onLoad()
    return
  }

  const existing = document.querySelector('script[src*="recaptcha/api.js"]')
  if (existing) {
    existing.addEventListener('load', onLoad)
    return
  }

  const script = document.createElement('script')
  script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
  script.async = true
  script.defer = true
  script.onload = onLoad
  document.body.appendChild(script)
}

export default function CaptchaGate() {
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [widgetRendered, setWidgetRendered] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(CAPTCHA_STATUS_URL, { cache: 'no-store' })
        const data = await response.json()
        if (response.ok && data.verified) {
          setVerified(true)
        }
      } catch (err) {
        console.error('Captcha status error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  useEffect(() => {
    if (verified || widgetRendered) return
    if (!RECAPTCHA_SITE_KEY) {
      setError('กรุณาตั้งค่า NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน environment')
      return
    }

    loadRecaptchaScript(() => {
      if (!window.grecaptcha || widgetRendered) return

      try {
        window.grecaptcha.ready(() => {
          if (!containerRef.current) return

          window.grecaptcha.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: async (token) => {
              try {
                setError('')
                const verifyResponse = await fetch(CAPTCHA_VERIFY_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token }),
                })
                const data = await verifyResponse.json()
                if (verifyResponse.ok && data.success) {
                  setVerified(true)
                } else {
                  setError(data.error || 'ไม่สามารถยืนยัน captcha ได้')
                  window.grecaptcha.reset()
                }
              } catch (err) {
                console.error('Captcha verify failed:', err)
                setError('เกิดข้อผิดพลาดในการยืนยัน captcha')
                window.grecaptcha.reset()
              }
            },
            'error-callback': () => {
              setError('เกิดข้อผิดพลาดขณะโหลด captcha กรุณาลองใหม่')
            },
            'expired-callback': () => {
              setError('captcha หมดเวลาหรือไม่สมบูรณ์ กรุณาทำใหม่')
            },
          })
          setWidgetRendered(true)
        })
      } catch (err) {
        console.error('grecaptcha render error:', err)
        setError('ไม่สามารถโหลด captcha ได้')
      }
    })
  }, [verified, widgetRendered])

  if (loading || verified) {
    return null
  }

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-base-200 bg-base-100 p-8 text-center shadow-2xl shadow-black/25">
        <h2 className="text-xl font-bold text-base-content">ยืนยันว่าไม่ใช่บ็อต</h2>
        <p className="mt-3 text-sm text-base-content/70">
          เพื่อให้สามารถใช้งานระบบได้เต็มที่ กรุณายืนยัน captcha ครั้งแรกเมื่อเข้าหน้าเว็บ
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <div ref={containerRef} />
          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>
        <p className="mt-6 text-xs text-base-content/50">
          ระบบจะจำสถานะไว้ 1 ชั่วโมง หลังจากยืนยันสำเร็จ
        </p>
      </div>
    </div>
  )
}
