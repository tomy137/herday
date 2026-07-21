import { Capacitor } from '@capacitor/core';

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_URL_NATIVE || 'http://localhost:8000/api')
  : (import.meta.env.VITE_API_URL || '/api');

const IS_NATIVE = Capacitor.isNativePlatform();
const ACCESS_KEY = 'herday.access_token';
const REFRESH_KEY = 'herday.refresh_token';

// Native (Capacitor WKWebView) can't rely on cross-origin cookies, so we store
// tokens client-side and send them via Authorization header.
export const tokenStorage = {
  get access(): string | null {
    return IS_NATIVE ? localStorage.getItem(ACCESS_KEY) : null;
  },
  get refresh(): string | null {
    return IS_NATIVE ? localStorage.getItem(REFRESH_KEY) : null;
  },
  set(access: string, refresh: string | null) {
    if (!IS_NATIVE) return;
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (!IS_NATIVE) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

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
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  const access = tokenStorage.access;
  if (access && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${access}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...rest,
    headers: mergedHeaders,
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
      const refreshBody = tokenStorage.refresh
        ? JSON.stringify({ refresh_token: tokenStorage.refresh })
        : undefined;
      const tokens = await rawFetch<TokenResponse>('/auth/refresh', {
        method: 'POST',
        body: refreshBody,
      });
      tokenStorage.set(tokens.access_token, tokens.refresh_token ?? tokenStorage.refresh);
    } catch {
      isRefreshing = false;
      tokenStorage.clear();
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
    verify: async (token: string, email: string) => {
      const res = await request<TokenResponse>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      });
      tokenStorage.set(res.access_token, res.refresh_token ?? null);
      return res;
    },
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        tokenStorage.clear();
      }
    },
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
  journal: {
    today: () => request<JournalEntry>('/journal/today'),
    get: (date: string) => request<JournalEntry>(`/journal/${date}`),
    upsert: (date: string, draft: JournalDraft) =>
      request<JournalEntry>(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(draft) }),
    list: (offset = 0, limit = 50) =>
      request<{ items: JournalEntry[]; total: number }>(`/journal?offset=${offset}&limit=${limit}`),
  },
  echoes: {
    current: () => request<EchoAggregate>('/echoes/current'),
    forParent: (parent: string) => request<EchoAggregate>(`/echoes/${parent}`),
  },
  users: {
    me: () => request<User>('/users/me'),
    update: (data: { locale?: string; transparency_status?: TransparencyStatus }) =>
      request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    delete: () => request('/users/me', { method: 'DELETE' }),
  },
  calendar: {
    get: () => request<CalendarSubscription>('/calendar/subscription'),
    enable: () => request<CalendarSubscription>('/calendar/subscription/enable', { method: 'POST' }),
    rotate: () => request<CalendarSubscription>('/calendar/subscription/rotate', { method: 'POST' }),
    setLabels: (labels_mode: CalendarLabelsMode) =>
      request<CalendarSubscription>('/calendar/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ labels_mode }),
      }),
    disable: () => request<CalendarSubscription>('/calendar/subscription', { method: 'DELETE' }),
  },
};

// Types
export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
}

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
  phase_ends_in: number | null;
  tips: string[];
  parent_phase: string | null;
}

export interface CalendarDay {
  date: string;
  phase: string | null;
  confidence: number;
  events: string[];
  day_in_cycle: number | null;
  parent_phase: string | null;
  has_journal: boolean;
}

export type TransparencyStatus = 'not_yet' | 'told_soon' | 'told_already';

export type CalendarLabelsMode = 'explicit' | 'discreet';

export interface CalendarSubscription {
  enabled: boolean;
  labels_mode: CalendarLabelsMode;
  feed_url: string | null;
  webcal_url: string | null;
}

export interface User {
  id: string;
  email: string;
  locale: string;
  transparency_status: TransparencyStatus;
  transparency_accepted_at: string | null;
  created_at: string;
}

export interface JournalDraft {
  pastilles: string[];
  free_text: string | null;
  helpful: string | null;
  not_helpful: string | null;
}

export interface JournalEntry extends JournalDraft {
  entry_date: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface EchoOccurrence {
  cycle_start: string;
  day_from: number;
  day_to: number;
  note: string | null;
}

export interface FrequencyItem {
  pastille: string;
  count: number;
  total: number;
}

export interface EchoAggregate {
  parent_phase: string;
  sub_phases: string[];
  history: EchoOccurrence[];
  helpful: string[];
  not_helpful: string[];
  frequent: FrequencyItem[];
}

export { ApiError };
