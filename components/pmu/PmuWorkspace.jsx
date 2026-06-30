"use client";

import { useState } from "react";
import ProposalMatcher from "@/components/pmu/ProposalMatcher";
import FundingExtractor from "@/components/pmu/FundingExtractor";
import CaptchaGate from "@/components/pmu/CaptchaGate";

const TABS = {
  match: "match",
  funding: "funding",
};

export default function PmuWorkspace() {
  const [activeTab, setActiveTab] = useState(TABS.match);

  return (
    <main className="min-h-screen bg-linear-to-b from-base-200/80 to-base-200 px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M18 8l2 2 4-4" />
              </svg>
            </div> */}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  WU-FundConnect
                </span>
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
                ระบบจับคู่โครงการวิจัยกับแหล่งทุนภายนอก
              </h1>
              <p className="mt-1.5 text-base-content/60 max-w-2xl">
                วิเคราะห์ความเหมาะสมของโครงการ และประกาศแหล่งทุนด้วย
                AI
              </p>
            </div>
          </div>
        </header>
        {/* Captcha */}
        <div className="mb-6">
          <CaptchaGate />
        </div>
        {/* Tabs */}
        <div className="mb-6">
          <div className="relative flex gap-1 rounded-2xl bg-base-200/80 p-1 shadow-inner">
            {/* Active tab indicator */}
            <div
              className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-base-100 shadow-sm transition-all duration-300 ease-out"
              style={{
                transform:
                  activeTab === TABS.match
                    ? "translateX(0)"
                    : "translateX(100%)",
                width: "calc(50% - 4px)",
              }}
            />

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TABS.match}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === TABS.match
                  ? "text-base-content"
                  : "text-base-content/40 hover:text-base-content/70"
              }`}
              onClick={() => setActiveTab(TABS.match)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M18 8l2 2 4-4" />
              </svg>
              วิเคราะห์โครงการ
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TABS.funding}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === TABS.funding
                  ? "text-base-content"
                  : "text-base-content/40 hover:text-base-content/70"
              }`}
              onClick={() => setActiveTab(TABS.funding)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              ฐานข้อมูลแหล่งทุน
            </button>
          </div>

          {/* Tab description */}
          <p className="mt-3 text-center text-xs text-base-content/40">
            {activeTab === TABS.match
              ? "กรอกข้อมูลโครงการเพื่อค้นหาแหล่งทุนที่เหมาะสมที่สุด"
              : "วางประกาศหรืออัปโหลดไฟล์ PDF เพื่อวิเคราะห์ข้อมูลสำคัญของแหล่งทุน PDF เพื่อวิเคราะห์ข้อมูลสำคัญจากแหล่งทุน"}
          </p>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === TABS.match ? (
            <ProposalMatcher />
          ) : (
            <FundingExtractor />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-base-200 pt-6 text-xs text-base-content/30">
          <div className="flex items-center gap-4">
            <span>© 2026 WU-FundConnect System</span>
            <span className="h-3 w-px bg-base-300/30" />
            <span>ใช้ AI ในการวิเคราะห์</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="hover:text-base-content/60 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="9.09" y1="9" x2="9.1" y2="9.01" />
                <line x1="14.09" y1="9" x2="14.1" y2="9.01" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              </svg>
            </button>
            <button className="hover:text-base-content/60 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4v16h16" />
                <polyline points="20 10 12 18 8 14" />
              </svg>
            </button>
            <button className="hover:text-base-content/60 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
