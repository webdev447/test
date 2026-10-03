"use client";

import Link from "next/link";
import TicketCard from "@/components/TicketCard";
import { useTicketCatalog } from "@/context/TicketCatalogContext";

// The "เลขเด็ดแนะนำ" grid on the home page needs the live catalog (fetched via
// TicketCatalogContext), which is a client-only hook — pulled out of the
// otherwise-server-rendered Home page so only this bit needs "use client".
export default function HomeTicketPreview() {
  const { tickets } = useTicketCatalog();

  return (
    <>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-2 sm:max-w-none sm:grid-cols-4">
        {tickets.slice(0, 4).map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>

      <Link
        href="/shop"
        className="btn-gold mt-6 inline-block rounded-full px-8 py-3 text-sm font-semibold text-background"
      >
        ดูสินค้าทั้งหมด
      </Link>
    </>
  );
}
