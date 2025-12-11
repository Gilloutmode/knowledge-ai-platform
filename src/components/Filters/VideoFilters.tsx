import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  Calendar,
  Clock,
  BarChart2,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Channel } from '../../services/api';

export type SortField = 'published_at' | 'view_count' | 'like_count' | 'duration';
export type SortOrder = 'asc' | 'desc';
export type AnalysisStatus = 'all' | 'analyzed' | 'pending' | 'partial';

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

interface VideoFiltersProps {
  channels: Channel[];
  filters: VideoFilterState;
  onFilterChange: (filters: VideoFilterState) => void;
  onReset: () => void;
  videoCount?: number;
  filteredCount?: number;
}

const STORAGE_KEY = 'youtube-knowledge-video-filters';

export const defaultVideoFilters: VideoFilterState = {
  channelId: null,
  dateRange: { from: null, to: null },
  minDuration: null,
  maxDuration: null,
  analysisStatus: 'all',
  sortField: 'published_at',
  sortOrder: 'desc',
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
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    console.error('Failed to save filters');
  }
};

export const loadFiltersFromStorage = (): VideoFilterState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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

const durationOptions = [
  { label: 'Toutes durées', min: null, max: null },
  { label: '< 5 min', min: null, max: 300 },
  { label: '5-15 min', min: 300, max: 900 },
  { label: '15-30 min', min: 900, max: 1800 },
  { label: '30-60 min', min: 1800, max: 3600 },
  { label: '> 1 heure', min: 3600, max: null },
];

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'published_at', label: 'Date de publication' },
  { field: 'view_count', label: 'Nombre de vues' },
  { field: 'like_count', label: 'Nombre de likes' },
  { field: 'duration', label: 'Durée' },
];

const statusOptions: { value: AnalysisStatus; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'analyzed', label: 'Analysées' },
  { value: 'pending', label: 'En attente' },
  { value: 'partial', label: 'Partiellement analysées' },
];

export const VideoFilters: React.FC<VideoFiltersProps> = ({
  channels,
  filters,
  onFilterChange,
  onReset,
  videoCount = 0,
  filteredCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const hasActiveFilters =
    filters.channelId !== null ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null ||
    filters.minDuration !== null ||
    filters.maxDuration !== null ||
    filters.analysisStatus !== 'all';

  const activeFilterCount = [
    filters.channelId !== null,
    filters.dateRange.from !== null || filters.dateRange.to !== null,
    filters.minDuration !== null || filters.maxDuration !== null,
    filters.analysisStatus !== 'all',
  ].filter(Boolean).length;

  const updateFilter = useCallback(
    <K extends keyof VideoFilterState>(key: K, value: VideoFilterState[K]) => {
      const newFilters = { ...filters, [key]: value };
      onFilterChange(newFilters);
      saveFiltersToStorage(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleReset = () => {
    onReset();
    localStorage.removeItem(STORAGE_KEY);
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdown && !(e.target as HTMLElement).closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
          ? 'bg-lime/20 dark:text-lime text-lime-dark border border-lime/30'
          : 'dark:bg-dark-700 bg-light-200 dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-300 border border-transparent'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}:</span>
      <span className="truncate max-w-[120px]">{value}</span>
      <ChevronDown
        size={14}
        className={`transition-transform ${openDropdown === id ? 'rotate-180' : ''}`}
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
              ? 'bg-lime text-black'
              : 'dark:bg-dark-700 bg-light-200 dark:text-white text-gray-700 dark:hover:bg-dark-600 hover:bg-light-300'
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

        {/* Quick Sort Dropdown */}
        <div className="relative filter-dropdown">
          <DropdownButton
            id="sort"
            label="Trier par"
            value={sortOptions.find((o) => o.field === filters.sortField)?.label || ''}
            icon={<BarChart2 size={14} />}
            isActive={false}
          />
          <AnimatePresence>
            {openDropdown === 'sort' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-56 dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.field}
                    onClick={() => {
                      updateFilter('sortField', option.field);
                      setOpenDropdown(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                  >
                    {option.label}
                    {filters.sortField === option.field && <Check size={14} className="dark:text-lime text-lime-dark" />}
                  </button>
                ))}
                <div className="border-t dark:border-dark-border border-light-border">
                  <button
                    onClick={() => {
                      updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                  >
                    Ordre: {filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                    <span className="dark:text-lime text-lime-dark">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="ml-auto text-sm dark:text-gray-400 text-gray-500">
          {hasActiveFilters ? (
            <span>
              {filteredCount} / {videoCount} vidéos
            </span>
          ) : (
            <span>{videoCount} vidéos</span>
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
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Channel Filter */}
                <div className="relative filter-dropdown">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    Chaîne
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'channel' ? null : 'channel');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm dark:hover:bg-dark-600 hover:bg-light-200 transition-colors"
                  >
                    <span className="truncate">
                      {filters.channelId
                        ? channels.find((c) => c.id === filters.channelId)?.name || 'Sélectionner'
                        : 'Toutes les chaînes'}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'channel' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            updateFilter('channelId', null);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                        >
                          Toutes les chaînes
                          {filters.channelId === null && <Check size={14} className="dark:text-lime text-lime-dark" />}
                        </button>
                        {channels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => {
                              updateFilter('channelId', channel.id);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                          >
                            <span className="truncate">{channel.name}</span>
                            {filters.channelId === channel.id && (
                              <Check size={14} className="dark:text-lime text-lime-dark flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Duration Filter */}
                <div className="relative filter-dropdown">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    <Clock size={12} className="inline mr-1" />
                    Durée
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'duration' ? null : 'duration');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm dark:hover:bg-dark-600 hover:bg-light-200 transition-colors"
                  >
                    <span>
                      {durationOptions.find(
                        (d) => d.min === filters.minDuration && d.max === filters.maxDuration
                      )?.label || 'Toutes durées'}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'duration' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50"
                      >
                        {durationOptions.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              updateFilter('minDuration', option.min);
                              updateFilter('maxDuration', option.max);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                          >
                            {option.label}
                            {filters.minDuration === option.min &&
                              filters.maxDuration === option.max && (
                                <Check size={14} className="dark:text-lime text-lime-dark" />
                              )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Analysis Status Filter */}
                <div className="relative filter-dropdown">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-500 mb-1.5">
                    <Filter size={12} className="inline mr-1" />
                    Statut analyse
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'status' ? null : 'status');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm dark:hover:bg-dark-600 hover:bg-light-200 transition-colors"
                  >
                    <span>
                      {statusOptions.find((s) => s.value === filters.analysisStatus)?.label ||
                        'Tous'}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'status' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl z-50"
                      >
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateFilter('analysisStatus', option.value);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center justify-between"
                          >
                            {option.label}
                            {filters.analysisStatus === option.value && (
                              <Check size={14} className="dark:text-lime text-lime-dark" />
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
                    Période
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filters.dateRange.from?.toISOString().split('T')[0] || ''}
                      onChange={(e) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          from: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="flex-1 px-2 py-2 dark:bg-dark-700 bg-light-100 dark:text-white text-gray-700 rounded-lg text-sm border-none focus:ring-1 focus:ring-lime"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.to?.toISOString().split('T')[0] || ''}
                      onChange={(e) =>
                        updateFilter('dateRange', {
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
                        onClick={() => updateFilter('channelId', null)}
                        className="dark:hover:text-white hover:text-lime-dark-hover"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(filters.minDuration !== null || filters.maxDuration !== null) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan/20 dark:text-cyan text-cyan-dark text-xs rounded-full">
                      {durationOptions.find(
                        (d) => d.min === filters.minDuration && d.max === filters.maxDuration
                      )?.label}
                      <button
                        onClick={() => {
                          updateFilter('minDuration', null);
                          updateFilter('maxDuration', null);
                        }}
                        className="dark:hover:text-white hover:text-cyan-dark-hover"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.analysisStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      {statusOptions.find((s) => s.value === filters.analysisStatus)?.label}
                      <button
                        onClick={() => updateFilter('analysisStatus', 'all')}
                        className="hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(filters.dateRange.from || filters.dateRange.to) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                      {filters.dateRange.from?.toLocaleDateString('fr-FR') || '...'} -{' '}
                      {filters.dateRange.to?.toLocaleDateString('fr-FR') || '...'}
                      <button
                        onClick={() => updateFilter('dateRange', { from: null, to: null })}
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

export default VideoFilters;
