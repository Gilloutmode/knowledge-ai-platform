import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  Clock,
  Eye,
  FileText,
  Grid,
  List,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
  Youtube,
  ChevronDown,
  RefreshCw,
  Zap,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
} from "lucide-react";
import {
  videosApi,
  channelsApi,
  analysesApi,
  Video,
  Channel,
} from "../services/api";
import { VideoDetailPanel } from "../components/VideoDetailPanel";
import {
  AdvancedFilters,
  FilterState,
  filterByDateRange,
  sortItems,
} from "../components/AdvancedFilters";

const VIDEOS_PER_PAGE = 20;

// Stable empty array to prevent re-renders when video has no analyses
const EMPTY_ANALYSIS_TYPES: string[] = [];

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "pending" | "processing" | "completed" | "failed";

interface VideosPageProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

interface VideoCardProps {
  video: Video;
  channelName?: string;
  onClick?: () => void;
  analysisTypes?: string[];
}

// Analysis types configuration
const ANALYSIS_TYPES = [
  { id: "transcript", icon: FileText, color: "text-gray-400" },
  { id: "summary_short", icon: Zap, color: "dark:text-lime text-lime-dark" },
  {
    id: "summary_detailed",
    icon: BookOpen,
    color: "dark:text-cyan text-cyan-dark",
  },
  { id: "lesson_card", icon: GraduationCap, color: "text-purple-400" },
  { id: "actions", icon: CheckSquare, color: "text-green-400" },
  { id: "flashcards", icon: Layers, color: "text-orange-400" },
];

// Check if video is from today
function isPublishedToday(dateString: string): boolean {
  const publishedDate = new Date(dateString);
  const today = new Date();

  return (
    publishedDate.getDate() === today.getDate() &&
    publishedDate.getMonth() === today.getMonth() &&
    publishedDate.getFullYear() === today.getFullYear()
  );
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<
    string,
    { icon: React.ElementType; label: string; class: string }
  > = {
    pending: { icon: Clock, label: "En attente", class: "badge" },
    processing: { icon: Loader2, label: "Analyse...", class: "badge-warning" },
    completed: { icon: CheckCircle, label: "Analysé", class: "badge-success" },
    failed: { icon: AlertCircle, label: "Erreur", class: "badge-error" },
  };

  const {
    icon: Icon,
    label,
    class: badgeClass,
  } = config[status] || config.pending;

  return (
    <span className={`badge ${badgeClass} flex items-center gap-1`}>
      <Icon
        size={12}
        className={status === "processing" ? "animate-spin" : ""}
      />
      {label}
    </span>
  );
};

// Format view count
function formatViews(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "À l'instant";
  if (diffHours < 24)
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Il y a ${months} mois`;
  }
  const years = Math.floor(diffDays / 365);
  return `Il y a ${years} an${years > 1 ? "s" : ""}`;
}

const VideoCard: React.FC<VideoCardProps> = React.memo(
  ({ video, channelName, onClick, analysisTypes = [] }) => {
    const status = video.is_analyzed ? "completed" : "pending";
    const isTodayVideo = isPublishedToday(video.published_at);
    const [isHovered, setIsHovered] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;

      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const mouseX = e.clientX - cardCenterX;
      const mouseY = e.clientY - cardCenterY;

      const rotationY = (mouseX / (rect.width / 2)) * 4;
      const rotationX = -(mouseY / (rect.height / 2)) * 4;

      setRotation({ x: rotationX, y: rotationY });
    };

    const resetRotation = () => {
      setIsHovered(false);
      setRotation({ x: 0, y: 0 });
    };

    return (
      <motion.div
        ref={cardRef}
        onClick={onClick}
        className="relative w-full cursor-pointer group"
        style={{
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered
            ? "none"
            : "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={resetRotation}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated gradient border */}
        <div
          className={`absolute -inset-0.5 rounded-xl opacity-0 blur-sm transition-opacity duration-500 ${
            isTodayVideo
              ? "bg-gradient-to-r from-lime via-cyan to-lime opacity-75 group-hover:opacity-100 animate-pulse"
              : "bg-gradient-to-r from-lime/50 via-cyan/50 to-lime/50 group-hover:opacity-100"
          }`}
        ></div>

        {/* Main card */}
        <div
          className={`relative dark:bg-dark-800/90 bg-white/90 backdrop-blur-xl rounded-xl overflow-hidden border shadow-2xl ${
            isTodayVideo
              ? "border-lime/30"
              : "dark:border-dark-border/50 border-light-border/50"
          }`}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br dark:from-dark-700/40 dark:via-dark-800/40 dark:to-dark-900/40 from-light-200/40 via-white/40 to-light-100/40 backdrop-blur-sm pointer-events-none"></div>

          {/* Animated background gradient */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-lime/20 via-cyan/20 to-lime/20 animate-pulse"></div>
          </div>

          {/* Thumbnail section */}
          <div className="relative aspect-video overflow-hidden dark:bg-dark-700 bg-light-300">
            <motion.img
              src={video.thumbnail_url || ""}
              alt={video.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.1 : 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/320x180/1a1a1a/666?text=Video";
              }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent opacity-60"></div>

            {/* Animated play button */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-lime/20 rounded-full blur-xl animate-pulse"></div>
                    <motion.div
                      className="relative bg-lime/90 backdrop-blur-sm rounded-full p-4 shadow-2xl"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PlayCircle
                        size={32}
                        className="text-dark-900 fill-dark-900"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Duration badge */}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-dark-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-dark-700/50">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="dark:text-lime text-lime-dark" />
                  <span className="text-xs font-medium text-white">
                    {video.duration}
                  </span>
                </div>
              </div>
            )}

            {/* New today badge */}
            {isTodayVideo && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="absolute top-2 left-2"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan/30 rounded-full blur-md animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-cyan to-lime px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <span className="text-xs font-bold text-dark-900">
                      🆕 Aujourd'hui
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content section */}
          <div className="relative p-4 space-y-3">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2">
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="dark:text-white text-gray-900 font-medium text-sm line-clamp-2 dark:group-hover:text-lime group-hover:text-lime-dark transition-colors duration-300"
              >
                {video.title}
              </motion.h3>
              <StatusBadge status={status} />
            </div>

            {channelName && (
              <p className="dark:text-gray-500 text-gray-400 text-xs">
                {channelName}
              </p>
            )}

            {/* Animated Analysis Badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1.5 flex-wrap"
            >
              {ANALYSIS_TYPES.map((type, index) => {
                const hasAnalysis = analysisTypes.includes(type.id);
                const Icon = type.icon;
                return (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className={`p-1 rounded transition-all duration-300 ${
                      hasAnalysis
                        ? `${type.color} dark:bg-dark-700 bg-light-200 border border-current/30 hover:scale-110`
                        : "dark:text-gray-600 text-gray-400 dark:bg-dark-700/50 bg-light-300/50 dark:hover:bg-dark-700 hover:bg-light-300"
                    }`}
                    title={
                      hasAnalysis
                        ? `${type.id} généré`
                        : `${type.id} non généré`
                    }
                    whileHover={{ scale: 1.2 }}
                  >
                    <Icon size={14} />
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between text-xs dark:text-gray-400 text-gray-500"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 dark:group-hover:text-cyan group-hover:text-cyan-dark transition-colors duration-300">
                  <Eye size={12} />
                  <span className="font-medium">
                    {formatViews(video.view_count)}
                  </span>
                </div>
                {video.like_count > 0 && (
                  <div className="flex items-center gap-1 dark:group-hover:text-lime group-hover:text-lime-dark transition-colors duration-300">
                    <span className="font-medium">
                      👍 {formatViews(video.like_count)}
                    </span>
                  </div>
                )}
              </div>
              <span className="dark:group-hover:text-white group-hover:text-gray-900 transition-colors duration-300">
                {formatRelativeDate(video.published_at)}
              </span>
            </motion.div>

            {/* Hover glow effect */}
            <motion.div className="absolute inset-0 bg-gradient-to-t from-lime/5 via-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-b-xl" />
          </div>
        </div>

        {/* Floating particles effect */}
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-lime rounded-full pointer-events-none"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100,
                    opacity: [0, 1, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

export const VideosPage: React.FC<VideosPageProps> = ({
  searchQuery = "",
  onSearchChange,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChannelId = searchParams.get("channelId");

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalVideos, setTotalVideos] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [videoAnalyses, setVideoAnalyses] = useState<Record<string, string[]>>(
    {},
  );

  // Advanced filters state
  const [filters, setFilters] = useState<FilterState>({
    search: searchQuery,
    channelId: urlChannelId,
    dateRange: "all",
    sortBy: "date_desc",
  });

  // Sync URL channel filter with state
  useEffect(() => {
    if (urlChannelId !== filters.channelId) {
      setFilters((prev) => ({ ...prev, channelId: urlChannelId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChannelId]);

  // Update URL when channel filter changes
  useEffect(() => {
    if (filters.channelId && filters.channelId !== urlChannelId) {
      setSearchParams({ channelId: filters.channelId });
    } else if (!filters.channelId && urlChannelId) {
      setSearchParams({});
    }
  }, [filters.channelId, urlChannelId, setSearchParams]);

  // Active channel ID (from filters or URL)
  const channelId = filters.channelId || urlChannelId;

  const handleClearFilter = () => {
    setSearchParams({});
  };

  // Debounced search value for API calls
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      // Update parent search if provided
      if (onSearchChange && newFilters.search !== filters.search) {
        onSearchChange(newFilters.search);
      }
    },
    [onSearchChange, filters.search],
  );

  // Initial fetch with auto-refresh
  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (channelId) {
          // Auto-refresh videos from YouTube on load (only if no search)
          if (!debouncedSearch) {
            try {
              await channelsApi.refreshVideos(channelId);
            } catch (refreshErr) {
              console.warn(
                "Auto-refresh failed, continuing with existing data:",
                refreshErr,
              );
            }
          }

          const response = await videosApi.listByChannel(channelId, {
            limit: VIDEOS_PER_PAGE,
            offset: 0,
            search: debouncedSearch || undefined,
            signal: abortController.signal,
          });
          if (!abortController.signal.aborted) {
            setVideos(response.videos);
            setTotalVideos(response.total);
            setHasMore(response.hasMore);
            // Also fetch channel info for display
            const channelData = await channelsApi.get(
              channelId,
              abortController.signal,
            );
            setChannel(channelData);
          }
        } else {
          const response = await videosApi.list({
            limit: VIDEOS_PER_PAGE,
            offset: 0,
            search: debouncedSearch || undefined,
            signal: abortController.signal,
          });
          if (!abortController.signal.aborted) {
            setVideos(response.videos);
            setTotalVideos(response.total);
            setHasMore(response.hasMore);
            setChannel(null);
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching videos:", err);
          setError("Impossible de charger les vidéos");
          setVideos([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [channelId, debouncedSearch]);

  // Fetch analyses for all videos - use ref to prevent refetch on every videos change
  const hasLoadedAnalyses = useRef(false);
  const lastVideoCount = useRef(0);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchAnalyses = async () => {
      // Only refetch if we have new videos loaded (not on every render)
      if (videos.length === 0) return;
      if (hasLoadedAnalyses.current && videos.length === lastVideoCount.current)
        return;

      try {
        // Fetch all analyses
        const response = await analysesApi.list({
          limit: 1000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          hasLoadedAnalyses.current = true;
          lastVideoCount.current = videos.length;

          // Group analyses by video_id
          const analysesMap: Record<string, string[]> = {};
          response.analyses.forEach((analysis) => {
            if (!analysesMap[analysis.video_id]) {
              analysesMap[analysis.video_id] = [];
            }
            analysesMap[analysis.video_id].push(analysis.type);
          });

          setVideoAnalyses(analysesMap);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching analyses:", err);
        }
      }
    };

    fetchAnalyses();

    return () => {
      abortController.abort();
    };
  }, [videos.length]);

  // Periodic auto-refresh every 10 minutes (only when tab is visible)
  useEffect(() => {
    if (!channelId) return;

    const POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes
    let refreshInterval: NodeJS.Timeout | null = null;

    const doRefresh = async () => {
      try {
        await channelsApi.refreshVideos(channelId);
        const response = await videosApi.listByChannel(channelId, {
          limit: VIDEOS_PER_PAGE,
          offset: 0,
        });
        setVideos(response.videos);
        setTotalVideos(response.total);
        setHasMore(response.hasMore);
      } catch (err) {
        console.error("Background auto-refresh failed:", err);
      }
    };

    const startPolling = () => {
      if (!refreshInterval) {
        refreshInterval = setInterval(doRefresh, POLLING_INTERVAL);
      }
    };

    const stopPolling = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    // Start polling only if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [channelId]);

  // Load more videos
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = videos.length;
      const response = channelId
        ? await videosApi.listByChannel(channelId, {
            limit: VIDEOS_PER_PAGE,
            offset,
            search: debouncedSearch || undefined,
          })
        : await videosApi.list({
            limit: VIDEOS_PER_PAGE,
            offset,
            search: debouncedSearch || undefined,
          });

      setVideos((prev) => [...prev, ...response.videos]);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error("Error loading more videos:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelId, videos.length, isLoadingMore, hasMore, debouncedSearch]);

  // Refresh videos from YouTube API
  const handleRefresh = useCallback(async () => {
    if (!channelId || isRefreshing) return;

    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      const result = await channelsApi.refreshVideos(channelId);
      setRefreshMessage(`✅ ${result.updated} nouvelles vidéos ajoutées`);

      // Reload the video list (with current search if any)
      const response = await videosApi.listByChannel(channelId, {
        limit: VIDEOS_PER_PAGE,
        offset: 0,
        search: debouncedSearch || undefined,
      });
      setVideos(response.videos);
      setTotalVideos(response.total);
      setHasMore(response.hasMore);

      // Clear message after 3 seconds
      setTimeout(() => setRefreshMessage(null), 3000);
    } catch (err) {
      console.error("Error refreshing videos:", err);
      setRefreshMessage("❌ Erreur lors du rafraîchissement");
      setTimeout(() => setRefreshMessage(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }, [channelId, isRefreshing, debouncedSearch]);

  // Client-side filtering and sorting
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((v) => {
        const status = v.is_analyzed ? "completed" : "pending";
        return status === statusFilter;
      });
    }

    // Date range filter
    result = filterByDateRange(result, filters.dateRange, "published_at");

    // Sorting
    result = sortItems(result, filters.sortBy, {
      date: (v) => v.published_at,
      title: (v) => v.title,
      views: (v) => v.view_count,
    });

    return result;
  }, [videos, statusFilter, filters.dateRange, filters.sortBy]);

  // Stable callback for video selection - prevents VideoCard re-renders
  const handleVideoSelect = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  // Ref for virtualized list container
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Virtualizer for list view - optimizes rendering of large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredVideos.length,
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => 100, // Estimated row height in pixels
    overscan: 5, // Number of items to render outside visible area
    enabled: viewMode === "list", // Only enable in list mode
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          size={32}
          className="animate-spin dark:text-lime text-lime-dark"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">
            Vidéos
          </h1>
          <p className="dark:text-gray-400 text-gray-500 mt-1">
            {videos.length} vidéo{videos.length !== 1 ? "s" : ""} •{" "}
            {videos.filter((v) => v.is_analyzed).length} analysée
            {videos.filter((v) => v.is_analyzed).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Channel Filter Badge */}
      {channel && (
        <div className="flex items-center gap-2 p-3 bg-lime-muted border border-lime/20 rounded-xl">
          <img
            src={channel.thumbnail_url || ""}
            alt={channel.name}
            loading="lazy"
            decoding="async"
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/32/1a1a1a/666?text=YT";
            }}
          />
          <span className="dark:text-lime text-lime-dark font-medium">
            Filtre : {channel.name}
          </span>

          {/* Refresh Message */}
          {refreshMessage && (
            <span className="text-sm dark:text-white text-gray-900 dark:bg-dark-700 bg-light-300 px-3 py-1 rounded-lg">
              {refreshMessage}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-lime/20 hover:bg-lime/30 dark:text-lime text-lime-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Récupérer les dernières vidéos"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              <span className="text-sm font-medium">
                {isRefreshing ? "Rafraîchissement..." : "Rafraîchir"}
              </span>
            </button>

            {/* Clear Filter Button */}
            <button
              onClick={handleClearFilter}
              className="p-1.5 hover:bg-lime/20 rounded-lg transition-colors"
              title="Supprimer le filtre"
            >
              <X size={16} className="dark:text-lime text-lime-dark" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showChannelFilter={!channelId}
        showViewsSort={true}
        placeholder="Rechercher une vidéo..."
      />

      {/* Status Filter and View Mode */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {(["all", "completed", "pending"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                ${
                  statusFilter === status
                    ? "bg-lime text-black"
                    : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
                }
              `}
            >
              {status === "all"
                ? "Tous"
                : status === "completed"
                  ? "Analysés"
                  : "En attente"}
            </button>
          ))}
        </div>

        {/* View Mode */}
        <div className="flex items-center dark:bg-dark-700 bg-light-300 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "dark:bg-dark-500 bg-white dark:text-white text-gray-900" : "dark:text-gray-400 text-gray-500"}`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "dark:bg-dark-500 bg-white dark:text-white text-gray-900" : "dark:text-gray-400 text-gray-500"}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {videos.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 bg-lime-muted rounded-2xl mb-4">
            <Youtube size={32} className="dark:text-lime text-lime-dark" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucune vidéo
          </h2>
          <p className="dark:text-gray-400 text-gray-500">
            {channelId
              ? "Cette chaîne n'a pas encore de vidéos importées."
              : "Ajoutez une chaîne pour voir ses vidéos ici."}
          </p>
        </div>
      )}

      {/* Grid View (non-virtualized) */}
      {filteredVideos.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              channelName={channel?.name}
              onClick={() => handleVideoSelect(video)}
              analysisTypes={videoAnalyses[video.id] || EMPTY_ANALYSIS_TYPES}
            />
          ))}
        </div>
      )}

      {/* List View (virtualized for performance) */}
      {filteredVideos.length > 0 && viewMode === "list" && (
        <div
          ref={listContainerRef}
          className="h-[calc(100vh-400px)] min-h-[400px] overflow-auto"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const video = filteredVideos[virtualRow.index];
              return (
                <div
                  key={video.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <VideoCard
                    video={video}
                    channelName={channel?.name}
                    onClick={() => handleVideoSelect(video)}
                    analysisTypes={
                      videoAnalyses[video.id] || EMPTY_ANALYSIS_TYPES
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredVideos.length === 0 && videos.length > 0 && (
        <div className="text-center py-12">
          <p className="dark:text-gray-500 text-gray-400">
            Aucune vidéo trouvée avec ces filtres
          </p>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && filteredVideos.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-6">
          <p className="text-sm dark:text-gray-500 text-gray-400">
            {videos.length} sur {totalVideos} vidéos affichées
          </p>
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-3 dark:bg-dark-700 bg-white dark:hover:bg-dark-600 hover:bg-light-200 border dark:border-dark-border border-light-border hover:border-lime/30 dark:text-white text-gray-900 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <ChevronDown size={18} />
                Charger plus de vidéos
              </>
            )}
          </button>
        </div>
      )}

      {/* All videos loaded message */}
      {!hasMore && videos.length > 0 && totalVideos > VIDEOS_PER_PAGE && (
        <div className="text-center py-6">
          <p className="text-sm dark:text-gray-500 text-gray-400">
            Toutes les {totalVideos} vidéos sont affichées
          </p>
        </div>
      )}

      {/* Video Detail Panel */}
      {selectedVideo && (
        <VideoDetailPanel
          video={selectedVideo}
          channelName={channel?.name}
          onClose={() => setSelectedVideo(null)}
          onAnalysisStarted={() => {
            // Panel stays open - polling will update analyses automatically
            // Just refresh video list to show updated status in background
            const fetchData = async () => {
              try {
                const response = channelId
                  ? await videosApi.listByChannel(channelId, {
                      limit: VIDEOS_PER_PAGE,
                      offset: 0,
                      search: debouncedSearch || undefined,
                    })
                  : await videosApi.list({
                      limit: VIDEOS_PER_PAGE,
                      offset: 0,
                      search: debouncedSearch || undefined,
                    });
                setVideos(response.videos);
              } catch (err) {
                console.error("Error refreshing videos:", err);
              }
            };
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default VideosPage;
