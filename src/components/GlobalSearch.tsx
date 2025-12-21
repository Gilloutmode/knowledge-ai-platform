import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Youtube, PlayCircle, Users, Loader2, X } from "lucide-react";
import { searchApi, SearchResults } from "../services/api";

// Format subscriber count
function formatSubscribers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    channels: [],
    videos: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults({ channels: [], videos: [] });
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchApi.global(debouncedQuery);
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search error:", error);
        setResults({ channels: [], videos: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  // Navigate to channel
  const handleChannelClick = (channelId: string) => {
    navigate(`/contents?source=youtube&view=videos&channel=${channelId}`);
    setQuery("");
    setIsOpen(false);
  };

  // Navigate to video
  const handleVideoClick = (videoId: string) => {
    navigate(`/contents?source=youtube&view=videos&videoId=${videoId}`);
    setQuery("");
    setIsOpen(false);
  };

  const hasResults = results.channels.length > 0 || results.videos.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher vidéos, chaînes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && hasResults && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="
            w-72 pl-10 pr-10 py-2
            bg-light-100 dark:bg-dark-800
            border border-light-border dark:border-dark-border
            rounded-xl text-sm
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30
            transition-all duration-200
          "
        />
        {/* Loading indicator or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-gray-400" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              aria-label="Effacer la recherche"
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          >
            {!hasResults && !isLoading && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Search size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun résultat pour "{query}"</p>
              </div>
            )}

            {/* Channels Section */}
            {results.channels.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-light-100 dark:bg-dark-700 border-b border-light-border dark:border-dark-border">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <Users size={12} />
                    Chaînes ({results.channels.length})
                  </span>
                </div>
                {results.channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-light-200 dark:bg-dark-600 flex-shrink-0">
                      {channel.thumbnail_url ? (
                        <img
                          src={channel.thumbnail_url}
                          alt={channel.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Youtube size={16} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span>
                          {formatSubscribers(channel.subscriber_count)} abonnés
                        </span>
                        <span>•</span>
                        <span>{channel.video_count} vidéos</span>
                      </p>
                    </div>
                    {/* Niche badge */}
                    {channel.niche && (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full flex-shrink-0">
                        {channel.niche}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Videos Section */}
            {results.videos.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-light-100 dark:bg-dark-700 border-b border-light-border dark:border-dark-border">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <PlayCircle size={12} />
                    Vidéos ({results.videos.length})
                  </span>
                </div>
                {results.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleVideoClick(video.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-light-200 dark:bg-dark-600 flex-shrink-0">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle size={16} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {video.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Footer hint */}
            {hasResults && (
              <div className="px-4 py-2 bg-light-100 dark:bg-dark-700 border-t border-light-border dark:border-dark-border">
                <p className="text-xs text-gray-400 text-center">
                  Appuyez sur{" "}
                  <kbd className="px-1.5 py-0.5 bg-light-200 dark:bg-dark-600 rounded text-gray-500">
                    Échap
                  </kbd>{" "}
                  pour fermer
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
