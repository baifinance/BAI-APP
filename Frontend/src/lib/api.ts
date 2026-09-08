const API_BASE = "http://localhost:8000";

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
    throw new Error(`API ${res.status}: ${body}`);
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

export interface LoginResponse {
  user: AuthUser;
  access?: string;
  access_expiration?: string;
  refresh_expiration?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login/", { method: "POST", json: { email, password } }),

  me: () => request<AuthUser>("/api/auth/user/"),
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
