import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  FileText,
  Sparkles,
  AlertCircle,
  Timer,
  ArrowRight,
  Plus,
  Loader2,
  MessageSquare,
  BarChart3,
  PlayCircle,
  ChevronDown,
  Clock,
  Eye,
  Zap,
} from 'lucide-react';
import { channelsApi, videosApi, analysesApi, Channel, Video, Analysis } from '../services/api';
import { VideoDetailPanel } from '../components/VideoDetailPanel';
import { SourceBadge } from '../components/ui/SourceBadge';

// Extended Video type with Supabase channel relation
interface VideoWithChannel extends Video {
  channels?: {
    id: string;
    name: string;
    thumbnail_url?: string;
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  color: 'lime' | 'cyan' | 'white' | 'orange';
  onClick?: () => void;
  subtitle?: string;
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color, onClick, subtitle }) => {
  const colorClasses = {
    lime: 'bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-lime/20 dark:to-lime/5 border-lime-dark/30 dark:border-lime/20',
    cyan: 'bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-cyan/20 dark:to-cyan/5 border-cyan-dark/30 dark:border-cyan/20',
    white:
      'bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border-gray-200 dark:border-white/10',
    orange:
      'bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-orange-500/20 dark:to-orange-500/5 border-orange-300 dark:border-orange-500/20',
  };

  const iconColors = {
    lime: 'dark:text-lime text-lime-dark',
    cyan: 'dark:text-cyan text-cyan-dark',
    white: 'dark:text-white text-gray-700',
    orange: 'dark:text-orange-400 text-orange-500',
  };

  return (
    <motion.div
      onClick={onClick}
      className={`
        relative overflow-hidden ${colorClasses[color]}
        border rounded-2xl p-5 shadow-sm dark:shadow-none ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: onClick ? 1.02 : 1, y: onClick ? -4 : 0 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 bg-gradient-to-br from-lime/5 to-cyan/5"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="dark:text-gray-400 text-gray-500 text-sm mb-1">{label}</p>
          <motion.p
            className="text-3xl font-bold dark:text-white text-gray-900"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.p>
          {trend && (
            <motion.div
              className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'dark:text-lime text-lime-dark' : 'text-red-400'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span>
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="dark:text-gray-500 text-gray-400">vs last week</span>
            </motion.div>
          )}
          {subtitle && (
            <p className="dark:text-gray-500 text-gray-400 text-xs mt-2">{subtitle}</p>
          )}
        </div>
        <motion.div
          className={`p-3 rounded-xl dark:bg-dark-800/50 bg-light-200/80 ${iconColors[color]}`}
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
};


// Recent Content Card Component
interface RecentContentCardProps {
  sourceType: 'youtube' | 'rss' | 'document';
  thumbnail?: string;
  title: string;
  source: string;
  date: string;
  onClick?: () => void;
}

const RecentContentCard: React.FC<RecentContentCardProps> = ({
  sourceType,
  thumbnail,
  title,
  source,
  date,
  onClick,
}) => {
  return (
    <motion.div
      onClick={onClick}
      className="group flex items-center gap-4 p-3 dark:bg-dark-800/50 bg-white border dark:border-dark-border border-light-border rounded-xl cursor-pointer"
      whileHover={{ scale: 1.01, borderColor: '#ABF43F' }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Thumbnail or Icon */}
      {thumbnail ? (
        <div className="relative w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 dark:bg-dark-700 bg-light-300">
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-10 rounded-lg flex items-center justify-center dark:bg-dark-700 bg-light-300">
          <SourceBadge type={sourceType} size="sm" showLabel={false} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <SourceBadge type={sourceType} size="sm" showLabel={false} />
          <h4 className="dark:text-white text-gray-900 text-sm font-medium line-clamp-1 dark:group-hover:text-lime group-hover:text-lime-dark transition-colors">
            {title}
          </h4>
        </div>
        <p className="dark:text-gray-500 text-gray-400 text-xs">{source}</p>
      </div>

      {/* Time */}
      <span className="text-xs dark:text-gray-500 text-gray-400 flex-shrink-0">{date}</span>
    </motion.div>
  );
};

// Analysis Type Badge Component
interface AnalysisBadgeProps {
  type: string;
}

const AnalysisBadge: React.FC<AnalysisBadgeProps> = ({ type }) => {
  const typeConfig: Record<string, { label: string; color: string }> = {
    transcript: { label: 'Transcription', color: 'bg-blue-500/20 text-blue-400' },
    summary_short: { label: 'Résumé Express', color: 'bg-cyan-500/20 text-cyan-400' },
    summary_detailed: { label: 'Résumé Détaillé', color: 'bg-purple-500/20 text-purple-400' },
    lesson_card: { label: 'Fiche de Cours', color: 'bg-lime/20 dark:text-lime text-lime-dark' },
    actions: { label: 'Actions', color: 'bg-orange-500/20 text-orange-400' },
    flashcards: { label: 'Flashcards', color: 'bg-pink-500/20 text-pink-400' },
  };

  const config = typeConfig[type] || { label: type, color: 'bg-gray-500/20 text-gray-400' };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

interface DashboardProps {
  onNavigate: (path: string, channelId?: string) => void;
  searchQuery?: string;
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffWeeks < 4) return `Il y a ${diffWeeks} sem.`;
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an`;
}

// Helper function to parse video duration to minutes
function parseDurationToMinutes(duration: string | null): number {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return 0;
}

// Helper function to format time saved
function formatTimeSaved(totalMinutes: number): string {
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, searchQuery = '' }) => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithChannel | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [channelsData, videosResponse, analysesResponse] = await Promise.all([
        channelsApi.list(),
        videosApi.list({ limit: 1000 }),
        analysesApi.list({ limit: 1000 }),
      ]);

      setChannels(channelsData);
      setVideos(videosResponse.videos);
      setTotalVideos(videosResponse.total);
      setAnalyses(analysesResponse.analyses);
      setTotalAnalyses(analysesResponse.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const videoIdsWithAnalyses = new Set(analyses.map((a) => a.video_id));
  const pendingCount = videos.filter((v) => !videoIdsWithAnalyses.has(v.id)).length;

  // Time saved calculation
  const analyzedVideos = videos.filter((v) => videoIdsWithAnalyses.has(v.id));
  const totalTimeSavedMinutes = analyzedVideos.reduce(
    (total, video) => total + parseDurationToMinutes(video.duration),
    0
  );

  // Trends
  const analysesThisWeek = analyses.filter((a) => new Date(a.created_at) >= weekAgo).length;
  const analysesLastWeek = analyses.filter((a) => {
    const date = new Date(a.created_at);
    return date >= twoWeeksAgo && date < weekAgo;
  }).length;
  const analysisTrend =
    analysesLastWeek > 0
      ? Math.round(((analysesThisWeek - analysesLastWeek) / analysesLastWeek) * 100)
      : analysesThisWeek > 0
        ? 100
        : 0;

  // Period filter labels
  const periodLabels: Record<PeriodFilter, string> = {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    week: 'Cette semaine',
    month: 'Ce mois',
    all: 'Tout',
  };

  // Priority pending videos (videos without analyses, filtered by period)
  const priorityPendingVideos = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByPeriod = (dateStr: string) => {
      const date = new Date(dateStr);
      switch (periodFilter) {
        case 'today':
          return date >= todayStart;
        case 'yesterday':
          return date >= yesterdayStart && date < todayStart;
        case 'week':
          return date >= weekStart;
        case 'month':
          return date >= monthStart;
        case 'all':
        default:
          return true;
      }
    };

    return videos
      .filter((v) => !videoIdsWithAnalyses.has(v.id))
      .filter((v) => filterByPeriod(v.published_at))
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 5);
  }, [videos, videoIdsWithAnalyses, periodFilter]);

  // Total pending for current period filter
  const totalPendingForPeriod = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByPeriod = (dateStr: string) => {
      const date = new Date(dateStr);
      switch (periodFilter) {
        case 'today':
          return date >= todayStart;
        case 'yesterday':
          return date >= yesterdayStart && date < todayStart;
        case 'week':
          return date >= weekStart;
        case 'month':
          return date >= monthStart;
        case 'all':
        default:
          return true;
      }
    };

    return videos
      .filter((v) => !videoIdsWithAnalyses.has(v.id))
      .filter((v) => filterByPeriod(v.published_at)).length;
  }, [videos, videoIdsWithAnalyses, periodFilter]);

  // Filter videos based on search
  const filteredVideos = searchQuery
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.channels?.name && v.channels.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : videos;

  // Recent videos sorted by date
  const recentVideos = [...filteredVideos]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 5);

  // Recent analyses sorted by date
  const recentAnalyses = [...analyses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin dark:text-lime text-lime-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br dark:from-dark-800 dark:to-dark-900 from-white to-light-100 border dark:border-dark-border border-light-border rounded-3xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-2">
              Bienvenue sur <span className="text-gradient-lime">Knowledge AI</span>
            </h1>
            <p className="dark:text-gray-400 text-gray-600 max-w-lg">
              Votre plateforme d'intelligence éducative. Automatisez votre veille sectorielle et
              transformez-la en savoir actionnable.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => onNavigate('/add-source')} className="btn btn-primary">
                <Plus size={18} />
                Ajouter une source
              </button>
            </div>
          </div>

          <div className="hidden lg:block w-48 h-48 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-lime/30 to-cyan/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-br from-lime to-cyan rounded-3xl rotate-12 shadow-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - B2B Labels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<Radio size={24} />}
          label="Sources actives"
          value={channels.length}
          color="lime"
          onClick={() => onNavigate('/sources')}
          subtitle={`🎬 ${channels.length} YouTube • 📰 0 RSS • 📄 0 Docs`}
        />
        <StatCard
          icon={<FileText size={24} />}
          label="Contenus indexés"
          value={totalVideos}
          color="cyan"
          onClick={() => onNavigate('/contents')}
        />
        <StatCard
          icon={<Sparkles size={24} />}
          label="Analyses générées"
          value={totalAnalyses}
          trend={analysisTrend !== 0 ? { value: Math.abs(analysisTrend), isPositive: analysisTrend >= 0 } : undefined}
          color="white"
          onClick={() => onNavigate('/analyses')}
        />
        <StatCard
          icon={<AlertCircle size={24} />}
          label="À traiter"
          value={pendingCount}
          color="orange"
          onClick={() => onNavigate('/contents')}
        />
        <StatCard
          icon={<Timer size={24} />}
          label="Temps économisé"
          value={formatTimeSaved(totalTimeSavedMinutes)}
          color="lime"
        />
      </div>

      {/* Priority Analysis Section */}
      <div className="dark:bg-dark-800/50 bg-white border dark:border-dark-border border-light-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Zap size={20} className="text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold dark:text-white text-gray-900">
              À analyser en priorité
            </h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-lime/10 hover:bg-lime/20 border border-lime/30 rounded-lg text-sm dark:text-lime text-lime-dark transition-all"
            >
              {periodLabels[periodFilter]}
              <ChevronDown size={14} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-lg z-10 overflow-hidden">
                {(Object.keys(periodLabels) as PeriodFilter[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setPeriodFilter(period);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      periodFilter === period
                        ? 'dark:bg-lime/20 bg-lime/10 dark:text-lime text-lime-dark'
                        : 'dark:text-gray-300 text-gray-700 dark:hover:bg-dark-700 hover:bg-light-200'
                    }`}
                  >
                    {periodLabels[period]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {priorityPendingVideos.length > 0 ? (
            priorityPendingVideos.map((video) => (
              <motion.div
                key={video.id}
                className="flex items-center gap-4 p-3 dark:bg-dark-700/50 bg-light-100 border dark:border-dark-border border-light-border rounded-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 dark:bg-dark-600 bg-light-300">
                  <img
                    src={video.thumbnail_url || ''}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96x54/1a1a1a/666?text=Video';
                    }}
                  />
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] text-white">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="dark:text-white text-gray-900 text-sm font-medium line-clamp-1">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <SourceBadge type="youtube" size="sm" showLabel={false} />
                    <span className="dark:text-gray-500 text-gray-400 text-xs">
                      {video.channels?.name || 'Chaîne'}
                    </span>
                    <span className="dark:text-gray-600 text-gray-300">•</span>
                    <span className="dark:text-gray-500 text-gray-400 text-xs">
                      {formatRelativeTime(video.published_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400">
                      <Eye size={12} />
                      {video.view_count ? video.view_count.toLocaleString() : '0'} vues
                    </span>
                    <span className="flex items-center gap-1 text-xs text-orange-400">
                      <Clock size={12} />
                      Non analysé
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setSelectedVideo(video)}
                  className="px-3 py-1.5 bg-lime/20 hover:bg-lime/30 border border-lime/30 rounded-lg text-xs font-medium dark:text-lime text-lime-dark transition-colors whitespace-nowrap"
                >
                  Analyser
                </button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p>Aucun contenu à analyser pour cette période</p>
            </div>
          )}
        </div>

        {totalPendingForPeriod > 5 && (
          <div className="mt-4 pt-4 border-t dark:border-dark-border border-light-border">
            <button
              onClick={() => navigate('/contents?filter=pending')}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm dark:text-lime text-lime-dark hover:underline"
            >
              Voir tout ({totalPendingForPeriod} en attente)
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contents */}
        <div className="dark:bg-dark-800/50 bg-white border dark:border-dark-border border-light-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white text-gray-900">
              Nouveaux contenus
            </h2>
            <button
              onClick={() => onNavigate('/contents')}
              className="flex items-center gap-1 text-sm dark:text-lime text-lime-dark hover:underline"
            >
              Voir tout
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentVideos.length > 0 ? (
              recentVideos.map((video) => (
                <RecentContentCard
                  key={video.id}
                  sourceType="youtube"
                  thumbnail={video.thumbnail_url ?? undefined}
                  title={video.title}
                  source={video.channels?.name || 'Chaîne inconnue'}
                  date={formatRelativeTime(video.published_at)}
                  onClick={() => setSelectedVideo(video)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PlayCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>Aucun contenu pour le moment</p>
                <button
                  onClick={() => onNavigate('/add-source')}
                  className="mt-3 dark:text-lime text-lime-dark text-sm hover:underline"
                >
                  Ajouter une source pour commencer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="dark:bg-dark-800/50 bg-white border dark:border-dark-border border-light-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white text-gray-900">
              Analyses récentes
            </h2>
            <button
              onClick={() => onNavigate('/analyses')}
              className="flex items-center gap-1 text-sm dark:text-lime text-lime-dark hover:underline"
            >
              Voir tout
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis) => {
                const video = videos.find((v) => v.id === analysis.video_id);
                return (
                  <motion.div
                    key={analysis.id}
                    className="flex items-center gap-3 p-3 dark:bg-dark-700/50 bg-light-200 rounded-xl"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-2">
                      <SourceBadge type="youtube" size="sm" showLabel={false} />
                      <AnalysisBadge type={analysis.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="dark:text-white text-gray-900 text-sm line-clamp-1">
                        {video?.title || 'Vidéo'}
                      </p>
                      <p className="dark:text-gray-500 text-gray-400 text-xs">
                        {formatRelativeTime(analysis.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                <p>Aucune analyse générée</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button
          onClick={() => onNavigate('/add-source')}
          className="flex items-center justify-center gap-3 p-6 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl dark:hover:border-lime/50 hover:border-lime-dark/50 transition-colors group"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-3 rounded-xl bg-lime/20 dark:text-lime text-lime-dark group-hover:bg-lime/30 transition-colors">
            <Plus size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold dark:text-white text-gray-900">Ajouter une source</p>
            <p className="text-sm dark:text-gray-400 text-gray-500">YouTube, RSS, Documents</p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate('/chat')}
          className="flex items-center justify-center gap-3 p-6 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl dark:hover:border-cyan/50 hover:border-cyan-dark/50 transition-colors group"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-3 rounded-xl bg-cyan/20 dark:text-cyan text-cyan-dark group-hover:bg-cyan/30 transition-colors">
            <MessageSquare size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold dark:text-white text-gray-900">Poser une question</p>
            <p className="text-sm dark:text-gray-400 text-gray-500">Chat avec vos contenus</p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate('/analyses')}
          className="flex items-center justify-center gap-3 p-6 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl dark:hover:border-purple-500/50 hover:border-purple-400/50 transition-colors group"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
            <BarChart3 size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold dark:text-white text-gray-900">Générer un digest</p>
            <p className="text-sm dark:text-gray-400 text-gray-500">Synthèse de votre veille</p>
          </div>
        </motion.button>
      </div>

      {/* Video Detail Panel */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoDetailPanel
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onAnalysisStarted={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
