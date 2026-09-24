"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRef } from "react";
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
  loansApi,
  BookingApiResponse,
  PublishedSlot,
  parseSlotTime,
  toISOSlotTime,
  notificationsApi,
  NotificationApiResponse,
  subscribeToNotificationStream,
} from "@/lib/api";

interface ClientContextType {
  client: Client;
  setClient: React.Dispatch<React.SetStateAction<Client>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  messages: ClientMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ClientMessage[]>>;
  lastLoanStatusUpdate: string | null;
  notifications: PortalNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<PortalNotification[]>>;
  unreadCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toasts: PortalNotification[];
  dismissToast: (id: string) => void;
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

type PortalNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

function mapNotification(notification: NotificationApiResponse): PortalNotification {
  return {
    id: notification.id,
    type: notification.notification_type,
    title: notification.title,
    message: notification.message,
    created_at: notification.created_at,
    is_read: notification.is_read,
  };
}

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
  const [lastLoanStatusUpdate, setLastLoanStatusUpdate] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  const [toasts, setToasts] = useState<PortalNotification[]>([]);
  const knownNotifIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [publishedSlots, setPublishedSlots] = useState<PublishedSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data.map(mapNotification));

      if (!firstLoadDone.current) {
        firstLoadDone.current = true;
        knownNotifIds.current = new Set(data.map((n) => n.id));
        return;
      }

      const fresh = data.filter((n) => !knownNotifIds.current.has(n.id));
      if (fresh.length) {
        fresh.forEach((n) => knownNotifIds.current.add(n.id));
        const newOnes = fresh.slice(0, 3).map(mapNotification);
        setToasts((prev) => [...newOnes, ...prev].slice(0, 4));
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    const storedAsanaProfile = sessionStorage.getItem("asana_profile");

    if (storedAsanaProfile) {
      try {
        const asanaProfile = JSON.parse(storedAsanaProfile) as {
          fullname?: string;
          dob?: string;
          email?: string;
          address?: string;
          mobile?: string;
          visa_subclass?: string;
          visa_expiry?: string;
          loan_amount?: string;
          goal?: string;
          loan_status?: string;
        };

        setClient((prev) => ({
          ...prev,
          name: asanaProfile.fullname || prev.name,
          email: asanaProfile.email || prev.email,
          phone: asanaProfile.mobile || prev.phone,
          profile: {
            ...prev.profile,
            fullLegalName: asanaProfile.fullname || prev.profile.fullLegalName,
            dob: asanaProfile.dob || prev.profile.dob,
            email: asanaProfile.email || prev.profile.email,
            mobile: asanaProfile.mobile || prev.profile.mobile,
            address: asanaProfile.address || prev.profile.address,
            residentialAddress: asanaProfile.address || prev.profile.residentialAddress,
            visaSubclass: asanaProfile.visa_subclass || prev.profile.visaSubclass,
            visaExpiry: asanaProfile.visa_expiry || prev.profile.visaExpiry,
          },
          loan: {
            ...prev.loan,
            requestedAmount: asanaProfile.loan_amount
              ? Number(asanaProfile.loan_amount)
              : prev.loan.requestedAmount,
            purpose: asanaProfile.goal || prev.loan.purpose,
            currentStatus: asanaProfile.loan_status || prev.loan.currentStatus,
          },
        }));
      } catch {
        sessionStorage.removeItem("asana_profile");
      }
    }

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

  const refreshLoanStatus = useCallback(async () => {
    try {
      const result = await loansApi.getCurrentStatus();

      if (!result.loan_status) {
        return;
      }

      const loanStatus = result.loan_status;

      setClient((previousClient) => {
        if (previousClient.loan?.currentStatus === loanStatus) {
          return previousClient;
        }

        setLastLoanStatusUpdate(new Date().toISOString());

        return {
          ...previousClient,
          loan: {
            ...previousClient.loan,
            currentStatus: loanStatus,
          },
        };
      });
    } catch (error) {
      // A temporary Asana/API failure should not log the client out.
      console.error("Failed to refresh loan status:", error);
    }
  }, []);

  useEffect(() => {
    refreshLoanStatus();
    const intervalId = window.setInterval(refreshLoanStatus, 30_000);
    return () => window.clearInterval(intervalId);
  }, [refreshLoanStatus]);

  useEffect(() => {
    return subscribeToNotificationStream((push) => {
      if (push.loan_status) {
        setClient((previousClient) =>
          previousClient.loan?.currentStatus === push.loan_status
            ? previousClient
            : {
                ...previousClient,
                loan: {
                  ...previousClient.loan,
                  currentStatus: push.loan_status,
                },
              }
        );
        setLastLoanStatusUpdate(new Date().toISOString());
      }
      loadNotifications();
    });
  }, [loadNotifications]);

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

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markRead(id);
    } catch (error) {
      console.error("Failed to mark notification read:", error);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.is_read ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogAction = (actionText: string) => {
    const newNotif: PortalNotification = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}`,
      type: "user",
      title: actionText,
      message: actionText,
      created_at: new Date().toISOString(),
      is_read: true,
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
      lastLoanStatusUpdate,
      notifications,
      setNotifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      dismissToast,
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
