"use client";

import { useSyncExternalStore } from "react";
import ProposalMatcher from "@/components/pmu/ProposalMatcher";
import FundingExtractor from "@/components/pmu/FundingExtractor";
import CaptchaGate from "@/components/pmu/CaptchaGate";
import { AppAlertProvider } from "@/components/pmu/AppAlerts";

const TABS = {
  match: "match",
  funding: "funding",
};

const ACTIVE_TAB_STORAGE_KEY = "pmu-workspace-active-tab";
const ACTIVE_TAB_CHANGE_EVENT = "pmu-workspace-active-tab-change";

function isValidTab(value) {
  return Object.values(TABS).includes(value);
}

function getStoredActiveTab() {
  if (typeof window === "undefined") return TABS.match;

  try {
    const storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return isValidTab(storedTab) ? storedTab : TABS.match;
  } catch {
    return TABS.match;
  }
}

function subscribeActiveTab(callback) {
  if (typeof window === "undefined") return () => {};

  function handleStorage(event) {
    if (event.key === ACTIVE_TAB_STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACTIVE_TAB_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACTIVE_TAB_CHANGE_EVENT, callback);
  };
}

function saveActiveTab(nextTab) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, nextTab);
  } catch {
    // Ignore storage failures; the current click still updates this tab.
  }

  window.dispatchEvent(new Event(ACTIVE_TAB_CHANGE_EVENT));
}

function BrandMark() {
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div className="absolute left-1 top-1 h-9 w-3 rotate-[-22deg] rounded-full bg-[#6d4dff] shadow-lg shadow-[#6d4dff]/25" />
      <div className="absolute left-4 top-1 h-9 w-3 rotate-[-22deg] rounded-full bg-[#9a5cff] shadow-lg shadow-[#9a5cff]/20" />
      <div className="absolute left-7 top-1 h-9 w-3 rotate-[-22deg] rounded-full bg-[#4338ca] shadow-lg shadow-[#4338ca]/20" />
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[43%] overflow-hidden lg:block">
      <div className="absolute right-16 top-0 h-full w-full rounded-bl-[6rem] bg-linear-to-br from-violet-100/20 via-violet-200/60 to-white" />
      <svg
        className="absolute right-8 top-4 h-56 w-136 text-violet-300"
        viewBox="0 0 560 230"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M16 154C87 87 156 140 229 92C302 45 357 12 443 43C491 60 522 96 548 135"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.36"
        />
        <path
          d="M28 177C120 132 168 196 266 137C360 80 440 73 537 124"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.24"
        />
        <circle cx="168" cy="96" r="18" stroke="currentColor" strokeWidth="5" />
        <circle cx="333" cy="38" r="28" stroke="currentColor" strokeWidth="2" opacity="0.28" />
        <circle cx="497" cy="128" r="36" stroke="currentColor" strokeWidth="2" opacity="0.22" />
      </svg>

      <div className="absolute right-24 top-12 flex h-40 w-40 items-center justify-center rounded-full bg-white/70 shadow-2xl shadow-violet-200/80 ring-1 ring-violet-100">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-18 border-violet-400/80 bg-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600">
            <div className="h-4 w-4 rounded-full bg-white" />
          </div>
        </div>
      </div>
      <div className="absolute right-20 top-12 h-28 w-3 rotate-45 rounded-full bg-pink-500 shadow-lg shadow-pink-400/30" />
      <div className="absolute right-[6.2rem] top-[4.6rem] h-7 w-7 rotate-45 rounded-sm bg-pink-500" />
      <div className="absolute right-88 top-14 h-3 w-3 rounded-full bg-pink-500" />
      <div className="absolute right-92 top-12 h-2 w-2 rounded-full bg-pink-400" />
    </div>
  );
}

export default function PmuWorkspace() {
  const activeTab = useSyncExternalStore(
    subscribeActiveTab,
    getStoredActiveTab,
    () => TABS.match,
  );

  function handleTabChange(nextTab) {
    if (!isValidTab(nextTab)) return;

    saveActiveTab(nextTab);
  }

  return (
    <AppAlertProvider>
      <main className="min-h-screen overflow-x-hidden bg-[#f7f8ff] text-slate-950">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-3 py-3 shadow-sm shadow-violet-900/5 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark />
              <span className="truncate text-lg font-bold text-[#4639d8] sm:text-2xl">
                WU-FundConnect
              </span>
            </div>

            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">
              Research and Innovation Institute of Excellence
            </span>
          </div>
        </header>

        <section className="relative border-b border-violet-100/70 bg-linear-to-br from-white via-[#fbf9ff] to-[#f0edff] px-3 pb-6 pt-7 sm:px-6 sm:pb-7 sm:pt-9 lg:pb-9">
          <HeroVisual />
          <div className="relative mx-auto max-w-[1800px]">
            <div className="max-w-5xl">
              <h1 className="text-xl font-bold leading-tight tracking-normal text-slate-950 sm:text-3xl lg:text-4xl">
                ระบบจับคู่โครงการวิจัยกับแหล่งทุนภายนอก
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-lg sm:leading-7">
                วิเคราะห์ความเหมาะสมของโครงการและประกาศแหล่งทุนด้วย{" "}
                <span className="font-semibold text-violet-700">AI</span>
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1800px] px-3 pb-4 sm:px-6">
          <div className="-mt-5">
            <CaptchaGate />
          </div>

          <section className="min-w-0 rounded-t-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-violet-950/5 backdrop-blur">
            <div className="grid grid-cols-2 border-b border-slate-200">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === TABS.match}
                className={`relative flex min-w-0 items-center justify-center gap-1.5 px-2 py-4 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:py-5 sm:text-base ${
                  activeTab === TABS.match
                    ? "text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
                onClick={() => handleTabChange(TABS.match)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9.5 2 11 8l5.5 1.5L11 11 9.5 17 8 11 2.5 9.5 8 8z" />
                  <path d="M19 14 20 17l3 1-3 1-1 3-1-3-3-1 3-1z" />
                </svg>
                วิเคราะห์โครงการ
                {activeTab === TABS.match && (
                  <span className="absolute inset-x-6 bottom-0 h-1 rounded-t-full bg-violet-700 sm:inset-x-14" />
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === TABS.funding}
                className={`relative flex min-w-0 items-center justify-center gap-1.5 px-2 py-4 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:py-5 sm:text-base ${
                  activeTab === TABS.funding
                    ? "text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
                onClick={() => handleTabChange(TABS.funding)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                </svg>
                ฐานข้อมูลแหล่งทุน
                {activeTab === TABS.funding && (
                  <span className="absolute inset-x-6 bottom-0 h-1 rounded-t-full bg-violet-700 sm:inset-x-14" />
                )}
              </button>
            </div>

            <div className="min-w-0 bg-[#fbfbff] p-3 sm:p-6 lg:p-7">
              {activeTab === TABS.match ? (
                <ProposalMatcher />
              ) : (
                <FundingExtractor />
              )}
            </div>
          </section>

          <footer className="flex flex-col gap-3 px-1 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            {/* <span className="font-semibold text-slate-600">WU-FundConnect</span> */}
            <span>© 2026 Walailak University. All rights reserved.</span>
            {/* <div className="flex flex-wrap gap-x-6 gap-y-2">
              <button type="button" className="hover:text-violet-700">
                นโยบายความเป็นส่วนตัว
              </button>
              <button type="button" className="hover:text-violet-700">
                เงื่อนไขการใช้งาน
              </button>
              <button type="button" className="hover:text-violet-700">
                ติดต่อเรา
              </button>
            </div> */}
          </footer>
        </div>
      </main>
    </AppAlertProvider>
  );
}
