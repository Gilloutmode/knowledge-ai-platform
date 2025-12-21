import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Zap,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
  Download,
  X,
  ExternalLink,
  Clock,
  Eye,
  FileDown,
  FileJson,
  ChevronDown,
  Loader2,
  Check,
} from "lucide-react";
import { AnalysisWithVideo } from "../services/api";
import {
  exportAnalysis,
  AnalysisExportData,
  ExportFormat,
} from "../services/export";

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
    color: "bg-orange-500/15 text-orange-400",
  },
  {
    id: "summary_detailed",
    label: "Résumé Complet",
    icon: <BookOpen size={16} />,
    color: "bg-blue-500/15 text-blue-400",
  },
  {
    id: "lesson_card",
    label: "Fiche de Cours",
    icon: <GraduationCap size={16} />,
    color: "bg-lime/15 text-lime",
  },
  {
    id: "actions",
    label: "Actions",
    icon: <CheckSquare size={16} />,
    color: "bg-amber-500/15 text-amber-400",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: <Layers size={16} />,
    color: "bg-purple-500/15 text-purple-400",
  },
];

const EXPORT_OPTIONS: {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    format: "markdown",
    label: "Markdown",
    icon: <FileText size={16} />,
    description: "Format texte structuré",
  },
  {
    format: "pdf",
    label: "PDF",
    icon: <FileDown size={16} />,
    description: "Document formaté",
  },
  {
    format: "json",
    label: "JSON",
    icon: <FileJson size={16} />,
    description: "Données brutes",
  },
];

function getTypeConfig(type: string): ReportTypeConfig {
  return REPORT_TYPES.find((t) => t.id === type) || REPORT_TYPES[0];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

interface AnalysisDetailModalProps {
  analysis: AnalysisWithVideo;
  onClose: () => void;
}

export const AnalysisDetailModal: React.FC<AnalysisDetailModalProps> = ({
  analysis,
  onClose,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<ExportFormat | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const typeConfig = getTypeConfig(analysis.type);
  const videoTitle = analysis.videos?.title || "Vidéo inconnue";
  const channelName = analysis.videos?.channels?.name || "Chaîne inconnue";
  const thumbnail = analysis.videos?.thumbnail_url || "";
  const youtubeUrl = analysis.videos?.youtube_video_id
    ? `https://www.youtube.com/watch?v=${analysis.videos.youtube_video_id}`
    : null;
  const wordCount = countWords(analysis.content);
  const readTime = Math.ceil(wordCount / 200);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportSuccess(null);

    const exportData: AnalysisExportData = {
      id: analysis.id,
      type: analysis.type,
      content: analysis.content,
      videoTitle,
      channelName,
      createdAt: analysis.created_at,
      videoUrl: youtubeUrl || undefined,
    };

    try {
      const result = await exportAnalysis(exportData, {
        format,
        includeMetadata: true,
        includeTimestamps: true,
        template: "detailed",
      });

      if (result.success) {
        setExportSuccess(format);
        setTimeout(() => {
          setExportSuccess(null);
          setShowExportMenu(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
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
          <div className="relative h-24">
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                style={{ backgroundImage: `url(${thumbnail})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
            </div>

            {/* Action buttons - outside overflow-hidden */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
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

              {/* Export dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 dark:bg-dark-800/80 bg-light-200/80 dark:hover:bg-dark-700 hover:bg-light-300 rounded-lg transition-colors backdrop-blur-sm"
                  title="Exporter l'analyse"
                >
                  <Download
                    size={16}
                    className="dark:text-gray-300 text-gray-600"
                  />
                  <ChevronDown
                    size={14}
                    className={`dark:text-gray-400 text-gray-500 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Export menu dropdown */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Format d'export
                      </div>
                      {EXPORT_OPTIONS.map((option) => (
                        <button
                          key={option.format}
                          onClick={() => handleExport(option.format)}
                          disabled={isExporting}
                          className="w-full flex items-center gap-3 px-3 py-2.5 dark:hover:bg-dark-700 hover:bg-light-100 rounded-lg transition-colors text-left group disabled:opacity-50"
                        >
                          <span
                            className={`p-1.5 rounded-lg ${
                              exportSuccess === option.format
                                ? "bg-green-500/20 text-green-400"
                                : "dark:bg-dark-600 bg-light-200 dark:text-gray-300 text-gray-600 group-hover:dark:bg-lime/20 group-hover:bg-lime/20 group-hover:dark:text-lime group-hover:text-lime-dark"
                            } transition-colors`}
                          >
                            {isExporting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : exportSuccess === option.format ? (
                              <Check size={16} />
                            ) : (
                              option.icon
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium dark:text-white text-gray-900">
                              {option.label}
                            </div>
                            <div className="text-xs dark:text-gray-500 text-gray-400">
                              {option.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                  loading="lazy"
                  decoding="async"
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

export default AnalysisDetailModal;
