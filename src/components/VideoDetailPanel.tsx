import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  X,
  Play,
  Eye,
  ThumbsUp,
  Calendar,
  FileText,
  Zap,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Download,
  Copy,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { Video, videosApi, analysesApi, Analysis } from "../services/api";
import {
  exportAnalysis,
  copyToClipboard,
  generateMarkdown,
  AnalysisExportData,
} from "../services/export";

interface VideoDetailPanelProps {
  video: Video;
  channelName?: string;
  onClose: () => void;
  onAnalysisStarted?: () => void;
}

interface ReportTypeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  model: "flash" | "pro";
  estimatedTime: string;
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    id: "transcript",
    label: "Transcription",
    description: "Transcription complète mot à mot",
    icon: <FileText size={20} />,
    color: "bg-gray-500/15 text-gray-300 border-gray-500/30",
    model: "flash",
    estimatedTime: "~20s",
  },
  {
    id: "summary_short",
    label: "Résumé Express",
    description: "5-10 points essentiels",
    icon: <Zap size={20} />,
    color: "bg-lime-muted dark:text-lime text-lime-dark border-lime/30",
    model: "flash",
    estimatedTime: "~15s",
  },
  {
    id: "summary_detailed",
    label: "Résumé Détaillé",
    description: "Analyse approfondie avec contexte",
    icon: <BookOpen size={20} />,
    color: "bg-cyan-muted dark:text-cyan text-cyan-dark border-cyan/30",
    model: "pro",
    estimatedTime: "~60s",
  },
  {
    id: "lesson_card",
    label: "Lesson Card",
    description: "Fiche pédagogique complète",
    icon: <GraduationCap size={20} />,
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    model: "pro",
    estimatedTime: "~2min",
  },
  {
    id: "actions",
    label: "Plan d'Action",
    description: "Étapes concrètes et checklists",
    icon: <CheckSquare size={20} />,
    color: "bg-green-500/15 text-green-400 border-green-500/30",
    model: "pro",
    estimatedTime: "~50s",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Q&R pour mémorisation",
    icon: <Layers size={20} />,
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    model: "flash",
    estimatedTime: "~25s",
  },
];

function formatViews(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// Parse video duration to seconds
function parseDurationToSeconds(duration: string | null): number {
  if (!duration) return 600; // Default 10 min if no duration

  const parts = duration.split(":").map(Number);

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return 600; // Default 10 min
}

// Calculate estimated time based on video duration
function calculateEstimatedTime(
  videoDurationSeconds: number,
  analysisType: string,
): string {
  // Base time factors (per minute of video)
  const timeFactors: Record<string, number> = {
    transcript: 1.5, // ~1.5s per minute of video
    summary_short: 1.0, // ~1s per minute of video
    summary_detailed: 4.0, // ~4s per minute of video (Pro + thinking)
    lesson_card: 10.0, // ~10s per minute of video (Pro + deep thinking)
    actions: 3.5, // ~3.5s per minute of video (Pro + thinking)
    flashcards: 2.0, // ~2s per minute of video
  };

  const videoDurationMinutes = videoDurationSeconds / 60;
  const factor = timeFactors[analysisType] || 2.0;

  // Calculate base time
  let estimatedSeconds = Math.ceil(videoDurationMinutes * factor);

  // Add overhead (API processing, N8N workflow, etc.)
  const overhead = analysisType === "lesson_card" ? 30 : 10;
  estimatedSeconds += overhead;

  // Format output
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds}s`;
  } else if (estimatedSeconds < 3600) {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}min`;
  } else {
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.ceil((estimatedSeconds % 3600) / 60);
    return `~${hours}h${minutes > 0 ? minutes + "min" : ""}`;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const VideoDetailPanel: React.FC<VideoDetailPanelProps> = ({
  video,
  channelName,
  onClose,
  onAnalysisStarted: _onAnalysisStarted,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTypes, setGeneratingTypes] = useState<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(
    null,
  );
  const [selectedLanguage, setSelectedLanguage] = useState<"fr" | "en">("fr");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate video duration in seconds for dynamic time estimation
  const videoDurationSeconds = parseDurationToSeconds(video.duration);

  // Fetch existing analyses
  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoadingAnalyses(true);
        const data = await analysesApi.listByVideo(video.id);
        setAnalyses(data);
      } catch (err) {
        console.error("Error fetching analyses:", err);
      } finally {
        setLoadingAnalyses(false);
      }
    };
    fetchAnalyses();
  }, [video.id]);

  // Auto-polling for generating analyses - Fixed: use ref + visibility API
  useEffect(() => {
    // Clear any existing interval FIRST to prevent duplicates
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (generatingTypes.length === 0) return;

    const pollAnalyses = async () => {
      try {
        const data = await analysesApi.listByVideo(video.id);
        setAnalyses(data);

        // Check if any generating types are now complete FOR THE SELECTED LANGUAGE
        const existingTypeLanguageCombos = data.map(
          (a) => `${a.type}_${a.language || "fr"}`,
        );
        setGeneratingTypes((prev) =>
          prev.filter(
            (t) =>
              !existingTypeLanguageCombos.includes(`${t}_${selectedLanguage}`),
          ),
        );
      } catch (err) {
        console.error("Error polling analyses:", err);
      }
    };

    const startPolling = () => {
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(pollAnalyses, 10000);
      }
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
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
  }, [generatingTypes.length, video.id, selectedLanguage]);

  // Track existing analyses by type AND language (e.g., "summary_short_fr", "summary_short_en")
  const existingTypeLanguageCombos = analyses.map(
    (a) => `${a.type}_${a.language || "fr"}`,
  );

  // Check if a type exists for the currently selected language
  const isTypeExistingForLanguage = (typeId: string) =>
    existingTypeLanguageCombos.includes(`${typeId}_${selectedLanguage}`);

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId],
    );
  };

  const handleAnalyze = async () => {
    if (selectedTypes.length === 0) return;

    // Check video duration - warn if too long (>30 minutes = 1800 seconds)
    if (videoDurationSeconds > 1800) {
      const confirmLong = window.confirm(
        `⚠️ Cette vidéo dure ${video.duration} (plus de 30 minutes).\n\n` +
          `Les vidéos longues peuvent échouer car elles dépassent la limite de tokens de l'API Gemini (1M tokens).\n\n` +
          `Recommandations:\n` +
          `- Les vidéos de 30-60 min peuvent fonctionner pour les analyses courtes (Résumé Express, Transcription)\n` +
          `- Les vidéos de 60+ min risquent d'échouer pour toutes les analyses\n\n` +
          `Voulez-vous continuer quand même?`,
      );

      if (!confirmLong) {
        return;
      }
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      await videosApi.analyze(video.id, selectedTypes, selectedLanguage);

      // Add to generating types (panel stays open)
      setGeneratingTypes((prev) => [...prev, ...selectedTypes]);
      setSelectedTypes([]); // Clear selection

      // Don't call onAnalysisStarted() - keep panel open!
      // Show success feedback
      setError(null);
    } catch (err) {
      console.error("Error starting analysis:", err);
      setError("Erreur lors du lancement de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtube_video_id}`;

  // Prepare export data from selected analysis
  const getExportData = (analysis: Analysis): AnalysisExportData => ({
    id: analysis.id,
    type: analysis.type,
    content: analysis.content,
    videoTitle: video.title,
    channelName: channelName || "Unknown",
    createdAt: analysis.created_at,
    videoUrl: youtubeUrl,
    duration: video.duration || undefined,
  });

  // Handle export actions
  const handleExport = async (format: "pdf" | "markdown" | "json") => {
    if (!selectedAnalysis) return;

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const exportData = getExportData(selectedAnalysis);
      const result = await exportAnalysis(exportData, { format });

      if (result.success) {
        setExportSuccess(result.message);
        setTimeout(() => setExportSuccess(null), 3000);
      } else {
        setError(result.message);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("Erreur lors de l'export");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!selectedAnalysis) return;

    setShowExportMenu(false);
    const exportData = getExportData(selectedAnalysis);
    const markdown = generateMarkdown(exportData);

    const success = await copyToClipboard(markdown);
    if (success) {
      setExportSuccess("Copié dans le presse-papier !");
      setTimeout(() => setExportSuccess(null), 3000);
    } else {
      setError("Erreur lors de la copie");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-xl h-full bg-white dark:bg-dark-900 border-l border-light-border dark:border-dark-border overflow-y-auto"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm border-b border-light-border dark:border-dark-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                {video.title}
              </h2>
              {channelName && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {channelName}
                </p>
              )}
            </div>
            <motion.button
              onClick={onClose}
              aria-label="Fermer le panneau"
              className="p-2 hover:bg-light-200 dark:hover:bg-dark-700 rounded-lg transition-colors"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Analysis Content Viewer */}
          {selectedAnalysis ? (
            <>
              {/* Back Button */}
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
              >
                <X size={16} />
                <span className="text-sm">Retour aux analyses</span>
              </button>

              {/* Analysis Header with Export */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const typeConfig = REPORT_TYPES.find(
                        (t) => t.id === selectedAnalysis.type,
                      );
                      return (
                        <div
                          className={`p-2 rounded-lg ${typeConfig?.color || "bg-gray-500/15 text-gray-500 dark:text-gray-300"}`}
                        >
                          {typeConfig?.icon || <FileText size={20} />}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {REPORT_TYPES.find(
                          (t) => t.id === selectedAnalysis.type,
                        )?.label || selectedAnalysis.type}
                      </h3>
                      {/* Language Badge */}
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded ${
                          (selectedAnalysis.language || "fr") === "en"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-lime/20 dark:text-lime text-lime-dark"
                        }`}
                      >
                        {(selectedAnalysis.language || "fr").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Export Dropdown */}
                  <div className="relative">
                    <motion.button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={isExporting}
                      className="flex items-center gap-2 px-3 py-2 bg-lime hover:bg-lime-hover text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isExporting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      <span className="text-sm">Exporter</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                      />
                    </motion.button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl shadow-lg dark:shadow-none overflow-hidden z-20"
                        >
                          <button
                            onClick={() => handleExport("pdf")}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                          >
                            <FileDown size={18} className="text-red-500" />
                            <div>
                              <p className="text-sm font-medium">PDF</p>
                              <p className="text-xs text-gray-500">
                                Document formaté
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => handleExport("markdown")}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                          >
                            <FileText size={18} className="text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">Markdown</p>
                              <p className="text-xs text-gray-500">
                                Fichier .md
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => handleExport("json")}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                          >
                            <FileText size={18} className="text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium">JSON</p>
                              <p className="text-xs text-gray-500">
                                Données brutes
                              </p>
                            </div>
                          </button>
                          <div className="border-t border-light-border dark:border-dark-border" />
                          <button
                            onClick={handleCopyToClipboard}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors text-left"
                          >
                            <Copy
                              size={18}
                              className="dark:text-lime text-lime-dark"
                            />
                            <div>
                              <p className="text-sm font-medium">Copier</p>
                              <p className="text-xs text-gray-500">
                                Presse-papier
                              </p>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Généré le{" "}
                  {new Date(selectedAnalysis.created_at).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>

                {/* Export Success Message */}
                <AnimatePresence>
                  {exportSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400 text-sm"
                    >
                      <Check size={16} />
                      {exportSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Analysis Content */}
              <div className="bg-light-100 dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl p-6">
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
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
                        <li className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                          <span className="dark:text-lime text-lime-dark mt-1.5 flex-shrink-0">
                            •
                          </span>
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900 dark:text-white">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic dark:text-cyan/90 text-cyan-dark/90">
                          {children}
                        </em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-lime/50 pl-4 py-2 my-4 bg-lime/5 rounded-r-lg italic text-gray-600 dark:text-gray-300">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="dark:bg-dark-700 bg-light-300 px-2 py-0.5 rounded dark:text-cyan text-cyan-dark text-sm font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-light-200 dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-lg p-4 overflow-x-auto my-4">
                          {children}
                        </pre>
                      ),
                      hr: () => (
                        <hr className="border-light-border dark:border-dark-border my-6" />
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dark:text-lime text-lime-dark dark:hover:text-lime/80 hover:text-lime-dark-hover underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {selectedAnalysis.content}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Thumbnail & Quick Actions */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-light-200 dark:bg-dark-800">
                <img
                  src={video.thumbnail_url || ""}
                  alt={video.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/640x360/1a1a1a/666?text=Video";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Play size={16} />
                  Voir sur YouTube
                </a>
                {video.duration && (
                  <span className="absolute bottom-3 left-3 px-2 py-1 bg-black/80 text-white text-xs font-medium rounded">
                    {video.duration}
                  </span>
                )}
              </div>

              {/* Video Stats */}
              <div className="grid grid-cols-3 gap-3">
                <motion.div
                  className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl p-3 text-center shadow-sm dark:shadow-none"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.05, borderColor: "#ABF43F" }}
                >
                  <Eye
                    size={18}
                    className="mx-auto text-gray-500 dark:text-gray-400 mb-1"
                  />
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatViews(video.view_count)}
                  </p>
                  <p className="text-xs text-gray-500">vues</p>
                </motion.div>
                <motion.div
                  className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl p-3 text-center shadow-sm dark:shadow-none"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.05, borderColor: "#3FF4E5" }}
                >
                  <ThumbsUp
                    size={18}
                    className="mx-auto text-gray-500 dark:text-gray-400 mb-1"
                  />
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatViews(video.like_count)}
                  </p>
                  <p className="text-xs text-gray-500">likes</p>
                </motion.div>
                <motion.div
                  className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl p-3 text-center shadow-sm dark:shadow-none"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.05, borderColor: "#ABF43F" }}
                >
                  <Calendar
                    size={18}
                    className="mx-auto text-gray-500 dark:text-gray-400 mb-1"
                  />
                  <p className="text-gray-900 dark:text-white font-medium text-sm">
                    {formatDate(video.published_at)}
                  </p>
                  <p className="text-xs text-gray-500">publié</p>
                </motion.div>
              </div>

              {/* Existing Analyses & Generating */}
              {loadingAnalyses ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2
                    size={20}
                    className="animate-spin dark:text-lime text-lime-dark"
                  />
                </div>
              ) : (
                (analyses.length > 0 || generatingTypes.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Analyses existantes
                    </h3>
                    <div className="space-y-2">
                      {/* Generating Analyses - Show first */}
                      {generatingTypes.map((typeId, index) => {
                        const typeConfig = REPORT_TYPES.find(
                          (t) => t.id === typeId,
                        );
                        return (
                          <motion.div
                            key={`generating-${typeId}`}
                            onClick={() => {
                              // Show message that it's still generating
                              setError(
                                "Cette analyse est en cours de génération. Veuillez patienter...",
                              );
                              setTimeout(() => setError(null), 3000);
                            }}
                            className="flex items-center gap-3 p-3 bg-lime/5 dark:bg-dark-800 border border-lime/30 rounded-xl animate-pulse cursor-pointer hover:border-lime/50 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 4 }}
                          >
                            <div
                              className={`p-2 rounded-lg ${typeConfig?.color || "bg-gray-500/15 text-gray-300"}`}
                            >
                              {typeConfig?.icon || <FileText size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {typeConfig?.label || typeId}
                              </p>
                              <p className="text-xs text-lime-dark dark:text-lime">
                                ⏳ Génération en cours...
                              </p>
                            </div>
                            <Loader2
                              size={16}
                              className="dark:text-lime text-lime-dark animate-spin"
                            />
                          </motion.div>
                        );
                      })}

                      {/* Completed Analyses */}
                      {analyses.map((analysis, index) => {
                        const typeConfig = REPORT_TYPES.find(
                          (t) => t.id === analysis.type,
                        );
                        const analysisLanguage = analysis.language || "fr";
                        return (
                          <motion.div
                            key={analysis.id}
                            onClick={() => setSelectedAnalysis(analysis)}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl hover:border-lime/30 cursor-pointer transition-colors shadow-sm dark:shadow-none"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: generatingTypes.length * 0.1 + index * 0.1,
                            }}
                            whileHover={{
                              scale: 1.02,
                              x: 4,
                              borderColor: "#ABF43F4D",
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div
                              className={`p-2 rounded-lg ${typeConfig?.color || "bg-gray-500/15 text-gray-300"}`}
                            >
                              {typeConfig?.icon || <FileText size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {typeConfig?.label || analysis.type}
                                </p>
                                {/* Language Badge */}
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                    analysisLanguage === "en"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-lime/20 dark:text-lime text-lime-dark"
                                  }`}
                                >
                                  {analysisLanguage.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  analysis.created_at,
                                ).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                            <Check
                              size={16}
                              className="dark:text-lime text-lime-dark"
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              {/* Analysis Type Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Générer des analyses
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedTypes.length} sélectionné
                    {selectedTypes.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Language Toggle */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-xl shadow-sm dark:shadow-none">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Langue de l'analyse
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-light-200 dark:bg-dark-700 rounded-lg">
                    <motion.button
                      onClick={() => setSelectedLanguage("fr")}
                      className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${
                      selectedLanguage === "fr"
                        ? "bg-lime text-black shadow-lg shadow-lime/20"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }
                  `}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      FR
                    </motion.button>
                    <motion.button
                      onClick={() => setSelectedLanguage("en")}
                      className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${
                      selectedLanguage === "en"
                        ? "bg-lime text-black shadow-lg shadow-lime/20"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }
                  `}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      EN
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map((type, index) => {
                    const isSelected = selectedTypes.includes(type.id);
                    const isExistingForCurrentLanguage =
                      isTypeExistingForLanguage(type.id);
                    const isLongVideo = videoDurationSeconds > 1800; // >30 min
                    const isRiskyForLongVideo =
                      isLongVideo &&
                      (type.id === "lesson_card" ||
                        type.id === "summary_detailed");

                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`
                      relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left
                      ${
                        isSelected
                          ? "bg-lime/10 border-lime shadow-lg shadow-lime/10"
                          : "bg-white dark:bg-dark-800 border-light-border dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500 shadow-sm dark:shadow-none"
                      }
                      ${isRiskyForLongVideo ? "opacity-75" : ""}
                    `}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Badge "Déjà fait" pour les analyses existantes DANS LA LANGUE SÉLECTIONNÉE */}
                        {isExistingForCurrentLanguage && (
                          <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                            <Check size={10} />
                            {selectedLanguage.toUpperCase()}
                          </span>
                        )}

                        {/* Badge "Risqué" pour analyses longues sur vidéos longues */}
                        {isRiskyForLongVideo &&
                          !isExistingForCurrentLanguage && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                              ⚠️ Risqué
                            </span>
                          )}

                        {/* Indicateur de sélection */}
                        {isSelected && (
                          <span className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-lime rounded-full flex items-center justify-center">
                              <Check size={12} className="text-black" />
                            </div>
                          </span>
                        )}

                        {/* Icône toujours colorée selon le type */}
                        <div className={`p-1.5 rounded-lg mb-2 ${type.color}`}>
                          {type.icon}
                        </div>

                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-1">
                          {type.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${type.model === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"}`}
                          >
                            {type.model}
                          </span>
                          <span className="text-xs text-gray-500">
                            {calculateEstimatedTime(
                              videoDurationSeconds,
                              type.id,
                            )}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <motion.button
                onClick={handleAnalyze}
                disabled={selectedTypes.length === 0 || isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime hover:bg-lime-hover text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{
                  scale: selectedTypes.length > 0 && !isAnalyzing ? 1.02 : 1,
                }}
                whileTap={{
                  scale: selectedTypes.length > 0 && !isAnalyzing ? 0.98 : 1,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Lancer l'analyse ({selectedTypes.length} type
                    {selectedTypes.length > 1 ? "s" : ""})
                  </>
                )}
              </motion.button>

              {/* Description */}
              {video.description && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Description
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-6">
                    {video.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VideoDetailPanel;
