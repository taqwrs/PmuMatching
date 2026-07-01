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
    <section className="group relative min-w-0 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-secondary to-primary/60" />

      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                ตรวจสอบก่อนบันทึก
              </p>

              <label className="mt-2 block">
                <span className="sr-only">ชื่อแหล่งทุน</span>

                <input
                  type="text"
                  className="input input-bordered h-11 w-full rounded-xl bg-base-100 px-3 text-base font-semibold shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={values.name || ""}
                  disabled={!onChange || isSaving}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="กรอกชื่อแหล่งทุน"
                />
              </label>
            </div>
          </div>

          <span className="badge badge-success badge-outline mt-1 shrink-0 gap-1.5">
            บันทึก
          </span>
        </div>

        <div className="my-4 h-px bg-linear-to-r from-transparent via-base-300 to-transparent" />

        {/* สถานะ + วันปิดรับ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-control">
            <span className="label">
              <span className="label-text font-medium">สถานะ</span>
            </span>

            <select
              className="select select-bordered w-full"
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

          <label className="form-control">
            <span className="label">
              <span className="label-text font-medium">วันปิดรับ</span>
            </span>

            <input
              type="date"
              className="input input-bordered w-full"
              value={values.deadline || ""}
              disabled={!onChange || isSaving}
              onChange={(event) => updateField("deadline", event.target.value)}
            />
          </label>
        </div>

        {/* กรอบโจทย์ */}
        <div className="mt-4 rounded-xl bg-base-200/50 p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="mt-0.5 text-base-content/40">
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
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/40">
                กรอบโจทย์
              </p>

              <textarea
                className="textarea textarea-bordered mt-2 min-h-36 w-full resize-y text-sm"
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
          className="btn btn-primary mt-6 w-full"
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
