/**
 * Typed API client for SnapDeliver backend.
 * All requests use NEXT_PUBLIC_API_URL as the base URL.
 */

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  return url.replace(/\/$/, "");
};

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, signal } = options;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    signal,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = response.ok ? await response.json() : null;
    const error = response.ok
      ? null
      : (await response.json().catch(() => ({ message: response.statusText })))
          .message || response.statusText;

    return { data, error, status: response.status };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred";
    return { data: null, error: message, status: 0 };
  }
}

// Event types for API responses
export interface EventData {
  id: string;
  name: string;
  date: string;
  expiry: string;
  pricing_tier: "FREE" | "STANDARD" | "PREMIUM";
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  name: string;
  date: string;
  expiry: string;
  pricing_tier: "FREE" | "STANDARD" | "PREMIUM";
}

export interface PhotoData {
  id: string;
  event_id: string;
  original_key: string;
  social_key: string | null;
  thumbnail_key: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FaceSearchResultData {
  id: string;
  photo_id: string;
  event_id: string;
  original_key: string;
  social_key: string | null;
  thumbnail_key: string | null;
  metadata_json: Record<string, unknown> | null;
  similarity: number;
}

export interface AnalyticsData {
  event_id: string;
  event_name: string;
  qr_scans: number;
  downloads: number;
  shares: number;
}

// API client methods
export const apiClient = {
  // Events
  events: {
    list: () => request<EventData[]>("/events"),
    get: (id: string) => request<EventData>(`/events/${id}`),
    create: (data: CreateEventData) =>
      request<EventData>("/events", { method: "POST", body: data }),
    update: (id: string, data: Partial<CreateEventData>) =>
      request<EventData>(`/events/${id}`, { method: "PATCH", body: data }),
    delete: (id: string) =>
      request<void>(`/events/${id}`, { method: "DELETE" }),
  },

  // Photos
  photos: {
    listByEvent: (eventId: string) =>
      request<PhotoData[]>(`/photos?event_id=${eventId}`),
    get: (id: string) => request<PhotoData>(`/photos/${id}`),
  },

  // Face Search
  faceSearch: {
    search: (embedding: number[], eventId?: string, threshold?: number) =>
      request<{ results: FaceSearchResultData[]; count: number }>(
        "/photos/face-search",
        {
          method: "POST",
          body: {
            embedding,
            event_id: eventId,
            match_threshold: threshold ?? 0.8,
            match_count: 10,
          },
        }
      ),
    extractEmbedding: (selfieBlob: Blob) => {
      const formData = new FormData();
      formData.append("selfie", selfieBlob);
      const baseUrl = getBaseUrl();
      return fetch(`${baseUrl}/photos/extract-embedding`, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error("Failed to extract face embedding");
        return res.json() as Promise<{ embedding: number[] }>;
      });
    },
  },

  // Analytics
  analytics: {
    getAll: () => request<AnalyticsData[]>("/analytics"),
    getByEvent: (eventId: string) =>
      request<AnalyticsData>(`/analytics/${eventId}`),
  },

  // Track actions
  track: {
    qrScan: (eventId: string) =>
      request<void>(`/analytics/${eventId}/qr-scan`, { method: "POST" }),
    download: (eventId: string, photoId: string) =>
      request<void>(`/analytics/${eventId}/download`, {
        method: "POST",
        body: { photo_id: photoId },
      }),
    share: (eventId: string, photoId: string) =>
      request<void>(`/analytics/${eventId}/share`, {
        method: "POST",
        body: { photo_id: photoId },
      }),
  },
};
