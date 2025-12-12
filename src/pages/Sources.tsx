import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Youtube,
  Rss,
  FileText,
  Plus,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { channelsApi } from "../services/api";

interface SourceStats {
  channels: number;
  videos: number;
  loading: boolean;
}

export function SourcesPage() {
  const navigate = useNavigate();
  const [youtubeStats, setYoutubeStats] = useState<SourceStats>({
    channels: 0,
    videos: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const channels = await channelsApi.list();
        const totalVideos = channels.reduce(
          (acc, ch) => acc + (ch.video_count || 0),
          0,
        );
        setYoutubeStats({
          channels: channels.length,
          videos: totalVideos,
          loading: false,
        });
      } catch (err) {
        console.error("Failed to fetch YouTube stats:", err);
        setYoutubeStats((prev) => ({ ...prev, loading: false }));
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">
            Sources
          </h1>
          <p className="dark:text-gray-400 text-gray-600 mt-1">
            Gérez vos sources de contenu : chaînes YouTube, flux RSS, documents
          </p>
        </div>
        <button
          onClick={() => navigate("/add-source")}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Ajouter une source
        </button>
      </div>

      {/* Source Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* YouTube - Active & Clickable */}
        <button
          onClick={() => navigate("/sources/youtube")}
          className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-6 text-left transition-all hover:border-red-500/50 hover:shadow-lg group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Youtube size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold dark:text-white text-gray-900 group-hover:text-red-500 transition-colors">
                  YouTube
                </h3>
                {youtubeStats.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                    <span className="text-sm dark:text-gray-400 text-gray-600">
                      Chargement...
                    </span>
                  </div>
                ) : (
                  <p className="text-sm dark:text-gray-400 text-gray-600">
                    {youtubeStats.channels} chaîne
                    {youtubeStats.channels !== 1 ? "s" : ""} •{" "}
                    {youtubeStats.videos.toLocaleString()} vidéos
                  </p>
                )}
              </div>
            </div>
            <ChevronRight
              size={20}
              className="dark:text-gray-600 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all"
            />
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Suivez automatiquement les nouvelles vidéos de vos chaînes
            préférées.
          </p>
        </button>

        {/* RSS - Coming Soon */}
        <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-6 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Rss size={20} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold dark:text-white text-gray-900">
                Flux RSS
              </h3>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Bientôt disponible
              </p>
            </div>
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Agrégez vos blogs et newsletters préférés.
          </p>
        </div>

        {/* Documents - Coming Soon */}
        <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-6 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold dark:text-white text-gray-900">
                Documents
              </h3>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Bientôt disponible
              </p>
            </div>
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Uploadez vos PDF, articles et rapports.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {!youtubeStats.loading && youtubeStats.channels > 0 && (
        <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">
            Résumé de vos sources
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 dark:bg-dark-700 bg-light-100 rounded-lg">
              <p className="text-2xl font-bold dark:text-lime text-lime-dark">
                {youtubeStats.channels}
              </p>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Chaînes YouTube
              </p>
            </div>
            <div className="text-center p-4 dark:bg-dark-700 bg-light-100 rounded-lg">
              <p className="text-2xl font-bold dark:text-cyan text-cyan-dark">
                {youtubeStats.videos.toLocaleString()}
              </p>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Vidéos indexées
              </p>
            </div>
            <div className="text-center p-4 dark:bg-dark-700 bg-light-100 rounded-lg">
              <p className="text-2xl font-bold dark:text-gray-500 text-gray-400">
                0
              </p>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Flux RSS
              </p>
            </div>
            <div className="text-center p-4 dark:bg-dark-700 bg-light-100 rounded-lg">
              <p className="text-2xl font-bold dark:text-gray-500 text-gray-400">
                0
              </p>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Documents
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SourcesPage;
