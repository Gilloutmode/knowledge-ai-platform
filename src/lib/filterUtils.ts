/**
 * Filter utility functions
 * Extracted from component files for clean separation of concerns
 */

export type SortOption =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"
  | "views_desc"
  | "views_asc";

export type DateRange = "all" | "today" | "week" | "month" | "year";

export interface FilterState {
  search: string;
  channelId: string | null;
  dateRange: DateRange;
  sortBy: SortOption;
}

/**
 * Filter items by date range
 */
export function filterByDateRange<
  T extends { published_at?: string; created_at?: string },
>(
  items: T[],
  dateRange: DateRange,
  dateField: "published_at" | "created_at" = "published_at",
): T[] {
  if (dateRange === "all") return items;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getStartDate = (): Date => {
    switch (dateRange) {
      case "today":
        return startOfDay;
      case "week":
        return new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
      case "year":
        return new Date(startOfDay.getFullYear(), 0, 1);
      default:
        return new Date(0);
    }
  };

  const startDate = getStartDate();

  return items.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;
    return new Date(dateValue) >= startDate;
  });
}

/**
 * Sort items by various fields
 */
export function sortItems<T>(
  items: T[],
  sortBy: SortOption,
  getters: {
    date?: (item: T) => string;
    title?: (item: T) => string;
    views?: (item: T) => number;
  },
): T[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "date_desc":
        return getters.date
          ? new Date(getters.date(b)).getTime() -
              new Date(getters.date(a)).getTime()
          : 0;
      case "date_asc":
        return getters.date
          ? new Date(getters.date(a)).getTime() -
              new Date(getters.date(b)).getTime()
          : 0;
      case "title_asc":
        return getters.title
          ? getters.title(a).localeCompare(getters.title(b), "fr")
          : 0;
      case "title_desc":
        return getters.title
          ? getters.title(b).localeCompare(getters.title(a), "fr")
          : 0;
      case "views_desc":
        return getters.views ? getters.views(b) - getters.views(a) : 0;
      case "views_asc":
        return getters.views ? getters.views(a) - getters.views(b) : 0;
      default:
        return 0;
    }
  });

  return sorted;
}
