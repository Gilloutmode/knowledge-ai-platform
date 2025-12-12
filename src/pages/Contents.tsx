import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Clock,
  Eye,
  Grid,
  List,
  CheckCircle,
  Loader2,
  AlertCircle,
  Youtube,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Users,
  Zap,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import {
  videosApi,
  analysesApi,
  channelsApi,
  Video,
  Channel,
} from "../services/api";
import { VideoDetailPanel } from "../components/VideoDetailPanel";
import { SourceBadge } from "../components/ui/SourceBadge";

const CONTENTS_PER_PAGE = 20;

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "pending" | "analyzed";
type SourceFilter = "all" | "youtube" | "rss" | "document";
type YouTubeView = "channels" | "videos";

interface ContentsPageProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Analysis types configuration
const ANALYSIS_TYPES = [
  {
    id: "transcript",
    icon: FileText,
    color: "text-gray-400",
    label: "Transcription",
  },
  {
    id: "summary_short",
    icon: Zap,
    color: "dark:text-lime text-lime-dark",
    label: "Résumé court",
  },
  {
    id: "summary_detailed",
    icon: BookOpen,
    color: "dark:text-cyan text-cyan-dark",
    label: "Résumé détaillé",
  },
  {
    id: "lesson_card",
    icon: GraduationCap,
    color: "text-purple-400",
    label: "Fiche de cours",
  },
  {
    id: "actions",
    icon: CheckSquare,
    color: "text-green-400",
    label: "Actions",
  },
  {
    id: "flashcards",
    icon: Layers,
    color: "text-orange-400",
    label: "Flashcards",
  },
];

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
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// Format subscriber count
function formatSubscribers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
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
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

interface ContentCardProps {
  video: Video;
  onClick?: () => void;
  analysisTypes?: string[];
  viewMode: ViewMode;
}

// Analysis count badge component
const AnalysisCountBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-lime/20 dark:text-lime text-lime-dark">
      <CheckCircle size={12} />
      {count} analyse{count > 1 ? "s" : ""}
    </span>
  );
};

const ContentCard: React.FC<ContentCardProps> = ({
  video,
  onClick,
  analysisTypes = [],
  viewMode,
}) => {
  const status = video.is_analyzed ? "completed" : "pending";

  if (viewMode === "list") {
    return (
      <motion.div
        onClick={onClick}
        className="flex items-center gap-4 p-4 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl cursor-pointer hover:border-lime/30 transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Thumbnail */}
        <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden dark:bg-dark-700 bg-light-300">
          <img
            src={video.thumbnail_url || ""}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/160x90/1a1a1a/666?text=Video";
            }}
          />
          {video.duration && (
            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
              {video.duration}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="dark:text-white text-gray-900 font-medium text-sm line-clamp-1">
              {video.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SourceBadge type="youtube" />
              <AnalysisCountBadge count={analysisTypes.length} />
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Analysis badges */}
          <div className="flex items-center gap-1.5 mt-2">
            {ANALYSIS_TYPES.map((type) => {
              const hasAnalysis = analysisTypes.includes(type.id);
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  className={`p-1 rounded ${
                    hasAnalysis
                      ? `${type.color} dark:bg-dark-700 bg-light-200`
                      : "dark:text-gray-600 text-gray-400 dark:bg-dark-700/50 bg-light-300/50"
                  }`}
                  title={type.label}
                >
                  <Icon size={14} />
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs dark:text-gray-400 text-gray-500">
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {formatViews(video.view_count)}
            </span>
            <span>{formatRelativeDate(video.published_at)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      onClick={onClick}
      className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl overflow-hidden cursor-pointer hover:border-lime/30 transition-all group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video dark:bg-dark-700 bg-light-300">
        <img
          src={video.thumbnail_url || ""}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://via.placeholder.com/320x180/1a1a1a/666?text=Video";
          }}
        />

        {/* Source Badge on thumbnail */}
        <div className="absolute top-2 left-2">
          <SourceBadge type="youtube" />
        </div>

        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white flex items-center gap-1">
            <Clock size={12} />
            {video.duration}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <PlayCircle
            size={48}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="dark:text-white text-gray-900 font-medium text-sm line-clamp-2 group-hover:text-lime transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <AnalysisCountBadge count={analysisTypes.length} />
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Analysis badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ANALYSIS_TYPES.map((type) => {
            const hasAnalysis = analysisTypes.includes(type.id);
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className={`p-1 rounded transition-all ${
                  hasAnalysis
                    ? `${type.color} dark:bg-dark-700 bg-light-200 border border-current/30`
                    : "dark:text-gray-600 text-gray-400 dark:bg-dark-700/50 bg-light-300/50"
                }`}
                title={type.label}
              >
                <Icon size={14} />
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs dark:text-gray-400 text-gray-500">
          <div className="flex items-center gap-1">
            <Eye size={12} />
            <span>{formatViews(video.view_count)}</span>
          </div>
          <span>{formatRelativeDate(video.published_at)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Channels Grid Component
interface ChannelsGridProps {
  channels: Channel[];
  onViewVideos: (channelId: string) => void;
}

const ChannelsGrid: React.FC<ChannelsGridProps> = ({
  channels,
  onViewVideos,
}) => {
  if (channels.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 dark:bg-dark-700 bg-light-200 rounded-2xl mb-4">
          <Users size={32} className="dark:text-lime text-lime-dark" />
        </div>
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
          Aucune chaîne
        </h2>
        <p className="dark:text-gray-400 text-gray-500">
          Ajoutez des chaînes YouTube depuis la page Sources.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {channels.map((channel) => (
        <motion.div
          key={channel.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl overflow-hidden group hover:border-lime/30 transition-all"
        >
          {/* Thumbnail */}
          <div className="relative aspect-video dark:bg-dark-700 bg-light-300 flex items-center justify-center">
            {channel.thumbnail_url ? (
              <img
                src={channel.thumbnail_url}
                alt={channel.name}
                className="w-24 h-24 rounded-full object-cover border-4 dark:border-dark-600 border-light-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full dark:bg-dark-600 bg-light-200 flex items-center justify-center">
                <Youtube
                  size={32}
                  className="dark:text-gray-500 text-gray-400"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="text-center">
              <h3 className="dark:text-white text-gray-900 font-semibold text-sm line-clamp-1 group-hover:text-lime transition-colors">
                {channel.name}
              </h3>
              {/* Subscriber count */}
              <div className="flex items-center justify-center gap-1 text-xs dark:text-gray-400 text-gray-500 mt-1">
                <Users size={12} />
                <span>
                  {formatSubscribers(channel.subscriber_count)} abonnés
                </span>
              </div>
              {/* Video count */}
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                {channel.video_count?.toLocaleString() || 0} vidéos
              </p>
              {/* Niche badge */}
              {channel.niche && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-full">
                  {channel.niche}
                </span>
              )}
            </div>

            <button
              onClick={() => onViewVideos(channel.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium dark:bg-dark-700 bg-light-200 dark:hover:bg-lime/20 hover:bg-lime/20 dark:text-white text-gray-900 hover:text-lime rounded-lg transition-all"
            >
              Voir vidéos
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const ContentsPage: React.FC<ContentsPageProps> = ({
  searchQuery = "",
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [channelFilter, setChannelFilter] = useState<string>(
    searchParams.get("channel") || "all",
  );
  const [youtubeView, setYoutubeView] = useState<YouTubeView>("videos");
  const [showYoutubeMenu, setShowYoutubeMenu] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contents, setContents] = useState<Video[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalContents, setTotalContents] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Video | null>(null);
  const [contentAnalyses, setContentAnalyses] = useState<
    Record<string, string[]>
  >({});
  const [localSearch, setLocalSearch] = useState("");

  // Initialize filters from URL params
  useEffect(() => {
    const urlSource = searchParams.get("source");
    const urlChannel = searchParams.get("channel");
    const urlFilter = searchParams.get("filter");
    const urlView = searchParams.get("view");
    const urlVideoId = searchParams.get("videoId");

    if (urlSource && ["youtube", "rss", "document"].includes(urlSource)) {
      setSourceFilter(urlSource as SourceFilter);
    }
    if (urlChannel) {
      setSourceFilter("youtube");
      setChannelFilter(urlChannel);
      setYoutubeView("videos");
    }
    if (urlView === "channels" || urlView === "videos") {
      setYoutubeView(urlView);
      if (urlView === "channels") {
        setSourceFilter("youtube");
      }
    }
    if (urlFilter === "pending") setStatusFilter("pending");
    if (urlFilter === "analyzed") setStatusFilter("analyzed");

    // Auto-open video detail panel if videoId is provided
    if (urlVideoId) {
      videosApi
        .get(urlVideoId)
        .then((video) => {
          setSelectedContent(video);
          // Clear videoId from URL after opening
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("videoId");
          setSearchParams(newParams, { replace: true });
        })
        .catch((err) => {
          console.error("Error fetching video:", err);
        });
    }
  }, [searchParams, setSearchParams]); // React to URL changes

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (sourceFilter === "youtube") params.set("view", youtubeView);
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (statusFilter !== "all") params.set("filter", statusFilter);
    setSearchParams(params, { replace: true });
  }, [sourceFilter, channelFilter, statusFilter, youtubeView, setSearchParams]);

  // Fetch channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const channelsList = await channelsApi.list();
        setChannels(channelsList);
      } catch (err) {
        console.error("Error fetching channels:", err);
      }
    };
    fetchChannels();
  }, []);

  // Handle source filter change with reset
  const handleSourceFilterChange = (newSource: SourceFilter) => {
    setSourceFilter(newSource);
    if (newSource !== "youtube") {
      setChannelFilter("all");
    }
  };

  // Get selected channel name for breadcrumb
  const selectedChannel = useMemo(() => {
    if (channelFilter === "all") return null;
    return channels.find((ch) => ch.id === channelFilter);
  }, [channelFilter, channels]);

  // Filtered channels based on local search (real-time filtering)
  const filteredChannels = useMemo(() => {
    if (!localSearch.trim()) return channels;
    const searchLower = localSearch.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(searchLower) ||
        (ch.niche && ch.niche.toLowerCase().includes(searchLower)),
    );
  }, [channels, localSearch]);

  // Debounced local search for videos API
  const [debouncedLocalSearch, setDebouncedLocalSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocalSearch(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Debounced search (from prop - for GlobalSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combine search terms (local search takes priority over global)
  const effectiveSearch = debouncedLocalSearch || debouncedSearch || "";

  // Track if it's the first load
  const isFirstLoad = useRef(true);

  // Fetch contents
  useEffect(() => {
    const fetchData = async () => {
      // Only show full-page loader on first load, not on search
      if (isFirstLoad.current) {
        setIsInitialLoading(true);
      } else {
        setIsSearching(true);
      }
      setError(null);

      try {
        const response = await videosApi.list({
          limit: CONTENTS_PER_PAGE,
          offset: 0,
          search: effectiveSearch || undefined,
          channelId: channelFilter !== "all" ? channelFilter : undefined,
        });
        setContents(response.videos);
        setTotalContents(response.total);
        setHasMore(response.hasMore);
      } catch (err) {
        console.error("Error fetching contents:", err);
        setError("Impossible de charger les contenus");
        setContents([]);
      } finally {
        setIsInitialLoading(false);
        setIsSearching(false);
        isFirstLoad.current = false;
      }
    };

    fetchData();
  }, [effectiveSearch, channelFilter]);

  // Fetch analyses for all contents
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (contents.length === 0) return;

      try {
        const response = await analysesApi.list({ limit: 1000 });
        const analysesMap: Record<string, string[]> = {};
        response.analyses.forEach((analysis) => {
          if (!analysesMap[analysis.video_id]) {
            analysesMap[analysis.video_id] = [];
          }
          analysesMap[analysis.video_id].push(analysis.type);
        });
        setContentAnalyses(analysesMap);
      } catch (err) {
        console.error("Error fetching analyses:", err);
      }
    };

    fetchAnalyses();
  }, [contents]);

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await videosApi.list({
        limit: CONTENTS_PER_PAGE,
        offset: contents.length,
        search: effectiveSearch || undefined,
        channelId: channelFilter !== "all" ? channelFilter : undefined,
      });
      setContents((prev) => [...prev, ...response.videos]);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [contents.length, isLoadingMore, hasMore, effectiveSearch, channelFilter]);

  // Filter contents
  const filteredContents = useMemo(() => {
    let result = [...contents];

    // Status filter - use contentAnalyses map instead of is_analyzed field
    if (statusFilter !== "all") {
      result = result.filter((c) => {
        const hasAnalyses =
          contentAnalyses[c.id] && contentAnalyses[c.id].length > 0;
        return statusFilter === "analyzed" ? hasAnalyses : !hasAnalyses;
      });
    }

    // Source filter (currently only YouTube, but prepared for future)
    if (sourceFilter !== "all" && sourceFilter !== "youtube") {
      result = []; // No other sources yet
    }

    // Note: Channel filter is now handled server-side via API

    return result;
  }, [contents, statusFilter, sourceFilter, contentAnalyses]);

  if (isInitialLoading) {
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
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">
            Contents
          </h1>
          <p className="dark:text-gray-400 text-gray-500 mt-1">
            {totalContents} contenu{totalContents !== 1 ? "s" : ""} •{" "}
            {contents.filter((c) => c.is_analyzed).length} analysé
            {contents.filter((c) => c.is_analyzed).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Breadcrumb for YouTube views */}
      {sourceFilter === "youtube" && youtubeView === "videos" && (
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => {
              setYoutubeView("channels");
              setChannelFilter("all");
              setLocalSearch("");
            }}
            className="flex items-center gap-2 dark:text-gray-400 text-gray-500 hover:text-lime transition-colors"
          >
            <ArrowLeft size={16} />
            Retour aux chaînes
          </button>
          {selectedChannel && (
            <>
              <span className="dark:text-gray-600 text-gray-400">•</span>
              <span className="dark:text-white text-gray-900 font-medium flex items-center gap-2">
                {selectedChannel.thumbnail_url && (
                  <img
                    src={selectedChannel.thumbnail_url}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                )}
                {selectedChannel.name}
                <span className="dark:text-gray-500 text-gray-400 font-normal">
                  ({filteredContents.length} vidéo
                  {filteredContents.length !== 1 ? "s" : ""})
                </span>
              </span>
            </>
          )}
          {!selectedChannel && (
            <>
              <span className="dark:text-gray-600 text-gray-400">•</span>
              <span className="dark:text-white text-gray-900 font-medium">
                Toutes les vidéos
                <span className="dark:text-gray-500 text-gray-400 font-normal ml-2">
                  ({totalContents.toLocaleString()} vidéos)
                </span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {(["all", "analyzed", "pending"] as StatusFilter[]).map(
              (status) => (
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
                    : status === "analyzed"
                      ? "Analysés"
                      : "En attente"}
                </button>
              ),
            )}
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-1 pl-4 border-l dark:border-dark-border border-light-border">
            <button
              onClick={() => handleSourceFilterChange("all")}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                ${
                  sourceFilter === "all"
                    ? "bg-lime text-black"
                    : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
                }
              `}
            >
              Tous ({totalContents.toLocaleString()})
            </button>
            {/* YouTube with sub-menu */}
            <div className="relative">
              <button
                onClick={() => setShowYoutubeMenu(!showYoutubeMenu)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                  ${
                    sourceFilter === "youtube"
                      ? "bg-red-500 text-white"
                      : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
                  }
                `}
              >
                <Youtube size={14} />
                YouTube
                <ChevronDown
                  size={12}
                  className={`transition-transform ${showYoutubeMenu ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showYoutubeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]"
                  >
                    <button
                      onClick={() => {
                        setSourceFilter("youtube");
                        setYoutubeView("channels");
                        setChannelFilter("all");
                        setShowYoutubeMenu(false);
                        setLocalSearch("");
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        sourceFilter === "youtube" && youtubeView === "channels"
                          ? "dark:bg-lime/20 bg-lime/10 dark:text-lime text-lime-dark"
                          : "dark:text-gray-300 text-gray-700 dark:hover:bg-dark-700 hover:bg-light-200"
                      }`}
                    >
                      <Users size={16} />
                      <span>Chaînes</span>
                      <span className="ml-auto text-xs dark:text-gray-500 text-gray-400">
                        {channels.length}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSourceFilter("youtube");
                        setYoutubeView("videos");
                        setChannelFilter("all");
                        setShowYoutubeMenu(false);
                        setLocalSearch("");
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        sourceFilter === "youtube" &&
                        youtubeView === "videos" &&
                        channelFilter === "all"
                          ? "dark:bg-lime/20 bg-lime/10 dark:text-lime text-lime-dark"
                          : "dark:text-gray-300 text-gray-700 dark:hover:bg-dark-700 hover:bg-light-200"
                      }`}
                    >
                      <PlayCircle size={16} />
                      <span>Vidéos</span>
                      <span className="ml-auto text-xs dark:text-gray-500 text-gray-400">
                        {totalContents.toLocaleString()}
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              disabled
              className="px-3 py-1.5 text-sm font-medium rounded-lg dark:bg-dark-700/50 bg-light-300/50 dark:text-gray-600 text-gray-400 cursor-not-allowed flex items-center gap-2"
            >
              📰 RSS (0)
            </button>
            <button
              disabled
              className="px-3 py-1.5 text-sm font-medium rounded-lg dark:bg-dark-700/50 bg-light-300/50 dark:text-gray-600 text-gray-400 cursor-not-allowed flex items-center gap-2"
            >
              📄 Docs (0)
            </button>
          </div>
        </div>

        {/* Search + View Mode */}
        <div className="flex items-center gap-3">
          {/* Local Search Input */}
          <div className="relative">
            {isSearching ? (
              <Loader2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-lime text-lime-dark animate-spin"
              />
            ) : (
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400"
              />
            )}
            <input
              type="text"
              placeholder={
                sourceFilter === "youtube" && youtubeView === "channels"
                  ? "Filtrer les chaînes..."
                  : "Filtrer les vidéos..."
              }
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-56 pl-9 pr-8 py-1.5 text-sm dark:bg-dark-700 bg-light-300 border dark:border-dark-border border-light-border rounded-lg dark:text-white text-gray-900 placeholder:dark:text-gray-500 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/50 transition-all"
            />
            {localSearch && !isSearching && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400 hover:dark:text-white hover:text-gray-900 transition-colors"
              >
                <X size={14} />
              </button>
            )}
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
      </div>

      {/* Channels Grid View */}
      {sourceFilter === "youtube" && youtubeView === "channels" && (
        <ChannelsGrid
          channels={filteredChannels}
          onViewVideos={(channelId) => {
            setChannelFilter(channelId);
            setYoutubeView("videos");
            setLocalSearch("");
          }}
        />
      )}

      {/* Videos View */}
      {!(sourceFilter === "youtube" && youtubeView === "channels") && (
        <>
          {/* Empty State */}
          {contents.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="inline-flex p-4 dark:bg-dark-700 bg-light-200 rounded-2xl mb-4">
                <FileText size={32} className="dark:text-lime text-lime-dark" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
                Aucun contenu
              </h2>
              <p className="dark:text-gray-400 text-gray-500">
                Ajoutez des sources pour commencer à collecter du contenu.
              </p>
            </div>
          )}

          {/* Content Grid/List */}
          {filteredContents.length > 0 && (
            <div
              className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
            >
              <AnimatePresence>
                {filteredContents.map((content) => (
                  <ContentCard
                    key={content.id}
                    video={content}
                    onClick={() => setSelectedContent(content)}
                    analysisTypes={contentAnalyses[content.id] || []}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {filteredContents.length === 0 && contents.length > 0 && (
            <div className="text-center py-12">
              <p className="dark:text-gray-500 text-gray-400">
                Aucun contenu trouvé avec ces filtres
              </p>
            </div>
          )}
        </>
      )}

      {/* Load More */}
      {!(sourceFilter === "youtube" && youtubeView === "channels") &&
        hasMore &&
        filteredContents.length > 0 && (
          <div className="flex flex-col items-center gap-2 pt-6">
            <p className="text-sm dark:text-gray-500 text-gray-400">
              {contents.length} sur {totalContents} contenus affichés
            </p>
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-6 py-3 dark:bg-dark-700 bg-white dark:hover:bg-dark-600 hover:bg-light-200 border dark:border-dark-border border-light-border hover:border-lime/30 dark:text-white text-gray-900 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Charger plus de contenus
                </>
              )}
            </button>
          </div>
        )}

      {/* Content Detail Panel */}
      {selectedContent && (
        <VideoDetailPanel
          video={selectedContent}
          onClose={() => setSelectedContent(null)}
          onAnalysisStarted={() => {
            // Refresh after analysis
            videosApi
              .list({ limit: CONTENTS_PER_PAGE, offset: 0 })
              .then((response) => {
                setContents(response.videos);
              });
          }}
        />
      )}
    </div>
  );
};

export default ContentsPage;
