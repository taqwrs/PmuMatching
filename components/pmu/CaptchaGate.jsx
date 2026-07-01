"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppAlert } from "@/components/pmu/AppAlerts";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const CAPTCHA_STATUS_URL = "/api/captcha/status";
const CAPTCHA_VERIFY_URL = "/api/captcha/verify";

function loadRecaptchaScript(onLoad) {
  if (typeof window === "undefined") return;

  if (window.grecaptcha?.render) {
    onLoad();
    return;
  }

  const existingScript = document.querySelector(
    'script[src*="recaptcha/api.js"]',
  );

  if (existingScript) {
    if (
      window.grecaptcha?.render ||
      existingScript.getAttribute("data-loaded") === "true" ||
      existingScript.readyState === "complete"
    ) {
      onLoad();
      return;
    }

    existingScript.addEventListener("load", onLoad, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    script.setAttribute("data-loaded", "true");
    onLoad();
  };

  document.body.appendChild(script);
}

export default function CaptchaGate() {
  const { showAlert } = useAppAlert();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [widgetRendered, setWidgetRendered] = useState(false);

  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const isRenderingRef = useRef(false);
  const reportedConfigErrorRef = useRef(false);

  function resetCaptcha() {
    if (
      typeof window !== "undefined" &&
      window.grecaptcha &&
      widgetIdRef.current !== null
    ) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }

  const showCaptchaError = useCallback((message) => {
    setError(message);
    showAlert(message, { type: "error" });
  }, [showAlert]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(CAPTCHA_STATUS_URL, {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data.verified) {
          setVerified(true);
        }
      } catch (requestError) {
        console.error("Captcha status error:", requestError);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  useEffect(() => {
    if (loading || verified || widgetRendered) return;
    if (isRenderingRef.current) return;

    if (!RECAPTCHA_SITE_KEY) {
      if (!reportedConfigErrorRef.current) {
        reportedConfigErrorRef.current = true;
        window.setTimeout(() => {
          showAlert("ไม่พบการตั้งค่า reCAPTCHA กรุณาตรวจสอบ environment variables", { type: "error" });
        }, 0);
      }
      return;
    }

    loadRecaptchaScript(() => {
      if (!containerRef.current) return;
      if (!window.grecaptcha) return;
      if (isRenderingRef.current) return;

      const renderWidget = () => {
        if (!containerRef.current) return;
        if (!window.grecaptcha?.render) return;
        if (isRenderingRef.current) return;

        try {
          isRenderingRef.current = true;

          widgetIdRef.current = window.grecaptcha.render(
            containerRef.current,
            {
              sitekey: RECAPTCHA_SITE_KEY,

              callback: async (token) => {
                try {
                  setError("");

                  const response = await fetch(CAPTCHA_VERIFY_URL, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                  });

                  const data = await response.json();

                  if (response.ok && data.success) {
                    setVerified(true);
                    showAlert("ยืนยัน reCAPTCHA สำเร็จ", { type: "success" });
                    return;
                  }

                  showCaptchaError(
                    data.error || "ไม่สามารถยืนยัน reCAPTCHA ได้",
                  );

                  resetCaptcha();
                } catch (requestError) {
                  console.error(
                    "Captcha verification error:",
                    requestError,
                  );

                  showCaptchaError("เกิดข้อผิดพลาดในการยืนยัน reCAPTCHA");
                  resetCaptcha();
                }
              },

              "error-callback": () => {
                showCaptchaError(
                  "ไม่สามารถโหลด reCAPTCHA ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
                );
              },

              "expired-callback": () => {
                showCaptchaError(
                  "การยืนยันหมดอายุ กรุณาทำเครื่องหมายใหม่อีกครั้ง",
                );

                resetCaptcha();
              },
            },
          );

          setWidgetRendered(true);
        } catch (renderError) {
          console.error("reCAPTCHA render error:", renderError);

          isRenderingRef.current = false;
          showCaptchaError("ไม่สามารถแสดง reCAPTCHA ได้");
        }
      };

      if (window.grecaptcha.ready) {
        window.grecaptcha.ready(renderWidget);
      } else {
        renderWidget();
      }
    });
  }, [loading, showAlert, showCaptchaError, verified, widgetRendered]);

  if (loading || verified) {
    return null;
  }

  const configError = !RECAPTCHA_SITE_KEY
    ? "ไม่พบการตั้งค่า reCAPTCHA กรุณาตรวจสอบ environment variables"
    : "";
  const displayError = error || configError;

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-base-300 bg-base-100 p-7 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold text-base-content">
          ยืนยันการเข้าใช้งานระบบ
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-base-content/65">
          กรุณายืนยันว่าเป็นผู้ใช้งานจริงก่อนใช้ระบบวิเคราะห์โครงการและวิเคราะห์ข้อมูล
        </p>

        <div className="mt-7 flex flex-col items-center gap-4">
          <div ref={containerRef} />

          {displayError && (
            <div className="alert alert-error w-full text-left text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>

              <span>{displayError}</span>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-base-content/45">
          ระบบจะจดจำการยืนยันไว้เป็นเวลา 1 วัน
        </p>
      </div>
    </div>
  );
}
