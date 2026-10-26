"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bookingsApi,
  usersApi,
  loansApi,
  slotsApi,
  BookingApiResponse,
  PublishedSlot,
  parseSlotTime,
  toISOSlotTime,
  NotificationApiResponse,
  CurrentLoanStatusResponse,
  LoanApplication,
  notificationsApi,
  subscribeToNotificationStream,
} from "@/lib/api";

import { AsanaProfile, Booking, ClientApplication, ClientData, emptyClient } from "./types";

type PortalNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

interface ClientDataContextType {
  client: ClientData;
  lastLoanStatusUpdate: string | null;
  booking: Booking | null;
  bookings: Booking[];
  publishedSlots: PublishedSlot[];
  availableSlots: string[];
  fetchAvailableSlots: (date: string, brokerId?: string) => Promise<void>;
  handleNewBooking: (
    dateStr: string,
    timeStr: string,
    typeStr: string,
    platformStr: string,
  ) => Promise<void>;
  claimSlot: (slotId: string) => Promise<void>;
  handleLogAction: (actionText: string) => void;
  loading: boolean;
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string) => void;
}

interface NotificationsContextType {
  notifications: PortalNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toasts: PortalNotification[];
  dismissToast: (id: string) => void;
  notificationsLoading: boolean;
}

const ClientDataContext = createContext<ClientDataContextType | undefined>(undefined);
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/** Query keys for the client portal cache. */
const clientKeys = {
  profile: ["client", "profile"] as const,
  loanStatus: ["client", "loan-status"] as const,
  applications: ["client", "loan-applications"] as const,
  bookings: ["client", "bookings"] as const,
  publishedSlots: ["client", "published-slots"] as const,
  notifications: ["client", "notifications"] as const,
  availableSlots: (date: string, brokerId?: string) =>
    ["client", "available-slots", date, brokerId ?? null] as const,
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

function mapApplication(a: LoanApplication): ClientApplication {
  const history = a.asana_status_history
    ? Object.entries(a.asana_status_history).map(
        ([status, changed_at]) => ({ status, changed_at })
      )
    : [];
  return {
    id: a.id,
    asanaProjectGid: a.asana_project_gid ?? null,
    asanaProjectName: a.asana_project_name ?? null,
    asanaTaskGid: a.asana_task_gid ?? null,
    asanaTaskName: a.asana_task_name ?? null,
    amount: a.amount ?? null,
    status: a.status,
    asanaStatus: a.asana_status ?? null,
    asanaStatusHistory: history,
    asanaCreatedAt: a.asana_created_at ?? null,
    asanaSyncedAt: a.asana_synced_at ?? null,
    isPrimary: a.is_primary ?? false,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
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

function isFuture(d: Booking): boolean {
  return new Date(`${d.date}T${toHHMM(d.time)}`).getTime() > Date.now();
}

function applyAsanaProfile(base: ClientData, asana: AsanaProfile): ClientData {
  return {
    ...base,
    name: asana.fullname || base.name,
    email: asana.email || base.email,
    phone: asana.mobile || base.phone,
    profile: {
      ...base.profile,
      fullLegalName: asana.fullname || base.profile.fullLegalName,
      dob: asana.dob || base.profile.dob,
      email: asana.email || base.profile.email,
      mobile: asana.mobile || base.profile.mobile,
      address: asana.address || base.profile.address,
      residentialAddress: asana.address || base.profile.residentialAddress,
      visaSubclass: asana.visa_subclass || base.profile.visaSubclass,
      visaExpiry: asana.visa_expiry || base.profile.visaExpiry,
      visa: asana.visa || base.profile.visa,
      source: asana.source || base.profile.source,
      inquiry: asana.inquiry || base.profile.inquiry,
    },
    loan: {
      ...base.loan,
      requestedAmount: asana.loan_amount
        ? Number(asana.loan_amount)
        : base.loan.requestedAmount,
      purpose: asana.goal || base.loan.purpose,
      currentStatus: asana.loan_status || base.loan.currentStatus,
    },
  };
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [toasts, setToasts] = useState<PortalNotification[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  // One toast per notification id per session, regardless of how many SSE
  // frames, refetches, or reconnects report the same item.
  const seenToastIdsRef = useRef<Set<string>>(new Set());

  const profileQuery = useQuery({
    queryKey: clientKeys.profile,
    queryFn: usersApi.getProfile,
    staleTime: 5 * 60_000,
    meta: { persist: false },
  });

  const loanQuery = useQuery({
    queryKey: clientKeys.loanStatus,
    queryFn: loansApi.getCurrentStatus,
    staleTime: 30_000,
    meta: { persist: false },
  });

  const applicationsQuery = useQuery({
    queryKey: clientKeys.applications,
    queryFn: loansApi.listApplications,
    staleTime: 30_000,
    meta: { persist: false },
  });

  const bookingsQuery = useQuery({
    queryKey: clientKeys.bookings,
    queryFn: bookingsApi.list,
    staleTime: 60_000,
    meta: { persist: false },
  });

  const publishedSlotsQuery = useQuery({
    queryKey: clientKeys.publishedSlots,
    queryFn: slotsApi.list,
    staleTime: 30_000,
    meta: { persist: false },
  });

  const notificationsQuery = useQuery({
    queryKey: clientKeys.notifications,
    queryFn: () => notificationsApi.list(),
    staleTime: 30_000,
    meta: { persist: false },
  });

  const applications = useMemo<ClientApplication[]>(() => {
    return (applicationsQuery.data ?? []).map(mapApplication);
  }, [applicationsQuery.data]);

  const selectedApplication = useMemo<ClientApplication | null>(() => {
    if (selectedApplicationId) {
      const found = applications.find((a) => a.id === selectedApplicationId);
      if (found) return found;
    }
    // Auto-select on load so an existing application always renders its
    // stepper: primary first, otherwise the latest returned application.
    const primary = applications.find((a) => a.isPrimary);
    return primary ?? applications[0] ?? null;
  }, [applications, selectedApplicationId]);

  const client = useMemo<ClientData>(() => {
    let next = emptyClient();

    const profile = profileQuery.data;
    // PII comes from the authenticated profile endpoint (in-memory cache only;
    // never persisted to sessionStorage).
    const asanaProfile = profile?.client_profile;
    if (asanaProfile) next = applyAsanaProfile(next, asanaProfile);

    if (profile) {
      const resolvedFullName =
        profile.full_name ||
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      next = {
        ...next,
        id: profile.id || next.id,
        name: resolvedFullName || next.name,
        email: profile.email || next.email,
        profile: {
          ...next.profile,
          fullLegalName: resolvedFullName || next.profile.fullLegalName || next.name,
          email: profile.email || next.profile.email || next.email,
        },
      };
    }

    // Prefer the selected application as the source of truth for the loan
    // stepper. Fall back to the legacy single-status query when there are no
    // applications yet.
    if (selectedApplication) {
      next = {
        ...next,
        loan: {
          ...next.loan,
          requestedAmount:
            selectedApplication.amount ?? next.loan.requestedAmount,
          currentStatus:
            selectedApplication.asanaStatus ?? next.loan.currentStatus,
          statusHistory:
            selectedApplication.asanaStatusHistory ?? [],
        },
      };
    } else {
      const loanStatus = loanQuery.data?.loan_status;
      if (loanStatus) {
        next = { ...next, loan: { ...next.loan, currentStatus: loanStatus } };
      }
      next = {
        ...next,
        loan: {
          ...next.loan,
          statusHistory:
            loanQuery.data?.status_history ?? next.loan.statusHistory,
        },
      };
    }

    return {
      ...next,
      applications,
      selectedApplicationId: selectedApplication?.id ?? null,
    };
  }, [
    profileQuery.data,
    loanQuery.data,
    applications,
    selectedApplication,
  ]);

  const lastLoanStatusUpdate = loanQuery.data
    ? new Date(loanQuery.dataUpdatedAt).toISOString()
    : null;

  const bookings = useMemo(
    () => (bookingsQuery.data ?? []).map(apiBookingToBooking),
    [bookingsQuery.data],
  );

  const booking = useMemo<Booking | null>(() => {
    const upcoming =
      bookings
        .filter(isFuture)
        .sort(
          (a, b) =>
            +new Date(`${a.date}T${toHHMM(a.time)}`) -
            +new Date(`${b.date}T${toHHMM(b.time)}`),
        )[0] ||
      bookings[0] ||
      null;
    return upcoming;
  }, [bookings]);

  const notifications = useMemo(
    () => (notificationsQuery.data ?? []).map(mapNotification),
    [notificationsQuery.data],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // Live updates arrive over SSE; refetch-on-focus comes from React Query.
  // Bursts of events are coalesced into a single list refresh.
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let flushing = false;

    const enqueueToasts = (items: PortalNotification[]) => {
      const unseen = items.filter(
        (n) => n.id && !seenToastIdsRef.current.has(n.id),
      );
      if (!unseen.length) return;
      unseen.forEach((n) => seenToastIdsRef.current.add(n.id));
      setToasts((prev) => [...unseen.slice(0, 3), ...prev].slice(0, 4));
    };

    const flushNotifications = async () => {
      if (flushing) return;
      flushing = true;
      try {
        const previous =
          queryClient.getQueryData<NotificationApiResponse[]>(clientKeys.notifications);
        const fresh = await notificationsApi.list();
        queryClient.setQueryData(clientKeys.notifications, fresh);

        // First population after a page load is the baseline — never toast it,
        // otherwise every existing notification looks "new" on refresh.
        if (!previous) return;

        const previousIds = new Set(previous.map((n) => n.id));
        const newOnes = fresh.filter((n) => !previousIds.has(n.id));
        enqueueToasts(newOnes.map(mapNotification));
      } catch (error) {
        console.error("Failed to refresh notifications:", error);
      } finally {
        flushing = false;
      }
    };

    const unsubscribe = subscribeToNotificationStream((push, event) => {
      if (push.application_id) {
        // Follow the status push to the application it belongs to.
        setSelectedApplicationId(push.application_id);
        queryClient.setQueryData<ClientApplication[]>(
          clientKeys.applications,
          (prev) =>
            (prev ?? []).map((app) => {
              if (app.id !== push.application_id) return app;
              const history = push.loan_status
                ? [
                    ...(app.asanaStatusHistory ?? []).filter(
                      (e) => e.status !== push.loan_status
                    ),
                    { status: push.loan_status, changed_at: new Date().toISOString() },
                  ]
                : app.asanaStatusHistory;
              return {
                ...app,
                asanaStatus: push.loan_status ?? app.asanaStatus,
                asanaStatusHistory: history,
              };
            })
        );
      }

      if (push.loan_status) {
        const status = push.loan_status;
        // Apply the pushed status immediately so the stepper moves without a
        // round-trip, stamping a provisional timestamp for the new step.
        queryClient.setQueryData<CurrentLoanStatusResponse>(
          clientKeys.loanStatus,
          (prev) => ({
            loan_status: status,
            status_history: [
              ...(prev?.status_history ?? []).filter((e) => e.status !== status),
              { status, changed_at: new Date().toISOString() },
            ],
          }),
        );
        // Reconcile with the authoritative server record (exact timestamp).
        void queryClient.invalidateQueries({ queryKey: clientKeys.loanStatus });
      }

      // `snapshot` is the synthetic "connected" frame sent on every (re)connect;
      // it carries no notification content, so don't fetch or toast on it.
      if (event === "snapshot") return;

      if (event === "notification" && push.notification_id) {
        // Toast from the frame itself so delivery does not depend on a
        // follow-up list fetch; the ref prevents the same id being shown again.
        enqueueToasts([
          {
            id: push.notification_id,
            type: push.notification_type ?? "system",
            title: push.title ?? "",
            message: push.message ?? "",
            created_at: push.created_at ?? new Date().toISOString(),
            is_read: false,
          },
        ]);
      }

      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(flushNotifications, 400);
    });

    return () => {
      unsubscribe();
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [queryClient]);

  const fetchAvailableSlots = useCallback(
    async (date: string, brokerId?: string) => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: clientKeys.availableSlots(date, brokerId),
          queryFn: () => bookingsApi.availableSlots(date, brokerId),
          staleTime: 30_000,
        });
        setAvailableSlots(data.available_slots);
      } catch (error) {
        console.error("Failed to fetch available slots:", error);
        setAvailableSlots([]);
      }
    },
    [queryClient],
  );

  const handleNewBooking = useCallback(
    async (dateStr: string, timeStr: string, typeStr: string, platformStr: string) => {
      const slot_time = toISOSlotTime(dateStr, timeStr);
      await bookingsApi.create({
        slot_time,
        consultation_type: typeStr,
        meeting_platform: platformStr,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.bookings }),
        queryClient.invalidateQueries({ queryKey: clientKeys.publishedSlots }),
      ]);
    },
    [queryClient],
  );

  const claimSlot = useCallback(
    async (slotId: string) => {
      await bookingsApi.create({ slot_id: slotId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.bookings }),
        queryClient.invalidateQueries({ queryKey: clientKeys.publishedSlots }),
      ]);
    },
    [queryClient],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      queryClient.setQueryData<NotificationApiResponse[]>(clientKeys.notifications, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      try {
        await notificationsApi.markRead(id);
      } catch (error) {
        console.error("Failed to mark notification read:", error);
        queryClient.invalidateQueries({ queryKey: clientKeys.notifications });
      }
    },
    [queryClient],
  );

  const markAllNotificationsRead = useCallback(async () => {
    queryClient.setQueryData<NotificationApiResponse[]>(clientKeys.notifications, (prev) =>
      prev?.map((n) => (n.is_read ? n : { ...n, is_read: true })),
    );
    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
      queryClient.invalidateQueries({ queryKey: clientKeys.notifications });
    }
  }, [queryClient]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // UI-generated feedback only. Backend notifications arrive via the API/SSE.
  const handleLogAction = useCallback((actionText: string) => {
    const toast: PortalNotification = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `local-${Date.now()}`,
      type: "system",
      title: actionText,
      message: actionText,
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setToasts((prev) => [toast, ...prev].slice(0, 4));
  }, []);

  const publishedSlots = useMemo(
    () => publishedSlotsQuery.data ?? [],
    [publishedSlotsQuery.data],
  );
  const loading =
    profileQuery.isPending ||
    bookingsQuery.isPending ||
    publishedSlotsQuery.isPending ||
    applicationsQuery.isPending;

  const dataValue = useMemo<ClientDataContextType>(
    () => ({
      client,
      lastLoanStatusUpdate,
      booking,
      bookings,
      publishedSlots,
      availableSlots,
      fetchAvailableSlots,
      handleNewBooking,
      claimSlot,
      handleLogAction,
      loading,
      selectedApplicationId,
      setSelectedApplicationId,
    }),
    [
      client,
      lastLoanStatusUpdate,
      booking,
      bookings,
      publishedSlots,
      availableSlots,
      fetchAvailableSlots,
      handleNewBooking,
      claimSlot,
      handleLogAction,
      loading,
      selectedApplicationId,
      setSelectedApplicationId,
    ],
  );

  const notificationsValue = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      dismissToast,
      notificationsLoading: notificationsQuery.isPending,
    }),
    [
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      dismissToast,
      notificationsQuery.isPending,
    ],
  );

  return (
    <ClientDataContext.Provider value={dataValue}>
      <NotificationsContext.Provider value={notificationsValue}>
        {children}
      </NotificationsContext.Provider>
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) {
    throw new Error("useClientData must be used within a ClientProvider");
  }
  return context;
}

export function useClientNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useClientNotifications must be used within a ClientProvider");
  }
  return context;
}
