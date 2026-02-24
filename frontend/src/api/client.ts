const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let isRefreshing = false;

async function rawFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await rawFetch<T>(path, options);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    // Don't try to refresh auth endpoints
    if (path.startsWith('/auth/')) throw err;

    // Avoid concurrent refresh attempts
    if (isRefreshing) throw err;

    isRefreshing = true;
    try {
      await rawFetch('/auth/refresh', { method: 'POST' });
    } catch {
      isRefreshing = false;
      throw new ApiError(401, 'Not authenticated');
    }
    isRefreshing = false;

    // Retry original request once
    return rawFetch<T>(path, options);
  }
}

export const api = {
  auth: {
    sendMagicLink: (email: string) =>
      request('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
    verify: (token: string, email: string) =>
      request('/auth/verify', { method: 'POST', body: JSON.stringify({ token, email }) }),
    logout: () =>
      request('/auth/logout', { method: 'POST' }),
  },
  events: {
    list: (skip = 0, limit = 50) =>
      request<{ items: Event[]; total: number }>(`/events?skip=${skip}&limit=${limit}`),
    create: (data: { event_type: string; event_date: string; metadata?: Record<string, unknown>; confidence?: number }) =>
      request<Event>('/events', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/events/${id}`, { method: 'DELETE' }),
  },
  cycles: {
    list: () => request<Cycle[]>('/cycles'),
  },
  phases: {
    today: () => request<PhaseInfo>('/phases/today'),
    calendar: (month: string) => request<{ days: CalendarDay[] }>(`/phases/calendar?month=${month}`),
  },
  users: {
    me: () => request<User>('/users/me'),
    update: (data: { partner_name?: string; locale?: string }) =>
      request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    delete: () => request('/users/me', { method: 'DELETE' }),
  },
};

// Types
export interface Event {
  id: string;
  event_type: string;
  event_date: string;
  metadata: Record<string, unknown> | null;
  confidence: number;
  created_at: string;
}

export interface Cycle {
  id: string;
  start_date: string;
  end_date: string | null;
  period_duration: number | null;
  cycle_length: number | null;
  source: string;
  confidence: number;
  created_at: string;
}

export interface PhaseInfo {
  phase: string;
  day_in_cycle: number;
  cycle_length: number;
  confidence: number;
  system_state: string;
  next_period_in: number | null;
  tips: string[];
}

export interface CalendarDay {
  date: string;
  phase: string | null;
  confidence: number;
  events: string[];
}

export interface User {
  id: string;
  email: string;
  partner_name: string | null;
  locale: string;
  created_at: string;
}

export { ApiError };
