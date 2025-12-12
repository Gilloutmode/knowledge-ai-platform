/**
 * API Service - Frontend communication with backend
 * Includes retry logic and robust error handling
 */

const API_BASE = "/api";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Types for API responses
export interface ChannelPreview {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  subscribers: string;
  subscriberCount: number;
  videoCount: number;
  youtubeChannelId: string;
  identifierType: "id" | "handle" | "custom";
}

export interface Channel {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  video_count: number;
  niche: string | null;
  bio_profile: Record<string, unknown> | null;
  last_video_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  duration: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_analyzed: boolean;
  created_at: string;
}

export interface Analysis {
  id: string;
  video_id: string;
  type: string;
  language?: string; // 'fr' | 'en' - defaults to 'fr' if not set
  content: string;
  model_used: string;
  created_at: string;
  metadata?: {
    model?: string;
    version?: string;
    isMultimodal?: boolean;
    fellBackToFlash?: boolean;
    originalModel?: string;
    generated_at?: string;
  };
}

/**
 * Custom API Error with status code and retry information
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public isRetryable: boolean = false,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000;
  }
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay,
  );
  // Add jitter (±20%)
  return delay * (0.8 + Math.random() * 0.4);
}

/**
 * Check if error is retryable
 */
function isRetryableError(status: number): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

/**
 * Get user-friendly error message for status codes
 */
function getErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "Please sign in to continue.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    408: "Request timed out. Please try again.",
    429: "Too many requests. Please wait a moment.",
    500: "Server error. Please try again later.",
    502: "Service temporarily unavailable.",
    503: "Service is under maintenance.",
    504: "Request timed out. Please try again.",
  };
  return messages[status] || "An error occurred. Please try again.";
}

/**
 * Core request function with retry logic
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "5",
        10,
      );
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount, retryAfter);
        console.warn(
          `Rate limited. Retrying in ${Math.round(delay / 1000)}s...`,
        );
        await sleep(delay);
        return request<T>(endpoint, options, retryCount + 1);
      }
      throw new ApiError(
        429,
        "Too many requests. Please try again later.",
        false,
        retryAfter,
      );
    }

    // Parse response
    let data: T & { error?: string };
    try {
      data = await response.json();
    } catch {
      // Handle empty responses
      if (response.ok) {
        return {} as T;
      }
      throw new ApiError(response.status, "Invalid response from server");
    }

    // Handle errors
    if (!response.ok) {
      const isRetryable = isRetryableError(response.status);

      // Retry if possible
      if (isRetryable && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.warn(
          `Request failed with ${response.status}. Retrying in ${Math.round(delay / 1000)}s...`,
        );
        await sleep(delay);
        return request<T>(endpoint, options, retryCount + 1);
      }

      throw new ApiError(
        response.status,
        data?.error || getErrorMessage(response.status),
        isRetryable,
      );
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.warn(
          `Network error. Retrying in ${Math.round(delay / 1000)}s...`,
        );
        await sleep(delay);
        return request<T>(endpoint, options, retryCount + 1);
      }
      throw new ApiError(
        0,
        "Network error. Please check your connection.",
        true,
      );
    }

    // Re-throw ApiErrors
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle unexpected errors
    throw new ApiError(
      500,
      error instanceof Error ? error.message : "An unexpected error occurred",
    );
  }
}

// ============================================
// Channels API
// ============================================
export const channelsApi = {
  preview: async (youtubeUrl: string): Promise<ChannelPreview> => {
    const data = await request<{ channel: ChannelPreview }>(
      "/channels/preview",
      {
        method: "POST",
        body: JSON.stringify({ youtube_url: youtubeUrl }),
      },
    );
    return data.channel;
  },

  add: async (youtubeUrl: string): Promise<Channel> => {
    const data = await request<{ channel: Channel; message: string }>(
      "/channels",
      {
        method: "POST",
        body: JSON.stringify({ youtube_url: youtubeUrl }),
      },
    );
    return data.channel;
  },

  list: async (signal?: AbortSignal): Promise<Channel[]> => {
    const data = await request<{ channels: Channel[] }>("/channels", {
      signal,
    });
    return data.channels;
  },

  get: async (id: string, signal?: AbortSignal): Promise<Channel> => {
    const data = await request<{ channel: Channel }>(`/channels/${id}`, {
      signal,
    });
    return data.channel;
  },

  delete: async (id: string): Promise<void> => {
    await request(`/channels/${id}`, { method: "DELETE" });
  },

  refresh: async (id: string): Promise<void> => {
    await request(`/channels/${id}/refresh`, { method: "POST" });
  },

  refreshVideos: async (
    id: string,
  ): Promise<{ message: string; updated: number; total: number }> => {
    const data = await request<{
      message: string;
      updated: number;
      total: number;
    }>(`/channels/${id}/refresh-videos`, { method: "POST" });
    return data;
  },
};

// ============================================
// Videos API
// ============================================
export interface VideosResponse {
  videos: Video[];
  total: number;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  search?: string;
  channelId?: string;
  signal?: AbortSignal;
}

export const videosApi = {
  listByChannel: async (
    channelId: string,
    params?: PaginationParams,
  ): Promise<VideosResponse> => {
    const queryParams = new URLSearchParams({ channelId });
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    if (params?.search) queryParams.set("search", params.search);

    const data = await request<VideosResponse>(
      `/videos?${queryParams.toString()}`,
      { signal: params?.signal },
    );
    return data;
  },

  list: async (params?: PaginationParams): Promise<VideosResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    if (params?.search) queryParams.set("search", params.search);
    if (params?.channelId) queryParams.set("channelId", params.channelId);

    const query = queryParams.toString();
    const data = await request<VideosResponse>(
      query ? `/videos?${query}` : "/videos",
      { signal: params?.signal },
    );
    return data;
  },

  get: async (id: string): Promise<Video> => {
    const data = await request<{ video: Video }>(`/videos/${id}`);
    return data.video;
  },

  analyze: async (
    id: string,
    types: string[],
    language: "fr" | "en" = "fr",
  ): Promise<void> => {
    await request(`/videos/${id}/analyze`, {
      method: "POST",
      body: JSON.stringify({ types, language }),
    });
  },
};

// ============================================
// Analyses API
// ============================================
export interface AnalysisWithVideo extends Analysis {
  videos?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    youtube_video_id: string;
    channels?: {
      id: string;
      name: string;
      thumbnail_url: string | null;
    };
  };
}

export interface AnalysesResponse {
  analyses: AnalysisWithVideo[];
  total: number;
  hasMore: boolean;
}

export const analysesApi = {
  list: async (params?: {
    type?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }): Promise<AnalysesResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type && params.type !== "all")
      queryParams.set("type", params.type);
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));

    const query = queryParams.toString();
    const data = await request<AnalysesResponse>(
      query ? `/analyses?${query}` : "/analyses",
      { signal: params?.signal },
    );
    return data;
  },

  listByVideo: async (videoId: string): Promise<Analysis[]> => {
    const data = await request<{ analyses: Analysis[] }>(
      `/analyses?videoId=${videoId}`,
    );
    return data.analyses;
  },

  get: async (id: string): Promise<AnalysisWithVideo> => {
    const data = await request<{ analysis: AnalysisWithVideo }>(
      `/analyses/${id}`,
    );
    return data.analysis;
  },
};

// ============================================
// Notifications API
// ============================================
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: async (unreadOnly = false): Promise<Notification[]> => {
    const url = unreadOnly ? "/notifications?unread=true" : "/notifications";
    const data = await request<{ notifications: Notification[] }>(url);
    return data.notifications;
  },

  markRead: async (id: string): Promise<void> => {
    await request(`/notifications/${id}/read`, { method: "POST" });
  },

  markAllRead: async (): Promise<void> => {
    await request("/notifications/read-all", { method: "POST" });
  },
};

// ============================================
// Search API
// ============================================
export interface SearchChannel {
  id: string;
  name: string;
  thumbnail_url: string | null;
  video_count: number;
  subscriber_count: number;
  niche: string | null;
}

export interface SearchVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel_id: string;
  youtube_video_id: string;
}

export interface SearchResults {
  channels: SearchChannel[];
  videos: SearchVideo[];
}

export const searchApi = {
  global: async (query: string): Promise<SearchResults> => {
    if (!query || query.length < 2) {
      return { channels: [], videos: [] };
    }
    const data = await request<SearchResults>(
      `/search?q=${encodeURIComponent(query)}`,
    );
    return data;
  },
};
