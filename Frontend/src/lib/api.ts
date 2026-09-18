const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

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
        document.cookie = "user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.replace("/login");
      }
    } catch {
      if (body.length < 500) msg = body;
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
  role: "client" | "broker" | "loan_processing";
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
  loan_amount?: string;
  goal?: string;
}

export interface LoginResponse {
  user: AuthUser;
  access?: string;
  access_expiration?: string;
  refresh_expiration?: string;
  asana_profile?: AsanaProfile | null;
  otp_required?: boolean;
  otp_expires_in?: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login/", { method: "POST", json: { email, password } }),

  me: () => request<AuthUser>("/api/auth/user/"),
};

/** Instant OTP lives for 2 minutes (backend: OTP_LOGIN_EXPIRY). */
export const OTP_LOGIN_TTL = 120;

/** Backend 403 detail emitted by IsOtpVerified for unverified sessions. */
export const OTP_REQUIRED_DETAIL = "OTP verification required.";

export interface OtpVerifyResponse {
  message: string;
  verified: boolean;
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
};

export interface UserProfileResponse {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
}

export const usersApi = {
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
};

export function getRoleRedirect(role: AuthUser["role"]): string {
  if (role === "client") return "/client";
  if (role === "broker") return "/broker";
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

export interface AIChatResponse {
  answer: string;
  sources: string[];
}

export const aiApi = {
  chat: (question: string, domainFilter?: string, topK?: number) =>
    request<AIChatResponse>("/api/ai/chat/", {
      method: "POST",
      json: {
        question,
        domain_filter: domainFilter,
        top_k: topK,
      },
    }),
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
