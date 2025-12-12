/**
 * Video filter utility functions and types
 * Extracted for clean separation of concerns
 */

export type SortField =
  | "published_at"
  | "view_count"
  | "like_count"
  | "duration";
export type SortOrder = "asc" | "desc";
export type AnalysisStatus = "all" | "analyzed" | "pending" | "partial";

export interface VideoFilterState {
  channelId: string | null;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  minDuration: number | null; // in seconds
  maxDuration: number | null; // in seconds
  analysisStatus: AnalysisStatus;
  sortField: SortField;
  sortOrder: SortOrder;
}

export const VIDEO_STORAGE_KEY = "youtube-knowledge-video-filters";

export const defaultVideoFilters: VideoFilterState = {
  channelId: null,
  dateRange: { from: null, to: null },
  minDuration: null,
  maxDuration: null,
  analysisStatus: "all",
  sortField: "published_at",
  sortOrder: "desc",
};

export const saveFiltersToStorage = (filters: VideoFilterState): void => {
  try {
    const serialized = JSON.stringify({
      ...filters,
      dateRange: {
        from: filters.dateRange.from?.toISOString() || null,
        to: filters.dateRange.to?.toISOString() || null,
      },
    });
    localStorage.setItem(VIDEO_STORAGE_KEY, serialized);
  } catch {
    console.error("Failed to save filters");
  }
};

export const loadFiltersFromStorage = (): VideoFilterState | null => {
  try {
    const stored = localStorage.getItem(VIDEO_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      dateRange: {
        from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : null,
        to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : null,
      },
    };
  } catch {
    return null;
  }
};
