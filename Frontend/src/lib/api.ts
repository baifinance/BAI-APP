export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);

/**
 * Global event fired when the access token is rejected (401) while an active
 * session exists. The SessionExpiryModal listens for it to surface the
 * "Your session has been expired" notice, then logs the user out.
 */
export const SESSION_EXPIRED_EVENT = "bai:session-expired";

let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  json?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { json, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(json);
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const send = () =>
    fetch(`${API_BASE}${cleanEndpoint}`, {
      cache: "no-store",
      ...fetchOptions,
      headers,
      credentials: "include",
    });

  let res = await send();
  const isAuthEndpoint =
    cleanEndpoint === "/api/auth/login/" ||
    cleanEndpoint === "/api/auth/token/refresh/";

  if (res.status === 401 && !isAuthEndpoint && (await refreshAccessToken())) {
    res = await send();
  }

  if (!res.ok) {
    const body = await res.text();
    let msg = `Request failed (${res.status})`;
    try {
      const j = JSON.parse(body);
      // dj-rest-auth login returns {non_field_errors: [...]} on bad creds
      if (Array.isArray(j.non_field_errors) && j.non_field_errors.length) {
        msg = j.non_field_errors[0];
      } else if (j.detail) {
        msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } else if (j.error) {
        msg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
      } else if (j.message) {
        msg = j.message;
      } else if (j.email) {
        msg = Array.isArray(j.email) ? j.email[0] : String(j.email);
      } else if (j.password) {
        msg = Array.isArray(j.password) ? j.password[0] : String(j.password);
      } else {
        // fallback: first string value
        const first = Object.values(j).find((v) => typeof v === "string" || Array.isArray(v));
        if (Array.isArray(first) && typeof first[0] === "string") msg = first[0];
        else if (typeof first === "string") msg = first;
      }

      // Unverified 2FA session: the user holds a JWT but hasn't passed the login OTP.
      // Bounce to the login page so they can re-authenticate and complete the step.
      if (res.status === 403 && j.detail === OTP_REQUIRED_DETAIL) {
        window.location.replace("/login");
      }
    } catch {
      if (body.length < 500) msg = body;
    }

    // Access token rejected (401) with an active session → session is dead.
    // Skip on the login page so failed logins never trigger the expiry modal.
    // (The user-role cookie is now HttpOnly and unreadable here.)
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "client" | "broker" | "loan_processing" | "compliance";
  status: string;
  mfa_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AsanaProfile {
  fullname?: string;
  dob?: string;
  email?: string;
  address?: string;
  mobile?: string;
  visa_subclass?: string;
  visa_expiry?: string;
  visa?: string;
  loan_amount?: string;
  goal?: string;
  source?: string;
  inquiry?: string;
  loan_status?: string;
}

export interface LoginResponse {
  user: AuthUser;
  access?: string;
  access_expiration?: string;
  refresh_expiration?: string;
  otp_required?: boolean;
  otp_expires_in?: number;
  applications_sync_queued?: boolean;
}

export interface OtpVerifyResponse {
  message: string;
  verified: boolean;
  applications_sync_queued?: boolean;
}

export const authApi = {
  login: (email: string, password: string, turnstileToken?: string) =>
    request<LoginResponse>("/api/auth/login/", {
      method: "POST",
      json: turnstileToken
        ? { email, password, turnstile_token: turnstileToken }
        : { email, password },
    }),

  me: () => request<AuthUser>("/api/auth/user/"),

  logout: () => request<void>("/api/auth/logout/", { method: "POST" }),

  sendInvitation: (data: {
    email: string;
    role: "client" | "broker";
  }) =>
    request<{ message: string }>("/api/auth/invitations/send/", {
      method: "POST",
      json: data,
    }),
};

/** Instant OTP lives for 2 minutes (backend: OTP_LOGIN_EXPIRY). */
export const OTP_LOGIN_TTL = 120;

/** Backend 403 detail emitted by IsOtpVerified for unverified sessions. */
export const OTP_REQUIRED_DETAIL = "OTP verification required.";

export interface OtpVerifyResponse {
  message: string;
  verified: boolean;
}

export interface PasswordResetResponse {
  message: string;
}

export const otpApi = {
  send: (email: string, purpose = "login_2fa") =>
    request<{ detail: string }>("/api/otp/send/", {
      method: "POST",
      json: { email, purpose },
    }),

  verify: (email: string, code: string, purpose = "login_2fa") =>
    request<OtpVerifyResponse>("/api/otp/verify/", {
      method: "POST",
      json: { email, code, purpose },
    }),

  resetPassword: (
    email: string,
    code: string,
    password: string,
    passwordConfirm: string,
  ) =>
    request<PasswordResetResponse>("/api/otp/reset-password/", {
      method: "POST",
      json: {
        email,
        code,
        password,
        password_confirm: passwordConfirm,
      },
    }),
};

export interface UserProfileResponse {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  client_profile?: AsanaProfile | null;
}

export interface RegisteredUserApiItem {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  role: string;
  formatted_role?: string;
  status?: string;
  registered_date?: string;
  created_at?: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const usersApi = {
  /**
   * GET /api/users/
   * Fetches registered users from the database (paginated).
   */
  list: () => request<Paginated<RegisteredUserApiItem>>("/api/users/"),

  /**
   * GET /api/users/active/
   * Lists active users and their assigned roles (paginated).
   */
  activeList: () => request<Paginated<RegisteredUserApiItem>>("/api/users/active/"),

  /**
   * GET /api/users/profile/
   * Fetches the current user's profile with computed full_name, first_name, last_name, email, and role.
   */
  getProfile: () => request<UserProfileResponse>("/api/users/profile/"),

  /**
   * PATCH /api/users/profile/
   * Updates the current user's first_name and last_name.
   */
  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    request<UserProfileResponse>("/api/users/profile/", { method: "PATCH", json: data }),

  /**
   * POST /api/users/profile/mfa/enable/send/
   * Sends OTP to email for MFA enable
   */
  mfaEnableSend: () =>
    request<{ detail: string }>("/api/users/profile/mfa/enable/send/", { method: "POST" }),

  /**
   * POST /api/users/profile/mfa/enable/verify/
   * Verifies OTP and enables MFA
   */
  mfaEnableVerify: (code: string) =>
    request<{ message: string; mfa_enabled: boolean }>("/api/users/profile/mfa/enable/verify/", {
      method: "POST",
      json: { code },
    }),

  /**
   * POST /api/users/profile/mfa/disable/
   * Disables MFA with password confirmation
   */
  mfaDisable: (password: string) =>
    request<{ message: string; mfa_enabled: boolean }>("/api/users/profile/mfa/disable/", {
      method: "POST",
      json: { password },
    }),
};

export interface NotificationApiResponse {
    id: string;
    notification_type: string;
    title: string;
    message: string;
    related_object_type: string;
    related_object_id: string;
    is_read: boolean;
    created_at: string;
    read_at: string | null;
}

export interface NotificationPreference {
    push_enabled: boolean;
    email_critical_enabled: boolean;
    email_optional_enabled: boolean;
    updated_at: string;
}

export interface PushConfig {
    enabled: boolean;
    public_key: string;
}

export interface PushSubscriptionPayload {
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string;
}

export interface EmailPreferences {
    email?: string;
    push_enabled?: boolean;
    email_critical_enabled: boolean;
    email_optional_enabled: boolean;
}

export const notificationsApi = {
    list: (unreadOnly = false) =>
      request<NotificationApiResponse[]>(
        `/api/notifications/${unreadOnly ? "?unread=true" : ""}`,
      ),

    markRead: (id: string) =>
      request<NotificationApiResponse>(`/api/notifications/${id}/read/`, {
        method: "PATCH",
      }),

    markAllRead: () =>
      request<{ updated_count: number }>("/api/notifications/mark-all-read/", {
        method: "POST",
      }),

    getPreferences: () =>
      request<NotificationPreference>("/api/notifications/preferences/"),

    updatePreferences: (data: Partial<NotificationPreference>) =>
      request<NotificationPreference>("/api/notifications/preferences/", {
        method: "PATCH",
        json: data,
      }),

    getPushConfig: () =>
      request<PushConfig>("/api/notifications/push/config/"),

    subscribePush: (data: PushSubscriptionPayload) =>
      request<{ subscribed: boolean; subscription_id: string }>(
        "/api/notifications/push/subscribe/",
        { method: "POST", json: data },
      ),

    unsubscribePush: (endpoint: string) =>
      request<{ subscribed: boolean }>("/api/notifications/push/unsubscribe/", {
        method: "POST",
        json: { endpoint },
      }),

    sendTestPush: (endpoint?: string) =>
      request<{ sent: number }>("/api/notifications/push/test/", {
        method: "POST",
        json: endpoint ? { endpoint } : undefined,
      }),
};

export const emailPreferencesApi = {
    get: (token: string) =>
      request<EmailPreferences>(
        `/api/notifications/email/preferences/?token=${encodeURIComponent(token)}`,
      ),

    update: (token: string, scope: "all" | "critical" | "optional") =>
      request<EmailPreferences>("/api/notifications/email/preferences/", {
        method: "POST",
        json: { token, scope },
      }),
};


/**
 * Live notification stream via SSE.
 *
 * Uses fetch (not native EventSource) so credentials are sent exactly like
 * every other API call — EventSource's `withCredentials` is unreliable
 * cross-origin. Auto-reconnects with a short delay.
 */
export interface StreamPush {
  notification_id?: string;
  notification_type?: string | null;
  loan_status?: string;
  application_id?: string | null;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
}

export function subscribeToNotificationStream(
  onPush: (push: StreamPush, event: string) => void
): () => void {
  let cancelled = false;
  let stopped = false;
  let controller: AbortController | null = null;
  let retryTimer: number | undefined;
  let reconnectDelay = 3000;
  const MAX_RECONNECT_MS = 60_000;

  const connect = async () => {
    if (cancelled || stopped) return;
    controller = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/notifications/stream/`, {
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        if (res.status === 401) {
          // Access expired while the stream was open: refresh once, then reconnect.
          if (await refreshAccessToken()) {
            reconnectDelay = 1000;
          } else {
            stopped = true;
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
            }
          }
        } else if (res.status === 403) {
          // Reconnecting cannot fix a blocked or unverified session.
          stopped = true;
        } else if (res.status === 429) {
          // Back off when rate limited to prevent compounding 429 errors
          reconnectDelay = Math.max(reconnectDelay, 15_000);
        }
        throw new Error(`notification stream ${res.status}`);
      }

      reconnectDelay = 3000;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separator: number;
        while ((separator = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);

          let data = "";
          let event = "message";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trimStart();
          }
          if (data) {
            let payload: StreamPush = {};
            try {
              payload = JSON.parse(data);
            } catch {
              // Non-JSON frames are ignored; nothing to push.
            }
            onPush(payload, event);
          }
        }
      }
    } catch {
      // Connection dropped — fall through to the reconnect timer.
    } finally {
      controller = null;
      if (!cancelled && !stopped) {
        retryTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
      }
    }
  };

  connect();

  return () => {
    cancelled = true;
    controller?.abort();
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
  };
}

export function getRoleRedirect(role: AuthUser["role"]): string {
  if (role === "client") return "/client";
  if (role === "broker") return "/broker";
  if (role === "compliance") return "/compliance";
  return "/loan-processing";
}

export interface BookingApiResponse {
  id: string;
  broker_id: string;
  broker_name: string;
  broker_email: string | null;
  client_id: string;
  client_name: string;
  client_email: string | null;
  slot_time: string;
  consultation_type: string;
  meeting_platform: string;
  notes: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  date: string;
  broker_id: string;
  broker_name: string;
  available_slots: string[];
}

export interface PublishedSlot {
  id: string;
  broker_id: string;
  broker_name: string;
  slot_time: string;
  consultation_type: string;
  meeting_platform: string;
  created_at: string;
}

export const bookingsApi = {
  list: () => request<BookingApiResponse[]>("/api/bookings/"),

  create: (data: {
    slot_time?: string;
    slot_id?: string;
    consultation_type?: string;
    meeting_platform?: string;
    notes?: string;
    broker?: string;
  }) => request<BookingApiResponse>("/api/bookings/", { method: "POST", json: data }),

  availableSlots: (date: string, brokerId?: string) => {
    const params = new URLSearchParams({ date });
    if (brokerId) params.set("broker_id", brokerId);
    return request<AvailableSlot>(`/api/bookings/available-slots/?${params}`);
  },
};

export const slotsApi = {
  list: () => request<PublishedSlot[]>("/api/bookings/slots/"),

  create: (data: {
    slot_time: string;
    consultation_type?: string;
    meeting_platform?: string;
  }) => request<PublishedSlot>("/api/bookings/slots/", { method: "POST", json: data }),

  remove: (id: string) =>
    request<void>(`/api/bookings/slots/${id}/`, { method: "DELETE" }),
};

export interface LoanStatusHistoryEntry {
  status: string;
  changed_at: string;
}

export interface CurrentLoanStatusResponse {
  loan_status: string | null;
  status_history?: LoanStatusHistoryEntry[];
}

export interface LoanStatusUpdateResponse {
  message: string;
  task_gid: string;
  loan_status: string;
  section_gid: string;
}

export interface LoanApplication {
  id: string;
  asana_project_gid?: string | null;
  asana_project_name?: string | null;
  asana_task_gid?: string | null;
  asana_task_name?: string | null;
  amount?: number | null;
  status?: string;
  asana_status?: string | null;
  asana_status_history?: Record<string, string>;
  asana_created_at?: string | null;
  asana_synced_at?: string | null;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const loansApi = {
  getCurrentStatus: () =>
    request<CurrentLoanStatusResponse>("/api/loans/current-status/"),

  updateStatus: (email: string, loanStatus: string) =>
    request<LoanStatusUpdateResponse>("/api/loans/status/", {
      method: "PATCH",
      json: {
        email,
        loan_status: loanStatus,
      },
    }),

  listApplications: () =>
    request<LoanApplication[]>("/api/loans/applications/"),

  getApplication: (id: string) =>
    request<LoanApplication>(`/api/loans/applications/${id}/`),

  updateApplicationStatus: (id: string, loanStatus: string) =>
    request<{ application_id: string; message: string; loan_status: string }>(
      `/api/loans/applications/${id}/status/`,
      {
        method: "PATCH",
        json: { loan_status: loanStatus },
      }
    ),
};

export interface AIChatResponse {
  answer: string;
  sources: string[];
  conversation_id?: string;
}

export const aiApi = {
  chat: (question: string, conversationId?: string, domainFilter?: string, topK?: number) =>
    request<AIChatResponse>("/api/ai/chat/", {
      method: "POST",
      json: {
        question,
        conversation_id: conversationId,
        domain_filter: domainFilter,
        top_k: topK,
      },
    }),
  startSession: () =>
    request<{ conversation_id: string }>("/api/ai/chat/session/start/", { method: "POST", json: {} }),
  endSession: (conversationId: string, reason: "manual" | "idle") =>
    request<{ conversation_id: string; emailed: boolean; to?: string }>(
      "/api/ai/chat/session/end/",
      { method: "POST", json: { conversation_id: conversationId, reason } },
    ),
};

export function parseSlotTime(slotTime: string): { date: string; time: string } {
  const [date, timePart] = slotTime.split("T");
  if (!timePart) return { date, time: slotTime };
  const [hhmm] = timePart.split(":");
  let hours = parseInt(hhmm, 10) || 0;
  const minutes = timePart.split(":")[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return {
    date,
    time: `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`,
  };
}

export function toISOSlotTime(date: string, time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return `${date}T${time}:00Z`;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${date}T${String(hours).padStart(2, "0")}:${minutes}:00Z`;
}
