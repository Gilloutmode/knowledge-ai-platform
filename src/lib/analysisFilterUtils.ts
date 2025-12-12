/**
 * Analysis filter utility functions and types
 * Extracted for clean separation of concerns
 */

export type AnalysisType =
  | "all"
  | "transcript"
  | "summary_short"
  | "summary_detailed"
  | "lesson_card"
  | "actions"
  | "flashcards";

export type AnalysisSortField = "created_at" | "type" | "video_title";
export type SortOrder = "asc" | "desc";

export interface AnalysisFilterState {
  channelId: string | null;
  videoId: string | null;
  type: AnalysisType;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  sortField: AnalysisSortField;
  sortOrder: SortOrder;
}

export const ANALYSIS_STORAGE_KEY = "youtube-knowledge-analysis-filters";

export const defaultAnalysisFilters: AnalysisFilterState = {
  channelId: null,
  videoId: null,
  type: "all",
  dateRange: { from: null, to: null },
  sortField: "created_at",
  sortOrder: "desc",
};

export const saveAnalysisFiltersToStorage = (
  filters: AnalysisFilterState,
): void => {
  try {
    const serialized = JSON.stringify({
      ...filters,
      dateRange: {
        from: filters.dateRange.from?.toISOString() || null,
        to: filters.dateRange.to?.toISOString() || null,
      },
    });
    localStorage.setItem(ANALYSIS_STORAGE_KEY, serialized);
  } catch {
    console.error("Failed to save analysis filters");
  }
};

export const loadAnalysisFiltersFromStorage =
  (): AnalysisFilterState | null => {
    try {
      const stored = localStorage.getItem(ANALYSIS_STORAGE_KEY);
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
