import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
  ChevronDown,
  X,
  Youtube,
} from "lucide-react";
import { Channel, channelsApi } from "../services/api";
import type { SortOption, DateRange, FilterState } from "../lib/filterUtils";

// Re-export types for backwards compatibility
export type { SortOption, DateRange, FilterState } from "../lib/filterUtils";
// Re-export utility functions - eslint-disable needed as this is intentional for API stability
// eslint-disable-next-line react-refresh/only-export-components
export { filterByDateRange, sortItems } from "../lib/filterUtils";

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showChannelFilter?: boolean;
  showViewsSort?: boolean;
  placeholder?: string;
}

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "all", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
];

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "date_desc", label: "Plus récent", icon: <SortDesc size={14} /> },
  { value: "date_asc", label: "Plus ancien", icon: <SortAsc size={14} /> },
  { value: "title_asc", label: "Titre A-Z", icon: <SortAsc size={14} /> },
  { value: "title_desc", label: "Titre Z-A", icon: <SortDesc size={14} /> },
  { value: "views_desc", label: "Plus vues", icon: <SortDesc size={14} /> },
  { value: "views_asc", label: "Moins vues", icon: <SortAsc size={14} /> },
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  showChannelFilter = true,
  showViewsSort = true,
  placeholder = "Rechercher...",
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);

  const channelRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Fetch channels for filter
  useEffect(() => {
    if (showChannelFilter) {
      const fetchChannels = async () => {
        try {
          const channels = await channelsApi.list();
          setChannels(channels);
        } catch (err) {
          console.error("Error fetching channels:", err);
        }
      };
      fetchChannels();
    }
  }, [showChannelFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onFiltersChange]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        channelRef.current &&
        !channelRef.current.contains(e.target as Node)
      ) {
        setShowChannelDropdown(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedChannel = channels.find((c) => c.id === filters.channelId);
  const selectedDateRange = DATE_RANGES.find(
    (d) => d.value === filters.dateRange,
  );
  const selectedSort = SORT_OPTIONS.find((s) => s.value === filters.sortBy);

  const filteredSortOptions = showViewsSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((s) => !s.value.includes("views"));

  const hasActiveFilters =
    filters.channelId ||
    filters.dateRange !== "all" ||
    filters.sortBy !== "date_desc";

  const clearAllFilters = () => {
    setLocalSearch("");
    onFiltersChange({
      search: "",
      channelId: null,
      dateRange: "all",
      sortBy: "date_desc",
    });
  };

  return (
    <div className="space-y-3">
      {/* Main Search Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[250px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder={placeholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="input pl-10 pr-10"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-light-300 dark:hover:bg-dark-600 rounded"
            >
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Channel Filter */}
          {showChannelFilter && (
            <div ref={channelRef} className="relative">
              <button
                onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  filters.channelId
                    ? "bg-lime/10 border-lime/30 text-lime-dark dark:text-lime"
                    : "dark:bg-dark-700 bg-white dark:border-dark-border border-light-border dark:text-gray-300 text-gray-600 hover:border-lime/30"
                }`}
              >
                <Youtube size={16} />
                <span className="text-sm font-medium max-w-[120px] truncate">
                  {selectedChannel?.name || "Chaîne"}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showChannelDropdown ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showChannelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          onFiltersChange({ ...filters, channelId: null });
                          setShowChannelDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          !filters.channelId
                            ? "bg-lime/10 dark:text-lime text-lime-dark"
                            : "dark:hover:bg-dark-700 hover:bg-light-200 dark:text-gray-300 text-gray-600"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-light-300 dark:bg-dark-600 flex items-center justify-center">
                          <Youtube
                            size={16}
                            className="dark:text-gray-400 text-gray-500"
                          />
                        </div>
                        <span className="font-medium">Toutes les chaînes</span>
                      </button>

                      {channels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            onFiltersChange({
                              ...filters,
                              channelId: channel.id,
                            });
                            setShowChannelDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            filters.channelId === channel.id
                              ? "bg-lime/10 dark:text-lime text-lime-dark"
                              : "dark:hover:bg-dark-700 hover:bg-light-200 dark:text-gray-300 text-gray-600"
                          }`}
                        >
                          <img
                            src={channel.thumbnail_url || ""}
                            alt={channel.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/32/1a1a1a/666?text=YT";
                            }}
                          />
                          <span className="font-medium truncate">
                            {channel.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Date Range Filter */}
          <div ref={dateRef} className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                filters.dateRange !== "all"
                  ? "bg-cyan/10 border-cyan/30 text-cyan-dark dark:text-cyan"
                  : "dark:bg-dark-700 bg-white dark:border-dark-border border-light-border dark:text-gray-300 text-gray-600 hover:border-cyan/30"
              }`}
            >
              <Calendar size={16} />
              <span className="text-sm font-medium">
                {selectedDateRange?.label}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showDateDropdown ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showDateDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-48 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {DATE_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => {
                        onFiltersChange({ ...filters, dateRange: range.value });
                        setShowDateDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        filters.dateRange === range.value
                          ? "bg-cyan/10 dark:text-cyan text-cyan-dark"
                          : "dark:hover:bg-dark-700 hover:bg-light-200 dark:text-gray-300 text-gray-600"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Options */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                filters.sortBy !== "date_desc"
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                  : "dark:bg-dark-700 bg-white dark:border-dark-border border-light-border dark:text-gray-300 text-gray-600 hover:border-purple-500/30"
              }`}
            >
              {selectedSort?.icon}
              <span className="text-sm font-medium">{selectedSort?.label}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-44 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {filteredSortOptions.map((sort) => (
                    <button
                      key={sort.value}
                      onClick={() => {
                        onFiltersChange({ ...filters, sortBy: sort.value });
                        setShowSortDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                        filters.sortBy === sort.value
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "dark:hover:bg-dark-700 hover:bg-light-200 dark:text-gray-300 text-gray-600"
                      }`}
                    >
                      {sort.icon}
                      {sort.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-1">
            <Filter size={12} />
            Filtres actifs:
          </span>

          {filters.channelId && selectedChannel && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-lime/10 text-lime-dark dark:text-lime rounded-full text-xs">
              <img
                src={selectedChannel.thumbnail_url || ""}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              {selectedChannel.name}
              <button
                onClick={() => onFiltersChange({ ...filters, channelId: null })}
                className="ml-1 hover:text-lime-dark/70 dark:hover:text-lime/70"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {filters.dateRange !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan/10 text-cyan-dark dark:text-cyan rounded-full text-xs">
              <Calendar size={12} />
              {selectedDateRange?.label}
              <button
                onClick={() =>
                  onFiltersChange({ ...filters, dateRange: "all" })
                }
                className="ml-1 hover:text-cyan-dark/70 dark:hover:text-cyan/70"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {filters.sortBy !== "date_desc" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs">
              {selectedSort?.icon}
              {selectedSort?.label}
              <button
                onClick={() =>
                  onFiltersChange({ ...filters, sortBy: "date_desc" })
                }
                className="ml-1 hover:text-purple-500/70"
              >
                <X size={12} />
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs dark:text-gray-400 text-gray-500 hover:text-red-400 dark:hover:text-red-400 transition-colors"
          >
            Tout effacer
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AdvancedFilters;
