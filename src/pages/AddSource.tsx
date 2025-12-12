import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Youtube,
  Rss,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

type SourceType = "youtube" | "rss" | "document";

interface SourceTypeOption {
  id: SourceType;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

const sourceTypes: SourceTypeOption[] = [
  {
    id: "youtube",
    name: "Chaîne YouTube",
    description: "Suivez automatiquement les nouvelles vidéos",
    icon: <Youtube size={24} className="text-red-500" />,
    available: true,
  },
  {
    id: "rss",
    name: "Flux RSS",
    description: "Agrégez vos blogs et newsletters",
    icon: <Rss size={24} className="text-orange-500" />,
    available: false,
  },
  {
    id: "document",
    name: "Document",
    description: "Uploadez des PDF, articles, rapports",
    icon: <FileText size={24} className="text-blue-500" />,
    available: false,
  },
];

export function AddSourcePage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);

  const handleContinue = () => {
    if (selectedType === "youtube") {
      navigate("/add-channel");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-lime transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900">
          Ajouter une source
        </h1>
        <p className="dark:text-gray-400 text-gray-600 mt-1">
          Choisissez le type de source que vous souhaitez ajouter
        </p>
      </div>

      {/* Source Type Selection */}
      <div className="space-y-4 mb-8">
        {sourceTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => type.available && setSelectedType(type.id)}
            disabled={!type.available}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              ${
                selectedType === type.id
                  ? "border-lime dark:bg-lime/10 bg-lime/5"
                  : type.available
                    ? "dark:border-dark-border border-light-border dark:hover:border-gray-600 hover:border-gray-300"
                    : "dark:border-dark-border border-light-border opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedType === type.id
                    ? "bg-lime/20"
                    : "dark:bg-dark-700 bg-light-200"
                }`}
              >
                {type.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold dark:text-white text-gray-900">
                    {type.name}
                  </h3>
                  {!type.available && (
                    <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">
                      Bientôt
                    </span>
                  )}
                </div>
                <p className="text-sm dark:text-gray-400 text-gray-600">
                  {type.description}
                </p>
              </div>
              {selectedType === type.id && (
                <Check size={20} className="text-lime" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/sources")}
          className="btn btn-secondary flex-1"
        >
          Annuler
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedType}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default AddSourcePage;
