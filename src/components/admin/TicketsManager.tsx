"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  createTicket,
  deactivateAllTickets,
  deleteTicket,
  getAdminTickets,
  setTicketActive,
  uploadTicketImage,
  type AdminTicket,
} from "@/app/actions/admin";
import { ticketKindLabel } from "@/lib/ticket-label";
import { FACE_VALUE } from "@/lib/mock-tickets";

export default function TicketsManager({ initialTickets }: { initialTickets: AdminTicket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [number, setNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(FACE_VALUE);
  const [isNicePrefix, setIsNicePrefix] = useState(false);
  const [drawDate, setDrawDate] = useState(initialTickets[0]?.drawDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function refresh() {
    const data = await getAdminTickets();
    setTickets(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createTicket({ number, quantity, price, isNicePrefix, drawDate });
      setNumber("");
      setQuantity(1);
      setIsNicePrefix(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มเลขไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(ticket: AdminTicket) {
    await setTicketActive(ticket.id, !ticket.isActive);
    await refresh();
  }

  async function handleDelete(ticket: AdminTicket) {
    if (!window.confirm(`ลบเลข ${ticket.number} ออกจากคลังใช่ไหม?`)) return;
    await deleteTicket(ticket.id);
    await refresh();
  }

  async function handleStartNewDraw() {
    if (
      !window.confirm(
        "ปิดการขายเลขทั้งหมดที่เปิดอยู่ตอนนี้ใช่ไหม? (ยังเก็บไว้ดูประวัติได้ ไม่ได้ลบ)"
      )
    ) {
      return;
    }
    await deactivateAllTickets();
    await refresh();
  }

  // Group by draw → หวยเดี่ยว / หวยชุด (sub-grouped by set size) so a long
  // flat list doesn't turn into a wall of near-identical rows.
  const byDraw = tickets.reduce<Record<string, AdminTicket[]>>((acc, t) => {
    (acc[t.drawDate] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="grid gap-3 rounded-2xl border border-border bg-background-card p-5 shadow-sm shadow-blue-950/5 sm:grid-cols-2"
      >
        <div>
          <label className="text-xs font-medium text-foreground-muted">เลข 6 หลัก</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            required
            placeholder="เช่น 452784"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">งวด</label>
          <input
            value={drawDate}
            onChange={(e) => setDrawDate(e.target.value)}
            required
            placeholder="เช่น 16 กันยายน 2569"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">
            จำนวนใบในชุด (1 = หวยเดี่ยว)
          </label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">ราคาต่อใบ (บาท)</label>
          <input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground-muted sm:col-span-2">
          <input
            type="checkbox"
            checked={isNicePrefix}
            onChange={(e) => setIsNicePrefix(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          เลขหน้าสวย
        </label>

        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {isSaving ? "กำลังเพิ่ม..." : "+ เพิ่มเลขนี้เข้าคลัง"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleStartNewDraw}
        className="rounded-full border border-danger/40 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        เริ่มงวดใหม่ (ปิดการขายเลขเก่าทั้งหมด)
      </button>

      {Object.entries(byDraw).map(([draw, group]) => (
        <DrawGroup
          key={draw}
          draw={draw}
          tickets={group}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          onUploaded={refresh}
        />
      ))}

      {tickets.length === 0 && (
        <p className="text-sm text-foreground-muted">ยังไม่มีเลขในคลัง เพิ่มเลขแรกด้านบนได้เลย</p>
      )}
    </div>
  );
}

type Category = { key: string; label: string; tickets: AdminTicket[] };

function DrawGroup({
  draw,
  tickets,
  onToggleActive,
  onDelete,
  onUploaded,
}: {
  draw: string;
  tickets: AdminTicket[];
  onToggleActive: (t: AdminTicket) => void;
  onDelete: (t: AdminTicket) => void;
  onUploaded: () => void;
}) {
  const singles = tickets.filter((t) => t.quantity === 1);
  const setsBySize = tickets
    .filter((t) => t.quantity > 1)
    .reduce<Record<number, AdminTicket[]>>((acc, t) => {
      (acc[t.quantity] ??= []).push(t);
      return acc;
    }, {});

  const categories: Category[] = [
    ...(singles.length > 0 ? [{ key: "single", label: "หวยเดี่ยว", tickets: singles }] : []),
    ...Object.entries(setsBySize)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([size, group]) => ({
        key: `set-${size}`,
        label: `หวยชุด ${size} ใบ`,
        tickets: group,
      })),
  ];

  const [activeKey, setActiveKey] = useState(categories[0]?.key);
  const active = categories.find((c) => c.key === activeKey) ?? categories[0];

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">งวด {draw}</h2>

      <div className="mt-2 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveKey(cat.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active?.key === cat.key
                ? "btn-gold text-background"
                : "border border-border text-foreground-muted hover:border-gold hover:text-gold-light"
            }`}
          >
            {cat.label} · {cat.tickets.length}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-3 space-y-2">
          {active.tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              onUploaded={onUploaded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketRow({
  ticket,
  onToggleActive,
  onDelete,
  onUploaded,
}: {
  ticket: AdminTicket;
  onToggleActive: (t: AdminTicket) => void;
  onDelete: (t: AdminTicket) => void;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsUploading(true);
      try {
        await uploadTicketImage(ticket.id, reader.result as string);
        onUploaded();
      } catch (err) {
        console.error("อัปโหลดรูปไม่สำเร็จ:", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${
        ticket.isActive
          ? "border-border bg-background-card"
          : "border-border bg-background-soft/60 opacity-70"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="แนบรูปสลาก"
        className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-background"
      >
        {ticket.imageUrl ? (
          <Image src={ticket.imageUrl} alt="" fill className="object-cover" sizes="80px" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-foreground-muted">
            {isUploading ? "..." : "+ รูป"}
          </span>
        )}
      </button>

      <span className="font-bold tracking-widest text-gold-light">{ticket.number}</span>
      {ticket.isNicePrefix && (
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-light">
          เลขหน้าสวย
        </span>
      )}
      <span className="text-foreground-muted">{ticketKindLabel(ticket.quantity)}</span>
      <span className="text-foreground-muted">{ticket.price} บาท/ใบ</span>
      <span className="text-foreground-muted">
        ขายแล้ว {ticket.sold} / คงเหลือ {ticket.remaining}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          ticket.isActive ? "bg-success/15 text-success" : "bg-background-soft text-foreground-muted"
        }`}
      >
        {ticket.isActive ? "กำลังขาย" : "ปิดขาย"}
      </span>

      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => onToggleActive(ticket)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          {ticket.isActive ? "ปิดขาย" : "เปิดขาย"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(ticket)}
          className="rounded-full border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
        >
          ลบ
        </button>
      </span>
    </div>
  );
}
