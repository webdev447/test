"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getTicketAvailability, type TicketAvailability } from "@/app/actions/tickets";

type AvailabilityMap = Record<string, TicketAvailability>;

type TicketAvailabilityContextValue = {
  availability: AvailabilityMap;
  refresh: () => Promise<void>;
};

const TicketAvailabilityContext = createContext<TicketAvailabilityContextValue | null>(null);

// How often to re-poll while a shop/home/search page is open — catches
// another buyer grabbing (or releasing) stock without the viewer refreshing.
const POLL_MS = 15_000;

export function TicketAvailabilityProvider({ children }: { children: ReactNode }) {
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await getTicketAvailability();
      setAvailability(data);
    } catch (err) {
      console.error("โหลดสถานะการจองสลากไม่สำเร็จ:", err);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh(); // eslint-disable-line react-hooks/set-state-in-effect -- initial load, not a synchronous setState
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <TicketAvailabilityContext.Provider value={{ availability, refresh }}>
      {children}
    </TicketAvailabilityContext.Provider>
  );
}

export function useTicketAvailability() {
  const ctx = useContext(TicketAvailabilityContext);
  if (!ctx) {
    throw new Error(
      "useTicketAvailability must be used within a TicketAvailabilityProvider"
    );
  }
  return ctx;
}
