// Ticket type + small shared helpers. The catalog itself now lives in the
// `tickets` table (see src/app/actions/tickets.ts's getTickets()) — added via
// the admin back-office at /admin/tickets, not hardcoded here anymore.

export const FACE_VALUE = 80; // ราคาหน้าสลากตามกฎหมาย (บาท/ใบ)
export const FIRST_PRIZE = 6_000_000; // เงินรางวัลที่ 1 ต่อ 1 ใบ (บาท)

export type Ticket = {
  id: string;
  number: string; // 6 digits
  quantity: number; // ใบที่เหลือของเลขนี้
  isNicePrefix: boolean; // "เลขหน้าสวย" tag
  price: number; // ราคาขายต่อใบ
  drawDate?: string; // e.g. "16 กันยายน 2569"
  imageUrl?: string | null; // real photo of this ticket, if the admin attached one
};

export function matchesPattern(number: string, digits: string[]): boolean {
  return digits.every((d, i) => d === "" || d === number[i]);
}
