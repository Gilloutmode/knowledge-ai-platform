import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  FileText,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  BarChart2,
} from "lucide-react";
import { Channel } from "../../services/api";
import {
  type AnalysisType,
  type AnalysisSortField,
  type SortOrder,
  type AnalysisFilterState,
  ANALYSIS_STORAGE_KEY,
  saveAnalysisFiltersToStorage,
} from "../../lib/analysisFilterUtils";

// Re-export for backwards compatibility
export type { AnalysisType, AnalysisSortField, SortOrder, AnalysisFilterState };
/* eslint-disable react-refresh/only-export-components */
export {
  defaultAnalysisFilters,
  saveAnalysisFiltersToStorage,
  loadAnalysisFiltersFromStorage,
} from "../../lib/analysisFilterUtils";
/* eslint-enable react-refresh/only-export-components */

interface AnalysisFiltersProps {
  channels: Channel[];
  filters: AnalysisFilterState;
  onFilterChange: (filters: AnalysisFilterState) => void;
  onReset: () => void;
  analysisCount?: number;
  filteredCount?: number;
}

const typeOptions: { value: AnalysisType; label: string; icon: string }[] = [
  { value: "all", label: "Tous les types", icon: "📊" },
  { value: "transcript", label: "Transcription", icon: "📝" },
  { value: "summary_short", label: "Résumé court", icon: "📋" },
  { value: "summary_detailed", label: "Résumé détaillé", icon: "📖" },
  { value: "lesson_card", label: "Fiche de cours", icon: "🎓" },
  { value: "actions", label: "Actions", icon: "✅" },
  { value: "flashcards", label: "Flashcards", icon: "🃏" },
];

const sortOptions: { field: AnalysisSortField; label: string }[] = [
  { field: "created_at", label: "Date de création" },
  { field: "type", label: "Type d'analyse" },
  { field: "video_title", label: "Titre de la vidéo" },
];

export const AnalysisFilters: React.FC<AnalysisFiltersProps> = ({
  channels,
  filters,
  onFilterChange,
  onReset,
  analysisCount = 0,
  filteredCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const hasActiveFilters =
    filters.channelId !== null ||
    filters.videoId !== null ||
    filters.type !== "all" ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null;

  const activeFilterCount = [
    filters.channelId !== null,
    filters.videoId !== null,
    filters.type !== "all",
    filters.dateRange.from !== null || filters.dateRange.to !== null,
  ].filter(Boolean).length;

  const updateFilter = useCallback(
    <K extends keyof AnalysisFilterState>(
      key: K,
      value: AnalysisFilterState[K],
    ) => {
      const newFilters = { ...filters, [key]: value };
      onFilterChange(newFilters);
      saveAnalysisFiltersToStorage(newFilters);
    },
    [filters, onFilterChange],
  );

  const handleReset = () => {
    onReset();
    localStorage.removeItem(ANALYSIS_STORAGE_KEY);
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openDropdown &&
        !(e.target as HTMLElement).closest(".filter-dropdown")
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const DropdownButton: React.FC<{
    id: string;
    label: string;
    value: string;
    icon: React.ReactNode;
    isActive: boolean;
  }> = ({ id, label, value, icon, isActive }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenDropdown(openDropdown === id ? null : id);
      }}
      className={`filter-dropdown flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? "bg-lime/20 dark:text-lime text-lime-dark border border-lime/30"
          : "dark:bg-dark-700 bg-light-200 dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-300 border border-transparent"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}:</span>
      <span className="truncate max-w-[120px]">{value}</span>
      <ChevronDown
        size={14}
        className={`transition-transform ${openDropdown === id ? "rotate-180" : ""}`}
      />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            hasActiveFilters
              ? "bg-lime text-black"
              : "dark:bg-dark-700 bg-light-200 dark:text-white text-gray-700 dark:hover:bg-dark-600 hover:bg-light-300"
          }`}
        >
          <SlidersHorizontal size={16} />
          Filtres
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/20 text-xs">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Quick Type Filter Pills */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {typeOptions.slice(0, 4).map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter("type", option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filters.type === option.value
                  ? "bg-lime text-black"
                  : "dark:bg-dark-700 bg-light-200 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
              }`}
            >
              <span>{option.icon}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Sort Dropdown */}
        <div className="relative filter-dropdown ml-auto">
          <DropdownButton
            id="sort"
            label="Trier"
            value={
              sortOptions.find((o) => o.field === filters.sortField)?.label ||
              ""
            }
            icon={<BarChart2 size={14} />}
            isActive={false}
          />
          <AnimatePresence>
            {openDropdown === "sort" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 w-56 dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.field}
                    onClick={() => {
                      updateFilter("sortField", option.field);
                      setOpenDropdown(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                  >
                    {option.label}
                    {filters.sortField === option.field && (
                      <Check
                        size={14}
                        className="dark:text-lime text-lime-dark"
                      />
                    )}
                  </button>
                ))}
                <div className="border-t dark:border-dark-border border-light-border">
                  <button
                    onClick={() => {
                      updateFilter(
                        "sortOrder",
                        filters.sortOrder === "asc" ? "desc" : "asc",
                      );
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                  >
                    Ordre:{" "}
                    {filters.sortOrder === "asc" ? "Croissant" : "Décroissant"}
                    <span className="dark:text-lime text-lime-dark">
                      {filters.sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="text-sm dark:text-gray-400 text-gray-500">
          {hasActiveFilters ? (
            <span>
              {filteredCount} / {analysisCount} analyses
            </span>
          ) : (
            <span>{analysisCount} analyses</span>
          )}
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-all"
          >
            <RotateCcw size={14} />
            Réinitialiser
          </motion.button>
        )}
      </div>

      {/* Expanded Filters Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Channel Filter */}
                <div className="relative filter-dropdown">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    Chaîne
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(
                        openDropdown === "channel" ? null : "channel",
                      );
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm dark:hover:bg-dark-600 hover:bg-light-200 transition-colors"
                  >
                    <span className="truncate">
                      {filters.channelId
                        ? channels.find((c) => c.id === filters.channelId)
                            ?.name || "Sélectionner"
                        : "Toutes les chaînes"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === "channel" && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            updateFilter("channelId", null);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                        >
                          Toutes les chaînes
                          {filters.channelId === null && (
                            <Check
                              size={14}
                              className="dark:text-lime text-lime-dark"
                            />
                          )}
                        </button>
                        {channels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => {
                              updateFilter("channelId", channel.id);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                          >
                            <span className="truncate">{channel.name}</span>
                            {filters.channelId === channel.id && (
                              <Check
                                size={14}
                                className="dark:text-lime text-lime-dark flex-shrink-0"
                              />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Type Filter */}
                <div className="relative filter-dropdown">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    <FileText size={12} className="inline mr-1" />
                    Type d'analyse
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === "type" ? null : "type");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm dark:hover:bg-dark-600 hover:bg-light-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>
                        {
                          typeOptions.find((t) => t.value === filters.type)
                            ?.icon
                        }
                      </span>
                      {typeOptions.find((t) => t.value === filters.type)
                        ?.label || "Tous"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === "type" && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50"
                      >
                        {typeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateFilter("type", option.value);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              {option.label}
                            </span>
                            {filters.type === option.value && (
                              <Check
                                size={14}
                                className="dark:text-lime text-lime-dark"
                              />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    <Calendar size={12} className="inline mr-1" />
                    Période de création
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={
                        filters.dateRange.from?.toISOString().split("T")[0] ||
                        ""
                      }
                      onChange={(e) =>
                        updateFilter("dateRange", {
                          ...filters.dateRange,
                          from: e.target.value
                            ? new Date(e.target.value)
                            : null,
                        })
                      }
                      className="flex-1 px-2 py-2 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm border-none focus:ring-1 focus:ring-lime"
                    />
                    <input
                      type="date"
                      value={
                        filters.dateRange.to?.toISOString().split("T")[0] || ""
                      }
                      onChange={(e) =>
                        updateFilter("dateRange", {
                          ...filters.dateRange,
                          to: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="flex-1 px-2 py-2 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm border-none focus:ring-1 focus:ring-lime"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filters Tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-3 border-t dark:border-dark-border border-light-border">
                  {filters.channelId && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-lime/20 dark:text-lime text-lime-dark text-xs rounded-full">
                      {channels.find((c) => c.id === filters.channelId)?.name}
                      <button
                        onClick={() => updateFilter("channelId", null)}
                        className="dark:hover:text-white hover:text-lime-dark-hover"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.type !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan/20 dark:text-cyan text-cyan-dark text-xs rounded-full">
                      {typeOptions.find((t) => t.value === filters.type)?.icon}{" "}
                      {typeOptions.find((t) => t.value === filters.type)?.label}
                      <button
                        onClick={() => updateFilter("type", "all")}
                        className="dark:hover:text-white hover:text-cyan-dark-hover"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(filters.dateRange.from || filters.dateRange.to) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                      {filters.dateRange.from?.toLocaleDateString("fr-FR") ||
                        "..."}{" "}
                      -{" "}
                      {filters.dateRange.to?.toLocaleDateString("fr-FR") ||
                        "..."}
                      <button
                        onClick={() =>
                          updateFilter("dateRange", { from: null, to: null })
                        }
                        className="hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisFilters;
