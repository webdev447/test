"use client";

import { useState } from "react";
import { saveProfile } from "@/app/actions/profile";
import { EMPTY_PROFILE, type Profile } from "@/lib/profile";

const BANKS = [
  "กสิกรไทย (KBank)",
  "ไทยพาณิชย์ (SCB)",
  "กรุงเทพ (Bangkok Bank)",
  "กรุงไทย (Krungthai)",
  "กรุงศรีอยุธยา (Krungsri)",
  "ทหารไทยธนชาต (ttb)",
  "ออมสิน (GSB)",
  "ธ.ก.ส. (BAAC)",
  "ซีไอเอ็มบีไทย (CIMB Thai)",
  "ยูโอบี (UOB)",
  "อื่นๆ",
];

export default function ProfileForm({
  initialProfile,
}: {
  initialProfile: Profile | null;
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile ?? EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProfile(profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-6 rounded-2xl border border-border bg-background-card p-6"
    >
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          ข้อมูลส่วนตัว
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ">
            <input
              value={profile.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="ชื่อจริง"
              className={inputClass}
            />
          </Field>
          <Field label="นามสกุล">
            <input
              value={profile.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="นามสกุล"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="เบอร์ติดต่อ">
            <input
              value={profile.phone}
              onChange={(e) => update("phone", e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="08X-XXX-XXXX"
              inputMode="tel"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-dashed border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          บัญชีธนาคาร (สำหรับโอนเงินรางวัล)
        </h2>
        <div className="mt-3 space-y-4">
          <Field label="ธนาคาร">
            <select
              value={profile.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              className={inputClass}
            >
              <option value="">เลือกธนาคาร</option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ชื่อบัญชี">
            <input
              value={profile.bankAccountName}
              onChange={(e) => update("bankAccountName", e.target.value)}
              placeholder="ชื่อ-นามสกุล ตามหน้าบัญชี"
              className={inputClass}
            />
          </Field>
          <Field label="เลขบัญชี">
            <input
              value={profile.bankAccountNumber}
              onChange={(e) =>
                update("bankAccountNumber", e.target.value.replace(/[^0-9-]/g, ""))
              }
              placeholder="XXX-X-XXXXX-X"
              inputMode="numeric"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="btn-gold w-full rounded-full px-6 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
      </button>

      {saved && (
        <p className="text-center text-sm text-success">บันทึกข้อมูลเรียบร้อยแล้ว</p>
      )}
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-foreground-muted">{label}</span>
      {children}
    </label>
  );
}
