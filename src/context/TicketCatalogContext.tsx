"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getTickets } from "@/app/actions/tickets";
import type { Ticket } from "@/lib/mock-tickets";

type TicketCatalogContextValue = {
  tickets: Ticket[];
  loading: boolean;
};

const TicketCatalogContext = createContext<TicketCatalogContextValue | null>(null);

// The current draw's sellable numbers — added via /admin/tickets, fetched
// once here so the shop/home/search pages that used to read the hardcoded
// MOCK_TICKETS array unconditionally now read this instead (same shape,
// just loaded once on mount rather than baked into the bundle).
export function TicketCatalogProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTickets()
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch((err) => console.error("โหลดรายการสลากไม่สำเร็จ:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TicketCatalogContext.Provider value={{ tickets, loading }}>
      {children}
    </TicketCatalogContext.Provider>
  );
}

export function useTicketCatalog() {
  const ctx = useContext(TicketCatalogContext);
  if (!ctx) {
    throw new Error("useTicketCatalog must be used within a TicketCatalogProvider");
  }
  return ctx;
}
