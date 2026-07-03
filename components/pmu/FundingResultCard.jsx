export default function FundingResultCard({
  result,
  form,
  onChange,
  onSave,
  isSaving,
}) {
  const data = result?.data;

  if (!data) return null;

  // ใช้ form ที่แก้ไขได้ก่อน ถ้ายังไม่มี ให้แสดงค่าจากผล AI
  const values = form || data;

  function updateField(field, value) {
    if (!onChange) return;

    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <section className="min-w-0 rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 22v-4M4 12H2M6 12H4M20 12h-2M22 12h-2M19.07 4.93l-2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                ตรวจสอบก่อนบันทึก
              </p>

              <label className="mt-2 block">
                <span className="sr-only">ชื่อแหล่งทุน</span>

                <input
                  type="text"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 shadow-inner shadow-slate-100/70 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
                  value={values.name || ""}
                  disabled={!onChange || isSaving}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="กรอกชื่อแหล่งทุน"
                />
              </label>
            </div>
          </div>

          <span className="mt-1 shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
            บันทึก
          </span>
        </div>

        <div className="my-4 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />

        {/* สถานะ + วันปิดรับ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-800">
              <span>สถานะ</span>
            </span>

            <select
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
              value={values.status || ""}
              disabled={!onChange || isSaving}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="">ไม่ระบุ</option>
              <option value="open">เปิดรับ</option>
              <option value="upcoming">ยังไม่เปิดรับ</option>
              <option value="closed">ปิดรับแล้ว</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-800">
              <span>วันปิดรับ</span>
            </span>

            <input
              type="date"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
              value={values.deadline || ""}
              disabled={!onChange || isSaving}
              onChange={(event) => updateField("deadline", event.target.value)}
            />
          </label>
        </div>

        {/* กรอบโจทย์ */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="mt-0.5 text-slate-400">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                กรอบโจทย์
              </p>

              <textarea
                className="mt-2 min-h-36 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
                value={values.requirements || ""}
                disabled={!onChange || isSaving}
                onChange={(event) =>
                  updateField("requirements", event.target.value)
                }
                placeholder="กรอกหรือแก้ไขกรอบโจทย์แหล่งทุน..."
              />
            </div>
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button
          type="button"
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#4d39e8] via-[#7739f4] to-[#ff2e93] px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          disabled={!onSave || isSaving}
          onClick={onSave}
        >
          {isSaving ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              กำลังบันทึก...
            </>
          ) : (
            "บันทึกแหล่งทุน"
          )}
        </button>
      </div>
    </section>
  );
}
