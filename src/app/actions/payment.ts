"use server";

import sharp from "sharp";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BANK_TRANSFER_ACCOUNT } from "@/lib/payment-config";
import {
  releaseExpiredHolds,
  SERVICE_FEE_PER_TICKET,
  type ServiceType,
} from "@/lib/cart-store";

const THUNDER_VERIFY_URL = "https://api.thunder.in.th/v1/verify";
const THUNDER_TOKEN = process.env.TW_ACCESS_TOKEN ?? process.env.EASYSLIP_API;

// A slip's own transfer timestamp (not our stock hold) must fall within this
// window — old enough that it can't be a future/scheduled transfer, recent
// enough that it isn't some unrelated payment from ages ago being reused.
const SLIP_EXPIRE_MINUTES = 24 * 60;

export type SlipVerifyResult =
  | {
      ok: true;
      orderId: string;
      totalCount: number;
      totalPrice: number;
      ticketsPrice: number;
      serviceFee: number;
      serviceType: ServiceType;
    }
  | { ok: false; reason: string };

type ThunderResponse = {
  status: number;
  message?: string;
  data?: {
    transRef?: string;
    date?: string; // when the transfer itself happened, per the slip
    amount?: { amount?: number };
    receiver?: {
      bank?: { short?: string; name?: string };
      account?: { name?: { th?: string } };
    };
  };
};

// Strips a "data:image/...;base64," prefix if present, decodes to bytes,
// then re-compresses through sharp — a phone photo is easily several MB and
// Thunder caps uploads at 4MB, so this both avoids that limit and speeds up
// the API call.
async function compressSlipImage(slipBase64: string): Promise<string> {
  const raw = slipBase64.includes(",") ? slipBase64.split(",", 2)[1] : slipBase64;
  const input = Buffer.from(raw, "base64");
  const output = await sharp(input)
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  return output.toString("base64");
}

function mapThunderError(message?: string): string {
  switch (message) {
    case "invalid_base64":
    case "invalid_image":
      return "รูปสลิปไม่ถูกต้อง กรุณาอัปโหลดรูปใหม่";
    case "image_size_too_large":
      return "ไฟล์รูปใหญ่เกินไป (ไม่เกิน 4MB)";
    case "qrcode_not_found":
      return "ไม่พบ QR code ในสลิป กรุณาถ่ายรูปให้เห็นสลิปทั้งใบชัดเจน";
    case "slip_not_found":
      return "อ่านข้อมูลจากสลิปไม่สำเร็จ กรุณาลองใหม่ด้วยรูปที่ชัดเจนกว่านี้";
    case "slip_pending":
      return "สลิปนี้ยังไม่พร้อมตรวจสอบ (บางธนาคารต้องรอ 2-5 นาทีหลังโอน) กรุณาลองใหม่อีกครั้ง";
    default:
      return "ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
}

// Verifies a customer's uploaded transfer slip against Thunder/EasySlip,
// then — only if the amount and receiving account genuinely match this
// order — turns the current cart into a paid order. Never trusts a
// client-supplied amount: the total is recomputed here from the cart, the
// same way src/app/actions/cart.ts's checkout() does.
export async function verifyPaymentSlip(params: {
  serviceType: ServiceType;
  slipBase64: string; // data URI or raw base64, straight from FileReader
}): Promise<SlipVerifyResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "กรุณาเข้าสู่ระบบก่อนชำระเงิน" };

  if (!THUNDER_TOKEN) {
    return {
      ok: false,
      reason: "ระบบตรวจสอบสลิปยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  const safeServiceType: ServiceType =
    params.serviceType === "shipping" ? "shipping" : "storage";
  const db = supabaseAdmin();
  await releaseExpiredHolds(db);

  const { data: items, error: readError } = await db
    .from("cart_items")
    .select("ticket_id, number, price, qty")
    .eq("user_id", userId);
  if (readError) throw readError;
  if (!items || items.length === 0) {
    return { ok: false, reason: "หมดเวลาจองสลากในตะกร้าแล้ว กรุณาเลือกใหม่อีกครั้ง" };
  }

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const ticketsPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const serviceFee = totalCount * SERVICE_FEE_PER_TICKET[safeServiceType];
  const totalPrice = ticketsPrice + serviceFee;

  let verified: ThunderResponse;
  try {
    const compressed = await compressSlipImage(params.slipBase64);
    const res = await fetch(THUNDER_VERIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${THUNDER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: compressed, checkDuplicate: true }),
    });
    verified = await res.json();
    if (!res.ok || verified.status !== 200) {
      return { ok: false, reason: mapThunderError(verified.message) };
    }
  } catch (err) {
    console.error("เรียก API ตรวจสอบสลิปไม่สำเร็จ:", err);
    return { ok: false, reason: "เชื่อมต่อระบบตรวจสอบสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  const data = verified.data;
  const transRef = data?.transRef;
  const slipAmount = data?.amount?.amount;
  const receiverName = data?.receiver?.account?.name?.th ?? "";
  const receiverBankShort = data?.receiver?.bank?.short ?? "";

  if (!transRef || slipAmount === undefined || !data?.date) {
    return { ok: false, reason: "อ่านข้อมูลสลิปไม่สำเร็จ กรุณาลองใหม่ด้วยรูปที่ชัดเจนกว่านี้" };
  }

  // The transfer itself must be recent and not backdated/scheduled — this is
  // the slip's own timestamp, unrelated to the cart's stock-hold countdown.
  const slipTime = new Date(data.date);
  const now = Date.now();
  if (slipTime.getTime() > now) {
    return { ok: false, reason: "สลิปนี้เป็นการตั้งเวลาโอนล่วงหน้า ใช้ยืนยันตอนนี้ไม่ได้" };
  }
  if ((now - slipTime.getTime()) / 60_000 > SLIP_EXPIRE_MINUTES) {
    return { ok: false, reason: "สลิปนี้หมดอายุแล้ว กรุณาใช้สลิปที่โอนล่าสุด" };
  }

  if (Math.abs(slipAmount - totalPrice) > 0.5) {
    return {
      ok: false,
      reason: `ยอดเงินในสลิป (${slipAmount.toLocaleString("th-TH")} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${totalPrice.toLocaleString("th-TH")} บาท)`,
    };
  }

  // Receiving account must be ours. Match loosely on name (bank apps often
  // prefix it with นาย/นาง/น.ส., which our configured name doesn't include)
  // and on bank short code (blank is tolerated — some slip formats omit it
  // for PromptPay-proxy transfers).
  const normalizedReceiver = receiverName.replace(/\s+/g, "");
  const expectedName = BANK_TRANSFER_ACCOUNT.accountName.replace(/\s+/g, "");
  const nameMatches = normalizedReceiver.includes(expectedName);
  const bankMatches =
    receiverBankShort === "" || receiverBankShort === BANK_TRANSFER_ACCOUNT.bankShort;

  if (!nameMatches || !bankMatches) {
    return {
      ok: false,
      reason: "บัญชีปลายทางในสลิปไม่ตรงกับบัญชีร้านค้า กรุณาตรวจสอบและลองใหม่",
    };
  }

  // Belt-and-suspenders duplicate check on top of Thunder's own
  // checkDuplicate — reject before even trying the insert if we've already
  // used this transaction ref for a past order.
  const { data: existingRef, error: refError } = await db
    .from("orders")
    .select("id")
    .eq("slip_ref", transRef)
    .maybeSingle();
  if (refError) throw refError;
  if (existingRef) {
    return { ok: false, reason: "สลิปนี้ถูกใช้ยืนยันการชำระเงินไปแล้ว" };
  }

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: userId,
      total_count: totalCount,
      total_price: totalPrice,
      service_type: safeServiceType,
      service_fee: serviceFee,
      status: "paid",
      slip_ref: transRef,
    })
    .select("id")
    .single();
  if (orderError) {
    // 23505 = unique_violation — someone else's request won the race on this
    // same slip ref between our check above and this insert.
    if (orderError.code === "23505") {
      return { ok: false, reason: "สลิปนี้ถูกใช้ยืนยันการชำระเงินไปแล้ว" };
    }
    throw orderError;
  }

  const { error: itemsError } = await db.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      ticket_id: i.ticket_id,
      number: i.number,
      price: i.price,
      qty: i.qty,
    }))
  );
  if (itemsError) throw itemsError;

  await db.from("cart_items").delete().eq("user_id", userId);

  return {
    ok: true,
    orderId: order.id as string,
    totalCount,
    totalPrice,
    ticketsPrice,
    serviceFee,
    serviceType: safeServiceType,
  };
}
