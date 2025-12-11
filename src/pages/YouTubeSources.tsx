import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Youtube,
  Plus,
  ArrowLeft,
  Users,
  Video,
  ExternalLink,
  MoreVertical,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  ChevronRight,
} from 'lucide-react';
import { channelsApi, Channel } from '../services/api';

// Format subscriber count for display
function formatSubscribers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

interface ChannelCardProps {
  channel: Channel;
  onDelete: (id: string) => void;
  onRefreshVideos: (id: string) => void;
  onViewVideos: (channelId: string) => void;
  isRefreshing?: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onDelete,
  onRefreshVideos,
  onViewVideos,
  isRefreshing,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-5 hover:border-red-500/30 transition-all group relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Menu - absolute positioned top right */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-all"
        >
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                className="absolute right-0 top-8 dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-lg py-1 z-20 min-w-[160px] shadow-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <button
                  onClick={() => {
                    onRefreshVideos(channel.id);
                    setShowMenu(false);
                  }}
                  disabled={isRefreshing}
                  className="w-full px-3 py-2 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Mise à jour...' : 'Rafraîchir vidéos'}
                </button>
                <button
                  onClick={() => {
                    onDelete(channel.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Vertical centered content */}
      <div className="flex flex-col items-center text-center pt-2">
        {/* Thumbnail - larger, centered */}
        <div className="w-20 h-20 rounded-full overflow-hidden dark:bg-dark-700 bg-light-200 mb-4 relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-500" />
            </div>
          )}
          <img
            src={
              imageError
                ? 'https://via.placeholder.com/80/1a1a1a/666?text=YT'
                : channel.thumbnail_url || ''
            }
            alt={channel.name}
            className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        </div>

        {/* Name */}
        <h3 className="dark:text-white text-gray-900 font-semibold group-hover:text-red-500 transition-colors mb-1 line-clamp-1">
          {channel.name}
        </h3>

        {/* Subscriber count */}
        <div className="flex items-center gap-1 text-sm dark:text-gray-400 text-gray-500 mb-1">
          <Users size={14} />
          <span>{formatSubscribers(channel.subscriber_count)} abonnés</span>
        </div>

        {/* Video count */}
        <p className="text-sm dark:text-gray-500 text-gray-400 mb-3">
          {channel.video_count} vidéos
        </p>

        {/* Niche badge */}
        {channel.niche && (
          <span className="inline-block px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-full">
            {channel.niche}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t dark:border-dark-border border-light-border">
        <button
          onClick={() => onViewVideos(channel.id)}
          className="flex-1 btn btn-secondary text-xs py-2 flex items-center justify-center gap-1"
        >
          <Video size={14} />
          Voir vidéos
          <ChevronRight size={14} />
        </button>
        <a
          href={`https://youtube.com/channel/${channel.youtube_channel_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </motion.div>
  );
};

export function YouTubeSourcesPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchChannels = async () => {
    try {
      const data = await channelsApi.list();
      setChannels(data);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les chaînes');
      console.error('Error fetching channels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette chaîne et toutes ses vidéos ?')) return;

    try {
      await channelsApi.delete(id);
      setChannels(channels.filter((c) => c.id !== id));
      setSuccessMessage('Chaîne supprimée avec succès');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting channel:', err);
      setError('Impossible de supprimer la chaîne');
    }
  };

  const handleRefreshVideos = async (id: string) => {
    setRefreshingId(id);
    setError(null);
    try {
      const result = await channelsApi.refreshVideos(id);
      const channel = channels.find((c) => c.id === id);
      setSuccessMessage(`${result.updated} vidéos mises à jour pour ${channel?.name || 'la chaîne'}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error refreshing videos:', err);
      setError('Impossible de rafraîchir les vidéos');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleViewVideos = (channelId: string) => {
    navigate(`/contents?source=youtube&view=videos&channel=${channelId}`);
  };

  // Calculate total videos
  const totalVideos = channels.reduce((acc, ch) => acc + (ch.video_count || 0), 0);

  // Filter channels
  const filteredChannels = searchQuery
    ? channels.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.niche && c.niche.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : channels;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <button
          onClick={() => navigate('/sources')}
          className="flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-red-500 transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          <span>Sources</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Youtube size={24} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-white text-gray-900">YouTube</h1>
              <p className="dark:text-gray-400 text-gray-600">
                {channels.length} chaîne{channels.length !== 1 ? 's' : ''} • {totalVideos.toLocaleString()} vidéos
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/add-channel')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Ajouter une chaîne
          </button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center justify-between"
          >
            <span>✅ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="hover:text-green-300">
              ×
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-300">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {channels.length > 0 && (
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher une chaîne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-lg dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>
      )}

      {/* Empty State */}
      {channels.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 bg-red-500/10 rounded-2xl mb-4">
            <Youtube size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucune chaîne YouTube
          </h2>
          <p className="dark:text-gray-400 text-gray-500 mb-6">
            Commencez par ajouter une chaîne YouTube à suivre
          </p>
          <button onClick={() => navigate('/add-channel')} className="btn btn-primary">
            <Plus size={18} />
            Ajouter une chaîne
          </button>
        </div>
      )}

      {/* No search results */}
      {channels.length > 0 && filteredChannels.length === 0 && searchQuery && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 dark:bg-dark-700 bg-light-200 rounded-2xl mb-4">
            <Search size={32} className="dark:text-gray-500 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucun résultat
          </h2>
          <p className="dark:text-gray-400 text-gray-500">
            Aucune chaîne ne correspond à "{searchQuery}"
          </p>
        </div>
      )}

      {/* Channels Grid */}
      {filteredChannels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onDelete={handleDelete}
                onRefreshVideos={handleRefreshVideos}
                onViewVideos={handleViewVideos}
                isRefreshing={refreshingId === channel.id}
              />
            ))}
          </AnimatePresence>

          {/* Add Card */}
          <motion.button
            onClick={() => navigate('/add-channel')}
            className="border-2 border-dashed dark:border-dark-border border-light-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 dark:text-gray-500 text-gray-400 hover:border-red-500/50 dark:hover:text-red-400 hover:text-red-500 transition-all min-h-[180px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-full dark:bg-dark-700 bg-light-200 flex items-center justify-center">
              <Plus size={24} />
            </div>
            <span className="font-medium">Ajouter une chaîne</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}

export default YouTubeSourcesPage;
