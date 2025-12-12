import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Plus,
  Users,
  Video,
  ExternalLink,
  MoreVertical,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { channelsApi, Channel } from "../services/api";

interface ChannelCardProps {
  channel: Channel;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onRefreshStats: (id: string) => void;
  onViewVideos: (channelId: string) => void;
  isRefreshingStats?: boolean;
}

// Format subscriber count for display
function formatSubscribers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onDelete,
  onRefresh,
  onRefreshStats,
  onViewVideos,
  isRefreshingStats,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
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
    const rotationY = (mouseX / (rect.width / 2)) * 5;
    const rotationX = -(mouseY / (rect.height / 2)) * 5;
    setRotation({ x: rotationX, y: rotationY });
  };

  const resetRotation = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative group"
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
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-lime via-cyan to-lime opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100"></div>

      {/* Main card content */}
      <div className="relative dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl p-5 backdrop-blur-xl">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-lime/5 via-transparent to-cyan/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-start gap-4">
            {/* Thumbnail with loading state and glow effect */}
            <motion.div
              className="w-16 h-16 rounded-full overflow-hidden dark:bg-dark-700 bg-light-200 flex-shrink-0 relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-lime to-cyan rounded-full opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-300"></div>

              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 size={20} className="animate-spin text-gray-500" />
                </div>
              )}
              <img
                src={
                  imageError
                    ? "https://via.placeholder.com/64/1a1a1a/666?text=YT"
                    : channel.thumbnail_url || ""
                }
                alt={channel.name}
                className={`relative z-10 w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <motion.h3
                    className="dark:text-white text-gray-900 font-semibold truncate dark:group-hover:text-lime group-hover:text-lime-dark transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {channel.name}
                  </motion.h3>
                  {channel.niche && (
                    <motion.span
                      className="inline-block mt-1 px-2 py-0.5 bg-lime-muted dark:text-lime text-lime-dark text-xs font-medium rounded-full"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {channel.niche}
                    </motion.span>
                  )}
                </div>

                {/* Menu */}
                <div className="relative">
                  <motion.button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MoreVertical size={16} />
                  </motion.button>
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        className="absolute right-0 top-8 dark:bg-dark-700 bg-white border dark:border-dark-border border-light-border rounded-lg py-1 z-10 min-w-[180px] backdrop-blur-xl shadow-lg"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.button
                          onClick={() => {
                            onRefresh(channel.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm dark:text-gray-300 text-gray-600 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center gap-2"
                          whileHover={{ x: 4 }}
                        >
                          <RefreshCw size={14} />
                          Actualiser chaîne
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            onRefreshStats(channel.id);
                            setShowMenu(false);
                          }}
                          disabled={isRefreshingStats}
                          className="w-full px-3 py-2 text-left text-sm dark:text-cyan text-cyan-dark dark:hover:bg-dark-600 hover:bg-light-100 flex items-center gap-2 disabled:opacity-50"
                          whileHover={{ x: 4 }}
                        >
                          <RefreshCw
                            size={14}
                            className={isRefreshingStats ? "animate-spin" : ""}
                          />
                          {isRefreshingStats
                            ? "Mise à jour..."
                            : "Rafraîchir stats vidéos"}
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            onDelete(channel.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 dark:hover:bg-dark-600 hover:bg-light-100 flex items-center gap-2"
                          whileHover={{ x: 4 }}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Stats with stagger animation */}
              <motion.div
                className="flex items-center gap-4 mt-3 text-sm dark:text-gray-400 text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.span
                  className="flex items-center gap-1"
                  whileHover={{ scale: 1.05, color: "#ABF43F" }}
                >
                  <Users size={14} />
                  {formatSubscribers(channel.subscriber_count)}
                </motion.span>
                <motion.span
                  className="flex items-center gap-1"
                  whileHover={{ scale: 1.05, color: "#3FF4E5" }}
                >
                  <Video size={14} />
                  {channel.video_count} vidéos
                </motion.span>
              </motion.div>

              <motion.p
                className="text-xs dark:text-gray-500 text-gray-400 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Ajoutée le{" "}
                {new Date(channel.created_at).toLocaleDateString("fr-FR")}
              </motion.p>
            </div>
          </div>

          {/* Actions */}
          <motion.div
            className="flex gap-2 mt-4 pt-4 border-t dark:border-dark-border border-light-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              onClick={() => onViewVideos(channel.id)}
              className="flex-1 btn btn-secondary text-xs py-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Video size={14} />
              Voir vidéos
            </motion.button>
            <motion.a
              href={`https://youtube.com/channel/${channel.youtube_channel_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn btn-ghost text-xs py-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink size={14} />
              YouTube
            </motion.a>
          </motion.div>
        </div>

        {/* Floating particles on hover */}
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full pointer-events-none"
                  style={{
                    background: i % 2 === 0 ? "#ABF43F" : "#3FF4E5",
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{
                    x: (Math.random() - 0.5) * 150,
                    y: (Math.random() - 0.5) * 150,
                    opacity: [0, 1, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface ChannelsPageProps {
  onNavigate: (path: string, channelId?: string) => void;
  searchQuery?: string;
}

export const ChannelsPage: React.FC<ChannelsPageProps> = ({
  onNavigate,
  searchQuery = "",
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingStatsId, setRefreshingStatsId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchChannels = async (signal?: AbortSignal) => {
    try {
      const data = await channelsApi.list(signal);
      if (!signal?.aborted) {
        setChannels(data);
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError("Impossible de charger les chaînes");
        console.error("Error fetching channels:", err);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchChannels(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchChannels();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette chaîne ?")) return;

    try {
      await channelsApi.delete(id);
      setChannels(channels.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await channelsApi.refresh(id);
      // Optionally show a toast or update the UI
    } catch (err) {
      console.error("Error refreshing channel:", err);
    }
  };

  const handleRefreshStats = async (id: string) => {
    setRefreshingStatsId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await channelsApi.refreshVideos(id);
      const channel = channels.find((c) => c.id === id);
      setSuccessMessage(
        `✅ ${result.updated} vidéos mises à jour pour ${channel?.name || "la chaîne"}`,
      );
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Error refreshing video stats:", err);
      setError("Impossible de rafraîchir les statistiques des vidéos");
    } finally {
      setRefreshingStatsId(null);
    }
  };

  const handleViewVideos = (channelId: string) => {
    onNavigate("/videos", channelId);
  };

  // Filter channels based on search query
  const filteredChannels = searchQuery
    ? channels.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.niche &&
            c.niche.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : channels;

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
            Mes Chaînes
          </h1>
          <p className="dark:text-gray-400 text-gray-500 mt-1">
            {channels.length} chaîne{channels.length !== 1 ? "s" : ""} suivie
            {channels.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="btn btn-secondary"
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? "animate-spin" : ""}
            />
            Actualiser
          </button>
          <button
            onClick={() => onNavigate("/add-channel")}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Ajouter une chaîne
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center justify-between">
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-400 hover:text-green-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {channels.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 bg-lime-muted rounded-2xl mb-4">
            <Youtube size={32} className="dark:text-lime text-lime-dark" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucune chaîne
          </h2>
          <p className="dark:text-gray-400 text-gray-500 mb-6">
            Commencez par ajouter une chaîne YouTube à suivre
          </p>
          <button
            onClick={() => onNavigate("/add-channel")}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Ajouter une chaîne
          </button>
        </div>
      )}

      {/* No search results */}
      {channels.length > 0 && filteredChannels.length === 0 && searchQuery && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 dark:bg-dark-700 bg-light-200 rounded-2xl mb-4">
            <Youtube size={32} className="dark:text-gray-500 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
            Aucun résultat
          </h2>
          <p className="dark:text-gray-400 text-gray-500">
            Aucune chaîne ne correspond à "{searchQuery}"
          </p>
        </div>
      )}

      {/* Grid */}
      {filteredChannels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
              onRefreshStats={handleRefreshStats}
              onViewVideos={handleViewVideos}
              isRefreshingStats={refreshingStatsId === channel.id}
            />
          ))}

          {/* Add Card */}
          <motion.button
            onClick={() => onNavigate("/add-channel")}
            className="relative border-2 border-dashed dark:border-dark-border border-light-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 dark:text-gray-500 text-gray-400 group overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-lime/10 via-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Animated border glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-lime via-cyan to-lime opacity-0 blur-sm group-hover:opacity-30 transition-opacity duration-500 rounded-2xl"></div>

            <motion.div
              className="relative w-12 h-12 rounded-full dark:bg-dark-700 bg-light-200 flex items-center justify-center group-hover:bg-lime/20 transition-colors duration-300"
              whileHover={{ rotate: 180 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Plus
                size={24}
                className="dark:group-hover:text-lime group-hover:text-lime-dark transition-colors"
              />
            </motion.div>
            <span className="relative font-medium dark:group-hover:text-lime group-hover:text-lime-dark transition-colors">
              Ajouter une chaîne
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;
