import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Zap,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
  Calendar,
  Download,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  ExternalLink,
  Clock,
  Eye,
  List,
  PlayCircle,
  Radio,
  Youtube,
  Rss,
  FileUp,
} from "lucide-react";
import { analysesApi, AnalysisWithVideo } from "../services/api";
import { SourceBadge } from "../components/ui/SourceBadge";
import {
  AdvancedFilters,
  FilterState,
  filterByDateRange,
  sortItems,
} from "../components/AdvancedFilters";

type ReportType =
  | "all"
  | "transcript"
  | "summary_short"
  | "summary_detailed"
  | "lesson_card"
  | "actions"
  | "flashcards";

type GroupingMode = "list" | "by_video" | "by_channel";

type SourceFilter = "all" | "youtube" | "rss" | "document";

interface GroupedByVideo {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    youtube_video_id: string;
    channel_name: string;
    channel_id?: string;
    channel_thumbnail?: string | null;
  };
  analyses: AnalysisWithVideo[];
}

interface GroupedByChannel {
  channel: {
    id: string;
    name: string;
    thumbnail_url: string | null;
  };
  videos: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    analyses: AnalysisWithVideo[];
  }>;
}

interface ReportTypeConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: "all",
    label: "Toutes",
    icon: <FileText size={16} />,
    color: "bg-dark-600 text-gray-300",
  },
  {
    id: "transcript",
    label: "Transcription",
    icon: <FileText size={16} />,
    color: "bg-gray-500/15 text-gray-300",
  },
  {
    id: "summary_short",
    label: "Résumé Express",
    icon: <Zap size={16} />,
    color: "bg-lime-muted dark:text-lime text-lime-dark",
  },
  {
    id: "summary_detailed",
    label: "Résumé Détaillé",
    icon: <BookOpen size={16} />,
    color: "bg-cyan-muted dark:text-cyan text-cyan-dark",
  },
  {
    id: "lesson_card",
    label: "Lesson Card",
    icon: <GraduationCap size={16} />,
    color: "bg-purple-500/15 text-purple-400",
  },
  {
    id: "actions",
    label: "Plan d'Action",
    icon: <CheckSquare size={16} />,
    color: "bg-green-500/15 text-green-400",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: <Layers size={16} />,
    color: "bg-orange-500/15 text-orange-400",
  },
];

function getTypeConfig(type: string): ReportTypeConfig {
  return REPORT_TYPES.find((t) => t.id === type) || REPORT_TYPES[0];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-FR");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// Group analyses by video
function groupByVideo(analyses: AnalysisWithVideo[]): GroupedByVideo[] {
  const videoMap = new Map<string, GroupedByVideo>();

  analyses.forEach((analysis) => {
    const videoId = analysis.video_id;
    if (!videoMap.has(videoId)) {
      videoMap.set(videoId, {
        video: {
          id: videoId,
          title: analysis.videos?.title || "Vidéo inconnue",
          thumbnail_url: analysis.videos?.thumbnail_url || null,
          youtube_video_id: analysis.videos?.youtube_video_id || "",
          channel_name: analysis.videos?.channels?.name || "Chaîne inconnue",
          channel_id: analysis.videos?.channels?.id,
          channel_thumbnail: analysis.videos?.channels?.thumbnail_url,
        },
        analyses: [],
      });
    }
    videoMap.get(videoId)!.analyses.push(analysis);
  });

  return Array.from(videoMap.values()).sort((a, b) => {
    // Sort by most recent analysis
    const aDate = Math.max(
      ...a.analyses.map((x) => new Date(x.created_at).getTime()),
    );
    const bDate = Math.max(
      ...b.analyses.map((x) => new Date(x.created_at).getTime()),
    );
    return bDate - aDate;
  });
}

// Group analyses by channel
function groupByChannel(analyses: AnalysisWithVideo[]): GroupedByChannel[] {
  const channelMap = new Map<string, GroupedByChannel>();

  analyses.forEach((analysis) => {
    const channelId = analysis.videos?.channels?.id || "unknown";
    const channelName = analysis.videos?.channels?.name || "Chaîne inconnue";
    const channelThumbnail = analysis.videos?.channels?.thumbnail_url || null;

    if (!channelMap.has(channelId)) {
      channelMap.set(channelId, {
        channel: {
          id: channelId,
          name: channelName,
          thumbnail_url: channelThumbnail,
        },
        videos: [],
      });
    }

    const channelGroup = channelMap.get(channelId)!;
    const videoId = analysis.video_id;
    let videoGroup = channelGroup.videos.find((v) => v.id === videoId);

    if (!videoGroup) {
      videoGroup = {
        id: videoId,
        title: analysis.videos?.title || "Vidéo inconnue",
        thumbnail_url: analysis.videos?.thumbnail_url || null,
        analyses: [],
      };
      channelGroup.videos.push(videoGroup);
    }

    videoGroup.analyses.push(analysis);
  });

  // Sort channels by total analyses count
  return Array.from(channelMap.values())
    .sort((a, b) => {
      const aCount = a.videos.reduce((sum, v) => sum + v.analyses.length, 0);
      const bCount = b.videos.reduce((sum, v) => sum + v.analyses.length, 0);
      return bCount - aCount;
    })
    .map((channel) => ({
      ...channel,
      videos: channel.videos.sort(
        (a, b) => b.analyses.length - a.analyses.length,
      ),
    }));
}

interface AnalysisCardProps {
  analysis: AnalysisWithVideo;
  onClick: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onClick }) => {
  const typeConfig = getTypeConfig(analysis.type);
  const videoTitle = analysis.videos?.title || "Vidéo inconnue";
  const channelName = analysis.videos?.channels?.name || "Chaîne inconnue";
  const thumbnail = analysis.videos?.thumbnail_url || "";
  const wordCount = countWords(analysis.content);

  return (
    <div
      onClick={onClick}
      className="group dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-4 hover:border-lime/30 transition-all duration-300 cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="w-24 h-16 rounded-lg overflow-hidden dark:bg-dark-700 bg-light-300 flex-shrink-0">
          <img
            src={thumbnail}
            alt={videoTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/96x64/1a1a1a/666?text=Video";
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <SourceBadge type="youtube" size="sm" showLabel={false} />
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}
                >
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
              </div>
              <h3 className="dark:text-white text-gray-900 font-medium text-sm line-clamp-1 mt-1 dark:group-hover:text-lime group-hover:text-lime-dark transition-colors">
                {videoTitle}
              </h3>
              <p className="dark:text-gray-500 text-gray-400 text-xs">
                {channelName}
              </p>
            </div>
            <ChevronRight
              size={18}
              className="dark:text-gray-500 text-gray-400 dark:group-hover:text-lime group-hover:text-lime-dark transition-colors flex-shrink-0"
            />
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs dark:text-gray-400 text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(analysis.created_at)}
            </span>
            <span>{wordCount.toLocaleString()} mots</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AnalysisDetailModalProps {
  analysis: AnalysisWithVideo;
  onClose: () => void;
}

const AnalysisDetailModal: React.FC<AnalysisDetailModalProps> = ({
  analysis,
  onClose,
}) => {
  const typeConfig = getTypeConfig(analysis.type);
  const videoTitle = analysis.videos?.title || "Vidéo inconnue";
  const channelName = analysis.videos?.channels?.name || "Chaîne inconnue";
  const thumbnail = analysis.videos?.thumbnail_url || "";
  const youtubeUrl = analysis.videos?.youtube_video_id
    ? `https://www.youtube.com/watch?v=${analysis.videos.youtube_video_id}`
    : null;
  const wordCount = countWords(analysis.content);
  const readTime = Math.ceil(wordCount / 200); // ~200 mots/min

  const handleDownload = () => {
    const blob = new Blob([analysis.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${typeConfig.label} - ${videoTitle.substring(0, 50)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] dark:bg-dark-900 bg-white border dark:border-dark-border border-light-border rounded-2xl overflow-hidden shadow-2xl shadow-lime/5 animate-slide-up">
        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-b dark:from-dark-900 dark:via-dark-900 dark:to-dark-900/95 from-white via-white to-white/95 backdrop-blur-sm border-b dark:border-dark-border border-light-border">
          {/* Video banner */}
          <div className="relative h-24 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
              style={{ backgroundImage: `url(${thumbnail})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 dark:bg-dark-800/80 bg-light-200/80 dark:hover:bg-dark-700 hover:bg-light-300 rounded-lg transition-colors backdrop-blur-sm"
                  title="Voir sur YouTube"
                >
                  <ExternalLink
                    size={16}
                    className="dark:text-gray-300 text-gray-600"
                  />
                </a>
              )}
              <button
                onClick={handleDownload}
                className="p-2 dark:bg-dark-800/80 bg-light-200/80 dark:hover:bg-dark-700 hover:bg-light-300 rounded-lg transition-colors backdrop-blur-sm"
                title="Télécharger en Markdown"
              >
                <Download
                  size={16}
                  className="dark:text-gray-300 text-gray-600"
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 dark:bg-dark-800/80 bg-light-200/80 hover:bg-red-500/20 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X size={16} className="dark:text-gray-300 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Title section */}
          <div className="px-6 pb-4 -mt-8 relative">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="w-20 h-14 rounded-lg overflow-hidden border-2 dark:border-dark-800 border-light-200 shadow-lg flex-shrink-0">
                <img
                  src={thumbnail}
                  alt={videoTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/80x56/1a1a1a/666?text=Video";
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 pt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeConfig.color} border border-current/20`}
                >
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
                <h2 className="text-lg font-bold dark:text-white text-gray-900 mt-2 line-clamp-2">
                  {videoTitle}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-sm dark:text-gray-400 text-gray-500">
                  <span>{channelName}</span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {wordCount.toLocaleString()} mots
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {readTime} min de lecture
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content with styled Markdown */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            <div className="analysis-markdown">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold dark:text-lime text-lime-dark mb-4 mt-6 first:mt-0 pb-2 border-b border-lime/20">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold dark:text-cyan text-cyan-dark mb-3 mt-6 flex items-center gap-2">
                      <span className="w-1 h-6 bg-cyan rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="dark:text-gray-300 text-gray-600 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2 mb-4 ml-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 dark:text-gray-300 text-gray-600">
                      <span className="dark:text-lime text-lime-dark mt-1.5 flex-shrink-0">
                        •
                      </span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold dark:text-white text-gray-900">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic dark:text-cyan/90 text-cyan-dark/90">
                      {children}
                    </em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-lime/50 pl-4 py-2 my-4 bg-lime/5 rounded-r-lg italic dark:text-gray-300 text-gray-600">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="dark:bg-dark-700 bg-light-300 px-2 py-0.5 rounded dark:text-cyan text-cyan-dark text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="dark:bg-dark-800 bg-light-200 border dark:border-dark-border border-light-border rounded-lg p-4 overflow-x-auto my-4">
                      {children}
                    </pre>
                  ),
                  hr: () => (
                    <hr className="dark:border-dark-border border-light-border my-6" />
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dark:text-lime text-lime-dark hover:opacity-80 underline underline-offset-2"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {analysis.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Grouped by Video Section Component
interface GroupedByVideoSectionProps {
  groups: GroupedByVideo[];
  onAnalysisClick: (analysis: AnalysisWithVideo) => void;
}

const GroupedByVideoSection: React.FC<GroupedByVideoSectionProps> = ({
  groups,
  onAnalysisClick,
}) => {
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());

  const toggleVideo = (videoId: string) => {
    setExpandedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.video.id}
          className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl overflow-hidden"
        >
          {/* Video Header */}
          <button
            onClick={() => toggleVideo(group.video.id)}
            className="w-full flex items-center gap-4 p-4 hover:bg-dark-700/30 transition-colors"
          >
            {/* Thumbnail */}
            <div className="w-20 h-14 rounded-lg overflow-hidden dark:bg-dark-700 bg-light-300 flex-shrink-0">
              <img
                src={group.video.thumbnail_url || ""}
                alt={group.video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/80x56/1a1a1a/666?text=Video";
                }}
              />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <h3 className="dark:text-white text-gray-900 font-medium text-sm line-clamp-1">
                {group.video.title}
              </h3>
              <p className="dark:text-gray-500 text-gray-400 text-xs">
                {group.video.channel_name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-lime/20 dark:text-lime text-lime-dark text-xs font-semibold rounded-full">
                {group.analyses.length} analyse
                {group.analyses.length > 1 ? "s" : ""}
              </span>
              <ChevronDown
                size={18}
                className={`dark:text-gray-500 text-gray-400 transition-transform ${
                  expandedVideos.has(group.video.id) ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {/* Analyses List */}
          {expandedVideos.has(group.video.id) && (
            <div className="border-t dark:border-dark-border border-light-border p-3 space-y-2">
              {group.analyses.map((analysis) => {
                const typeConfig = getTypeConfig(analysis.type);
                return (
                  <button
                    key={analysis.id}
                    onClick={() => onAnalysisClick(analysis)}
                    className="w-full flex items-center justify-between gap-3 p-3 dark:bg-dark-700/50 bg-light-100 rounded-lg hover:bg-dark-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg ${typeConfig.color}`}>
                        {typeConfig.icon}
                      </span>
                      <span className="dark:text-gray-300 text-gray-600 text-sm font-medium">
                        {typeConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs dark:text-gray-500 text-gray-400">
                      <span>{formatDate(analysis.created_at)}</span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Grouped by Channel Section Component
interface GroupedByChannelSectionProps {
  groups: GroupedByChannel[];
  onAnalysisClick: (analysis: AnalysisWithVideo) => void;
}

const GroupedByChannelSection: React.FC<GroupedByChannelSectionProps> = ({
  groups,
  onAnalysisClick,
}) => {
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set(),
  );
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());

  const toggleChannel = (channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const toggleVideo = (videoId: string) => {
    setExpandedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const totalAnalyses = group.videos.reduce(
          (sum, v) => sum + v.analyses.length,
          0,
        );

        return (
          <div
            key={group.channel.id}
            className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl overflow-hidden"
          >
            {/* Channel Header */}
            <button
              onClick={() => toggleChannel(group.channel.id)}
              className="w-full flex items-center gap-4 p-4 hover:bg-dark-700/30 transition-colors"
            >
              {/* Channel Thumbnail */}
              <div className="w-12 h-12 rounded-full overflow-hidden dark:bg-dark-700 bg-light-300 flex-shrink-0">
                {group.channel.thumbnail_url ? (
                  <img
                    src={group.channel.thumbnail_url}
                    alt={group.channel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio
                      size={20}
                      className="dark:text-gray-500 text-gray-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <h3 className="dark:text-white text-gray-900 font-semibold">
                  {group.channel.name}
                </h3>
                <p className="dark:text-gray-500 text-gray-400 text-xs">
                  {group.videos.length} vidéo
                  {group.videos.length > 1 ? "s" : ""} • {totalAnalyses} analyse
                  {totalAnalyses > 1 ? "s" : ""}
                </p>
              </div>

              <ChevronDown
                size={18}
                className={`dark:text-gray-500 text-gray-400 transition-transform ${
                  expandedChannels.has(group.channel.id) ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Videos within Channel */}
            {expandedChannels.has(group.channel.id) && (
              <div className="border-t dark:border-dark-border border-light-border">
                {group.videos.map((video) => (
                  <div
                    key={video.id}
                    className="border-b dark:border-dark-border/50 border-light-border/50 last:border-b-0"
                  >
                    {/* Video Sub-Header */}
                    <button
                      onClick={() => toggleVideo(video.id)}
                      className="w-full flex items-center gap-3 p-3 pl-8 hover:bg-dark-700/20 transition-colors"
                    >
                      <div className="w-14 h-10 rounded overflow-hidden dark:bg-dark-700 bg-light-300 flex-shrink-0">
                        <img
                          src={video.thumbnail_url || ""}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/56x40/1a1a1a/666?text=V";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="dark:text-gray-300 text-gray-600 text-sm line-clamp-1">
                          {video.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-lime/10 dark:text-lime text-lime-dark text-xs rounded-full">
                          {video.analyses.length}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`dark:text-gray-600 text-gray-400 transition-transform ${
                            expandedVideos.has(video.id) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Analyses within Video */}
                    {expandedVideos.has(video.id) && (
                      <div className="pl-12 pr-4 pb-3 space-y-1.5">
                        {video.analyses.map((analysis) => {
                          const typeConfig = getTypeConfig(analysis.type);
                          return (
                            <button
                              key={analysis.id}
                              onClick={() => onAnalysisClick(analysis)}
                              className="w-full flex items-center justify-between gap-2 p-2 dark:bg-dark-700/30 bg-light-100 rounded-lg hover:bg-dark-700/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`p-1 rounded ${typeConfig.color}`}
                                >
                                  {typeConfig.icon}
                                </span>
                                <span className="dark:text-gray-400 text-gray-500 text-xs">
                                  {typeConfig.label}
                                </span>
                              </div>
                              <span className="text-xs dark:text-gray-600 text-gray-400">
                                {formatDate(analysis.created_at)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface AnalysesPageProps {
  searchQuery?: string;
}

export const AnalysesPage: React.FC<AnalysesPageProps> = ({
  searchQuery = "",
}) => {
  const [selectedType, setSelectedType] = useState<ReportType>("all");
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("list");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [analyses, setAnalyses] = useState<AnalysisWithVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AnalysisWithVideo | null>(null);

  // Ref for virtualized list container
  const parentRef = useRef<HTMLDivElement>(null);

  // Advanced filters state
  const [filters, setFilters] = useState<FilterState>({
    search: searchQuery,
    channelId: null,
    dateRange: "all",
    sortBy: "date_desc",
  });

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await analysesApi.list({
          type: selectedType !== "all" ? selectedType : undefined,
          limit: 100,
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setAnalyses(response.analyses);
          setTotalCount(response.total);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching analyses:", err);
          setError("Impossible de charger les analyses");
          setAnalyses([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalyses();

    return () => {
      abortController.abort();
    };
  }, [selectedType]);

  // Filter and sort analyses
  const filteredAnalyses = useMemo(() => {
    let result = [...analyses];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter((a) => {
        const videoTitle = a.videos?.title || "";
        const channelName = a.videos?.channels?.name || "";
        return (
          videoTitle.toLowerCase().includes(query) ||
          channelName.toLowerCase().includes(query)
        );
      });
    }

    // Channel filter
    if (filters.channelId) {
      result = result.filter(
        (a) => a.videos?.channels?.id === filters.channelId,
      );
    }

    // Date range filter
    result = filterByDateRange(result, filters.dateRange, "created_at");

    // Sorting - for analyses we'll use created_at for date sorting
    // Custom sort for analyses since we need different getters
    const sortedResult = sortItems(result, filters.sortBy, {
      date: (a) => a.created_at,
      title: (a) => a.videos?.title || "",
      views: () => 0, // No views for analyses
    });

    return sortedResult;
  }, [analyses, filters]);

  // Compute grouped data
  const groupedByVideo = useMemo(
    () => groupByVideo(filteredAnalyses),
    [filteredAnalyses],
  );
  const groupedByChannel = useMemo(
    () => groupByChannel(filteredAnalyses),
    [filteredAnalyses],
  );

  // Virtualizer for list view - optimizes rendering of large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredAnalyses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height in pixels
    overscan: 5, // Number of items to render outside visible area
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
            Analyses
          </h1>
          <p className="dark:text-gray-400 text-gray-500 mt-1">
            {totalCount} analyse{totalCount !== 1 ? "s" : ""} générée
            {totalCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 dark:bg-dark-700 bg-light-300 rounded-lg p-1">
          <button
            onClick={() => setGroupingMode("list")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              groupingMode === "list"
                ? "dark:bg-dark-500 bg-white dark:text-white text-gray-900 shadow-sm"
                : "dark:text-gray-400 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Vue liste"
          >
            <List size={16} />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setGroupingMode("by_video")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              groupingMode === "by_video"
                ? "dark:bg-dark-500 bg-white dark:text-white text-gray-900 shadow-sm"
                : "dark:text-gray-400 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Grouper par vidéo"
          >
            <PlayCircle size={16} />
            <span className="hidden sm:inline">Par vidéo</span>
          </button>
          <button
            onClick={() => setGroupingMode("by_channel")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              groupingMode === "by_channel"
                ? "dark:bg-dark-500 bg-white dark:text-white text-gray-900 shadow-sm"
                : "dark:text-gray-400 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Grouper par chaîne"
          >
            <Radio size={16} />
            <span className="hidden sm:inline">Par chaîne</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Source Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSourceFilter("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            sourceFilter === "all"
              ? "dark:bg-lime bg-lime-dark dark:text-black text-white"
              : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
          }`}
        >
          Toutes ({totalCount})
        </button>
        <button
          onClick={() => setSourceFilter("youtube")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            sourceFilter === "youtube"
              ? "bg-red-500 text-white"
              : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900"
          }`}
        >
          <Youtube size={16} />
          YouTube ({totalCount})
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-dark-800 bg-light-200 dark:text-gray-600 text-gray-400 cursor-not-allowed opacity-50"
        >
          <Rss size={16} />
          RSS (0)
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-dark-800 bg-light-200 dark:text-gray-600 text-gray-400 cursor-not-allowed opacity-50"
        >
          <FileUp size={16} />
          Documents (0)
        </button>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showChannelFilter={true}
        showViewsSort={false}
        placeholder="Rechercher une analyse..."
      />

      {/* Type Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id as ReportType)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
              transition-all duration-200
              ${
                selectedType === type.id
                  ? "bg-lime text-black"
                  : "dark:bg-dark-700 bg-light-300 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-600 hover:bg-light-400"
              }
            `}
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredAnalyses.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 bg-lime-muted rounded-2xl mb-4">
            <FileText size={32} className="dark:text-lime text-lime-dark" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucune analyse
          </h2>
          <p className="dark:text-gray-400 text-gray-500">
            {filters.search || filters.channelId || filters.dateRange !== "all"
              ? "Aucune analyse trouvée avec ces filtres"
              : "Les analyses de vos vidéos apparaîtront ici"}
          </p>
        </div>
      )}

      {/* Analyses Display */}
      {filteredAnalyses.length > 0 && (
        <>
          {/* List View - Virtualized for performance */}
          {groupingMode === "list" && (
            <div
              ref={parentRef}
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
                  const analysis = filteredAnalyses[virtualRow.index];
                  return (
                    <div
                      key={analysis.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="pb-3"
                    >
                      <AnalysisCard
                        analysis={analysis}
                        onClick={() => setSelectedAnalysis(analysis)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grouped by Video View */}
          {groupingMode === "by_video" && (
            <GroupedByVideoSection
              groups={groupedByVideo}
              onAnalysisClick={setSelectedAnalysis}
            />
          )}

          {/* Grouped by Channel View */}
          {groupingMode === "by_channel" && (
            <GroupedByChannelSection
              groups={groupedByChannel}
              onAnalysisClick={setSelectedAnalysis}
            />
          )}
        </>
      )}

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <AnalysisDetailModal
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  );
};

export default AnalysesPage;
