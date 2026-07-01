"use client";

import { useState } from "react";

function SparkleIcon({ className = "" }) {
  return (
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
      className={className}
      aria-hidden="true"
    >
      <path d="M9.5 2 11 8l5.5 1.5L11 11 9.5 17 8 11 2.5 9.5 8 8z" />
      <path d="M19 14 20 17l3 1-3 1-1 3-1-3-3-1 3-1z" />
    </svg>
  );
}

function RefreshIcon({ className = "" }) {
  return (
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
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function getFundingStatusLabel(status) {
  const labels = {
    open: "เปิดรับ",
    upcoming: "ยังไม่เปิดรับ",
    closed: "ปิดรับแล้ว",
  };

  return labels[status] || "ไม่ระบุสถานะ";
}

function getFundingStatusClass(status) {
  if (status === "open") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "upcoming") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "closed") return "bg-rose-50 text-rose-700 ring-rose-100";

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatDeadline(deadline) {
  if (!deadline) return "ไม่ระบุวันปิดรับ";

  const date = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันปิดรับ";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function FundingSourcesPanel({
  fundingSources = [],
  isLoading = false,
  error = "",
  collapseOnMobile = false,
  onRefresh,
}) {
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(collapseOnMobile);
  const openCount = fundingSources.filter((item) => item.status === "open").length;
  const visibleFundingSources = showOpenOnly
    ? fundingSources.filter((item) => item.status === "open")
    : fundingSources;

  return (
    <aside className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-violet-700">
            <SparkleIcon className="h-5 w-5" />
            <h3 className="text-lg font-extrabold">ฐานข้อมูลแหล่งทุน</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            แหล่งทุนทั้งหมดที่มีอยู่ในระบบ WU-FundConnect
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-violet-100 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="รีเฟรชข้อมูลแหล่งทุน"
            disabled={isLoading || !onRefresh}
            onClick={onRefresh}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <RefreshIcon />
            )}
            รีเฟรช
          </button>
          <button
            type="button"
            className="rounded-full border border-violet-100 px-3 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-50 xl:hidden"
            aria-expanded={!isMobileCollapsed}
            onClick={() => setIsMobileCollapsed((current) => !current)}
          >
            {isMobileCollapsed ? "แสดง" : "ซ่อน"}
          </button>
        </div>
      </div>

      <div className={isMobileCollapsed ? "hidden xl:block" : "block"}>
      <div className="mt-5 rounded-2xl bg-linear-to-br from-violet-600 to-fuchsia-500 p-4 text-white shadow-lg shadow-violet-500/20 sm:mt-6 sm:p-5">
        <p className="text-sm font-medium text-white/80">รายการในระบบ</p>
        <div className="mt-3 flex items-end justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-3xl font-extrabold leading-none sm:text-4xl">
              {isLoading ? "..." : fundingSources.length.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-white/80">แหล่งทุนทั้งหมด</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold">
              {isLoading ? "..." : openCount.toLocaleString()}
            </p>
            <p className="text-sm text-white/80">เปิดรับอยู่</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800">
            {showOpenOnly ? "เฉพาะที่เปิดรับ" : "ดูทั้งหมด"}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            แสดง {isLoading ? "..." : visibleFundingSources.length.toLocaleString()} จาก{" "}
            {isLoading ? "..." : fundingSources.length.toLocaleString()} รายการ
          </p>
        </div>
        <label className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <span>ทั้งหมด</span>
          <input
            type="checkbox"
            defaultChecked
            className="toggle"
            aria-label="แสดงเฉพาะแหล่งทุนที่เปิดรับ"
            onChange={(event) => setShowOpenOnly(event.target.checked)}
          />
          <span>เปิดรับ</span>
        </label>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : visibleFundingSources.length > 0 ? (
        <div className="mt-5 max-h-none space-y-3 overflow-y-visible lg:max-h-136 lg:overflow-y-auto lg:pr-2">
          {visibleFundingSources.map((item, index) => (
            <article
              key={item.id || `${item.name}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-700">
                      {index + 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getFundingStatusClass(item.status)}`}
                    >
                      {getFundingStatusLabel(item.status)}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-extrabold leading-6 text-slate-900">
                    {item.name || "ไม่ระบุชื่อแหล่งทุน"}
                  </h4>
                  {item.url ? (
                    <a
                      className="mt-1 block truncate text-xs font-semibold text-violet-600 hover:text-violet-800 hover:underline"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.url}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      ไม่มี URL
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-left text-xs font-bold leading-5 text-slate-500 sm:text-right">
                  วันที่ปิดรับ<br />
                  <span className="text-slate-800">{formatDeadline(item.deadline)}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 p-4 text-sm font-semibold text-slate-600">
          {showOpenOnly
            ? "ยังไม่มีแหล่งทุนที่เปิดรับอยู่ในระบบ"
            : "ยังไม่มีข้อมูลแหล่งทุนในระบบ"}
        </div>
      )}
      </div>
    </aside>
  );
}
