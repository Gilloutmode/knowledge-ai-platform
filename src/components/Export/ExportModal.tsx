import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  FileJson,
  FileDown,
  Copy,
  Check,
  Loader2,
  Download,
  Settings,
} from 'lucide-react';
import {
  ExportFormat,
  ExportOptions,
  AnalysisExportData,
  exportAnalysis,
  copyToClipboard,
  generateMarkdown,
} from '../../services/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyses: AnalysisExportData[];
  singleAnalysis?: boolean;
}

const formatOptions: { format: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  {
    format: 'markdown',
    label: 'Markdown',
    icon: <FileText size={20} />,
    description: 'Format texte structuré, idéal pour notes et documentation',
  },
  {
    format: 'pdf',
    label: 'PDF',
    icon: <FileDown size={20} />,
    description: 'Document formaté, idéal pour partage et impression',
  },
  {
    format: 'json',
    label: 'JSON',
    icon: <FileJson size={20} />,
    description: 'Données brutes, idéal pour intégration technique',
  },
];

const templateOptions: { value: ExportOptions['template']; label: string; description: string }[] = [
  { value: 'default', label: 'Standard', description: 'Contenu avec informations de base' },
  { value: 'minimal', label: 'Minimal', description: 'Contenu uniquement, sans métadonnées' },
  { value: 'detailed', label: 'Détaillé', description: 'Toutes les informations disponibles' },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  analyses,
  singleAnalysis = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [template, setTemplate] = useState<ExportOptions['template']>('default');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    const options: ExportOptions = {
      format: selectedFormat,
      template,
      includeMetadata,
      includeTimestamps,
    };

    const result = await exportAnalysis(singleAnalysis ? analyses[0] : analyses, options);
    setExportResult(result);
    setIsExporting(false);

    if (result.success) {
      setTimeout(() => {
        onClose();
        setExportResult(null);
      }, 1500);
    }
  };

  const handleCopy = async () => {
    if (analyses.length === 0) return;

    const content = generateMarkdown(analyses[0], {
      format: 'markdown',
      template,
      includeMetadata,
      includeTimestamps,
    });

    const success = await copyToClipboard(content);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-dark-border border-light-border">
            <div>
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                Exporter {singleAnalysis ? 'l\'analyse' : `${analyses.length} analyses`}
              </h2>
              <p className="text-sm dark:text-gray-400 text-gray-500 mt-0.5">
                Choisissez le format et les options d'export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-600 mb-2">
                Format d'export
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatOptions.map((option) => (
                  <button
                    key={option.format}
                    onClick={() => setSelectedFormat(option.format)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      selectedFormat === option.format
                        ? 'bg-lime/20 border-lime dark:text-lime text-lime-dark'
                        : 'dark:bg-dark-700 bg-light-100 dark:border-dark-border border-light-border dark:text-gray-300 text-gray-600 dark:hover:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs dark:text-gray-500 text-gray-400">
                {formatOptions.find((o) => o.format === selectedFormat)?.description}
              </p>
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-500 dark:hover:text-lime hover:text-lime-dark transition-colors"
            >
              <Settings size={14} />
              Options avancées
              <span className="text-xs">({showAdvanced ? '−' : '+'})</span>
            </button>

            {/* Advanced Options */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* Template Selection (only for markdown/pdf) */}
                  {selectedFormat !== 'json' && (
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-600 mb-2">
                        Modèle
                      </label>
                      <div className="space-y-2">
                        {templateOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTemplate(option.value)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                              template === option.value
                                ? 'bg-lime/10 border-lime/30 dark:text-white text-gray-900'
                                : 'dark:bg-dark-700 bg-light-100 dark:border-dark-border border-light-border dark:text-gray-300 text-gray-600'
                            }`}
                          >
                            <div>
                              <span className="font-medium text-sm">{option.label}</span>
                              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                                {option.description}
                              </p>
                            </div>
                            {template === option.value && <Check size={16} className="dark:text-lime text-lime-dark" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          includeMetadata ? 'bg-lime' : 'dark:bg-dark-600 bg-light-300'
                        }`}
                        onClick={() => setIncludeMetadata(!includeMetadata)}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            includeMetadata ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm dark:text-gray-300 text-gray-600 group-hover:dark:text-white group-hover:text-gray-900 transition-colors">
                        Inclure les métadonnées (titre, chaîne, etc.)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          includeTimestamps ? 'bg-lime' : 'dark:bg-dark-600 bg-light-300'
                        }`}
                        onClick={() => setIncludeTimestamps(!includeTimestamps)}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            includeTimestamps ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm dark:text-gray-300 text-gray-600 group-hover:dark:text-white group-hover:text-gray-900 transition-colors">
                        Inclure les horodatages
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Message */}
            {exportResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${
                  exportResult.success
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {exportResult.message}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t dark:border-dark-border border-light-border dark:bg-dark-900/50 bg-light-100/50">
            {/* Copy Button (only for single markdown) */}
            {singleAnalysis && selectedFormat === 'markdown' && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm dark:text-gray-300 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-all"
              >
                {isCopied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copier
                  </>
                )}
              </button>
            )}
            {!singleAnalysis || selectedFormat !== 'markdown' ? <div /> : null}

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || analyses.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-lime text-black font-medium rounded-xl hover:bg-lime-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Télécharger
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExportModal;
