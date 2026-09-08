"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  initialClients, 
  initialApplications, 
  initialEmails, 
  Client, 
  Application, 
  Booking, 
  Email 
} from "./MockData";

import {
  bookingsApi,
  slotsApi,
  BookingApiResponse,
  PublishedSlot,
  parseSlotTime,
} from "@/lib/api";

interface BrokerContextType {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  autoCompose: boolean;
  setAutoCompose: (val: boolean) => void;
  notifications: Array<{ type: string; message: string; time: string }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ type: string; message: string; time: string }>>>;
  createBooking: (data: {
    slot_time: string;
    consultation_type?: string;
    meeting_platform?: string;
    notes?: string;
  }) => Promise<void>;
  publishedSlots: PublishedSlot[];
  createSlot: (data: {
    slot_time: string;
    consultation_type?: string;
    meeting_platform?: string;
  }) => Promise<void>;
  deleteSlot: (id: string) => Promise<void>;
  loading: boolean;
  submitting: boolean;
}

const BrokerContext = createContext<BrokerContextType | undefined>(undefined);

function apiBookingToBooking(b: BookingApiResponse): Booking {
  const { date, time } = parseSlotTime(b.slot_time);
  return {
    id: b.id,
    clientId: b.client_id,
    clientName: b.client_name,
    date,
    time,
    type: b.consultation_type,
    platform: b.meeting_platform,
    notes: b.notes || undefined,
  };
}

export function BrokerProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [publishedSlots, setPublishedSlots] = useState<PublishedSlot[]>([]);
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [autoCompose, setAutoCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([
    { type: "Dossier Update", message: "Alice Smith uploaded corporate bank logs and income statement.", time: "10 mins ago" },
    { type: "Outstanding File", message: "Emma Wilson's construction file is missing certified builder insurance.", time: "1 hour ago" },
    { type: "Valuation Scheduled", message: "John Doe's property appraisal booking is locked for tomorrow.", time: "3 hours ago" }
  ]);

  useEffect(() => {
    bookingsApi.list()
      .then((data) => {
        setBookings(data.map(apiBookingToBooking));
      })
      .catch((err) => {
        console.error("Failed to load bookings:", err);
        setBookings([]);
      });
    slotsApi.list()
      .then(setPublishedSlots)
      .catch((err) => {
        console.error("Failed to load published slots:", err);
        setPublishedSlots([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const createBooking = useCallback(async (data: {
    slot_time: string;
    consultation_type?: string;
    meeting_platform?: string;
    notes?: string;
  }) => {
    const created = await bookingsApi.create(data);
    setBookings((prev) => [apiBookingToBooking(created), ...prev]);
  }, []);

  const createSlot = useCallback(async (data: {
    slot_time: string;
    consultation_type?: string;
    meeting_platform?: string;
  }) => {
    setSubmitting(true);
    try {
      const created = await slotsApi.create(data);
      setPublishedSlots((prev) => [created, ...prev]);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteSlot = useCallback(async (id: string) => {
    await slotsApi.remove(id);
    setPublishedSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <BrokerContext.Provider value={{
      clients,
      setClients,
      applications,
      setApplications,
      bookings,
      setBookings,
      emails,
      setEmails,
      autoCompose,
      setAutoCompose,
      notifications,
      setNotifications,
      createBooking,
      publishedSlots,
      createSlot,
      deleteSlot,
      loading,
      submitting
    }}>
      {children}
    </BrokerContext.Provider>
  );
}

export function useBroker() {
  const context = useContext(BrokerContext);
  if (!context) {
    throw new Error("useBroker must be used within a BrokerProvider");
  }
  return context;
}
