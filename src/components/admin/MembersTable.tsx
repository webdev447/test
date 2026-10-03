"use client";

import { useState } from "react";
import Image from "next/image";
import { getAdminMemberOrders } from "@/app/actions/admin";
import type { AdminMember } from "@/app/actions/admin";
import type { OrderSummary } from "@/app/actions/orders";
import { ticketKindLabel } from "@/lib/ticket-label";

export default function MembersTable({ members }: { members: AdminMember[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      setOrders(null);
      return;
    }
    setExpandedId(userId);
    setOrders(null);
    setLoading(true);
    try {
      const result = await getAdminMemberOrders(userId);
      setOrders(result);
    } catch (err) {
      console.error("โหลดประวัติการซื้อไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-foreground-muted">ยังไม่มีสมาชิก</p>;
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.userId}
          className="overflow-hidden rounded-2xl border border-border bg-background-card shadow-sm shadow-blue-950/5"
        >
          <button
            type="button"
            onClick={() => toggle(member.userId)}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            {member.image ? (
              <Image
                src={member.image}
                alt=""
                width={36}
                height={36}
                className="shrink-0 rounded-full"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background-soft text-sm font-bold text-foreground-muted">
                {(member.name ?? "?").slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {member.name ?? "ไม่ทราบชื่อ"}
              </p>
              <p className="text-xs text-foreground-muted">
                เข้าร่วม{" "}
                {new Date(member.joinedAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-foreground-muted">
              <p className="text-sm font-bold text-gold-light">
                {member.ticketsBought.toLocaleString("th-TH")} ใบ
              </p>
              <p>{member.totalSpent.toLocaleString("th-TH")} บาท</p>
            </div>
          </button>

          {expandedId === member.userId && (
            <div className="border-t border-border bg-background-soft/50 p-4">
              {loading ? (
                <p className="text-sm text-foreground-muted">กำลังโหลด...</p>
              ) : !orders || orders.length === 0 ? (
                <p className="text-sm text-foreground-muted">ยังไม่มีประวัติการซื้อ</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-border bg-background-card p-3"
                    >
                      <div className="flex items-center justify-between text-xs text-foreground-muted">
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>{order.status === "paid" ? "ชำระเงินแล้ว" : order.status}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {order.items.map((item) => (
                          <div
                            key={item.ticketId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-semibold tracking-widest text-gold-light">
                              {item.number}{" "}
                              <span className="text-xs font-normal tracking-normal text-foreground-muted">
                                ({ticketKindLabel(item.qty)})
                              </span>
                            </span>
                            <span className="text-foreground-muted">
                              {(item.qty * item.price).toLocaleString("th-TH")} บาท
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-sm font-semibold">
                        <span className="text-foreground-muted">รวม {order.totalCount} ใบ</span>
                        <span className="text-gold-light">
                          {order.totalPrice.toLocaleString("th-TH")} บาท
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
