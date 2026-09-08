"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  initialClients, 
  Client, 
  Booking 
} from "../broker/MockData";

import { 
  initialTransactions, 
  initialMessages, 
  Transaction, 
  ClientMessage 
} from "./MockClientData";

import {
  bookingsApi,
  slotsApi,
  usersApi,
  BookingApiResponse,
  PublishedSlot,
  parseSlotTime,
  toISOSlotTime,
} from "@/lib/api";

interface ClientContextType {
  client: Client;
  setClient: React.Dispatch<React.SetStateAction<Client>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  messages: ClientMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ClientMessage[]>>;
  notifications: Array<{ type: string; message: string; time: string }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ type: string; message: string; time: string }>>>;
  booking: Booking | null;
  setBooking: React.Dispatch<React.SetStateAction<Booking | null>>;
  bookings: Booking[];
  publishedSlots: PublishedSlot[];
  availableSlots: string[];
  fetchAvailableSlots: (date: string, brokerId?: string) => Promise<void>;
  handleNewBooking: (dateStr: string, timeStr: string, typeStr: string, platformStr: string) => Promise<void>;
  claimSlot: (slotId: string) => Promise<void>;
  handleLogAction: (actionText: string) => void;
  loading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

function apiBookingToBooking(b: BookingApiResponse): Booking {
  const { date, time } = parseSlotTime(b.slot_time);
  return {
    id: b.id,
    clientId: b.client_id,
    clientName: b.client_name,
    brokerName: b.broker_name,
    date,
    time,
    type: b.consultation_type,
    platform: b.meeting_platform,
    notes: b.notes || undefined,
  };
}

function isFuture(d: Booking): boolean {
  const t = new Date(`${d.date}T${toHHMM(d.time)}`);
  return t.getTime() > Date.now();
}

function toHHMM(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client>(
    initialClients.find((c) => c.id === "c4") || initialClients[0]
  );
  
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  
  const [notifications, setNotifications] = useState([
    { type: "upload", message: "Emma Wilson uploaded certified UMID ID document.", time: "2 hours ago" },
    { type: "alert", message: "System alert: Bank Statement document uploaded is missing page 3.", time: "1 day ago" },
    { type: "system", message: "Welcome to BAI Finance Secure Client Hub! Your broker is Sarah Jenkins.", time: "3 days ago" }
  ]);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [publishedSlots, setPublishedSlots] = useState<PublishedSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --------------------------------------------------------------------------
    // 1. Fetch live user profile from backend (/api/users/profile/)
    // --------------------------------------------------------------------------
    usersApi.getProfile()
      .then((profile) => {
        if (profile && (profile.full_name || profile.first_name || profile.last_name)) {
          const resolvedFullName = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          setClient((prev) => ({
            ...prev,
            name: resolvedFullName || prev.name,
            email: profile.email || prev.email,
            profile: {
              ...prev.profile,
              fullLegalName: resolvedFullName || prev.profile?.fullLegalName || prev.name,
              email: profile.email || prev.profile?.email || prev.email,
            }
          }));
        }
      })
      .catch((err) => {
        console.debug("Backend user profile endpoint not reachable or unauthorized, fallback to local state:", err);
      });

    // --------------------------------------------------------------------------
    // 2. Fetch bookings and published slots
    // --------------------------------------------------------------------------
    bookingsApi.list()
      .then((list) => {
        const mapped = list.map(apiBookingToBooking);
        setBookings(mapped);
        const upcoming = mapped.filter(isFuture).sort(
          (a, b) => +new Date(`${a.date}T${toHHMM(a.time)}`) - +new Date(`${b.date}T${toHHMM(b.time)}`)
        )[0] || mapped[0] || null;
        setBooking(upcoming);
      })
      .catch((err) => console.error("Failed to load bookings:", err));
    slotsApi.list()
      .then(setPublishedSlots)
      .catch((err) => console.error("Failed to load published slots:", err))
      .finally(() => setLoading(false));
  }, []);

  const fetchAvailableSlots = useCallback(async (date: string, brokerId?: string) => {
    try {
      const data = await bookingsApi.availableSlots(date, brokerId);
      setAvailableSlots(data.available_slots);
    } catch (err) {
      console.error("Failed to fetch available slots:", err);
      setAvailableSlots([]);
    }
  }, []);

  const handleNewBooking = useCallback(async (dateStr: string, timeStr: string, typeStr: string, platformStr: string) => {
    const slot_time = toISOSlotTime(dateStr, timeStr);
    const created = await bookingsApi.create({
      slot_time,
      consultation_type: typeStr,
      meeting_platform: platformStr,
    });
    const mapped = apiBookingToBooking(created);
    setBookings((prev) => [mapped, ...prev]);
    setBooking(mapped);
  }, []);

  const claimSlot = useCallback(async (slotId: string) => {
    const created = await bookingsApi.create({ slot_id: slotId });
    const mapped = apiBookingToBooking(created);
    setBookings((prev) => [mapped, ...prev]);
    setBooking(mapped);
    setPublishedSlots((prev) => prev.filter((s) => s.id !== slotId));
  }, []);

  const handleLogAction = (actionText: string) => {
    const newNotif = {
      type: "user",
      message: actionText,
      time: "Just Now"
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <ClientContext.Provider value={{
      client,
      setClient,
      transactions,
      setTransactions,
      messages,
      setMessages,
      notifications,
      setNotifications,
      booking,
      setBooking,
      bookings,
      publishedSlots,
      availableSlots,
      fetchAvailableSlots,
      handleNewBooking,
      claimSlot,
      handleLogAction,
      loading
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
