import React, { useState } from 'react';
import {
  Youtube,
  Link,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Users,
  Video,
} from 'lucide-react';
import { channelsApi, ChannelPreview, ApiError } from '../services/api';

interface AddChannelPageProps {
  onSuccess: () => void;
}

export const AddChannelPage: React.FC<AddChannelPageProps> = ({ onSuccess }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSearch = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const channelPreview = await channelsApi.preview(url);
      setPreview(channelPreview);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Cette chaîne est déjà dans votre bibliothèque.');
        } else if (err.status === 404) {
          setError("Chaîne YouTube non trouvée. Vérifiez l'URL.");
        } else {
          setError(err.message);
        }
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!preview) return;

    setIsAdding(true);
    setError(null);

    try {
      await channelsApi.add(url);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue lors de l'ajout.");
      }
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex p-4 bg-lime-muted rounded-2xl mb-4">
          <Youtube size={32} className="dark:text-lime text-lime-dark" />
        </div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900">Ajouter une chaîne YouTube</h1>
        <p className="dark:text-gray-400 text-gray-500 mt-2">
          Entrez l'URL d'une chaîne YouTube pour commencer à suivre ses vidéos
        </p>
      </div>

      {/* Input Section */}
      <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-2xl p-6">
        <label className="block text-sm dark:text-gray-400 text-gray-500 mb-2">URL de la chaîne</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/@channel ou https://youtube.com/c/channel"
              className="input pl-11"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!url.trim() || isLoading}
            className="btn btn-primary px-6"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Rechercher
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Examples */}
        <div className="mt-4 text-sm dark:text-gray-500 text-gray-400">
          <p className="mb-2">Exemples de formats acceptés :</p>
          <ul className="space-y-1 dark:text-gray-600 text-gray-500">
            <li>• https://youtube.com/@ycombinator</li>
            <li>• https://youtube.com/c/YCombinator</li>
            <li>• https://youtube.com/channel/UCcefcZRL2oaA_uBNeo5UOWg</li>
          </ul>
        </div>
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="dark:bg-dark-800 bg-white border border-lime/20 rounded-2xl p-6 animate-scale-in">
          <div className="flex items-center gap-2 mb-4 dark:text-lime text-lime-dark">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Chaîne trouvée</span>
          </div>

          <div className="flex gap-6">
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-full overflow-hidden dark:bg-dark-700 bg-light-300 flex-shrink-0">
              <img
                src={preview.thumbnail}
                alt={preview.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold dark:text-white text-gray-900">{preview.name}</h3>
              <p className="dark:text-gray-400 text-gray-500 text-sm mt-1 line-clamp-2">{preview.description}</p>

              <div className="flex items-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2 dark:text-gray-300 text-gray-600">
                  <Users size={16} className="dark:text-lime text-lime-dark" />
                  {preview.subscribers} abonnés
                </span>
                <span className="flex items-center gap-2 dark:text-gray-300 text-gray-600">
                  <Video size={16} className="dark:text-cyan text-cyan-dark" />
                  {preview.videoCount} vidéos
                </span>
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full btn btn-primary mt-6 py-3"
          >
            {isAdding ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                Ajouter cette chaîne
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-br from-cyan/10 to-lime/5 border border-cyan/20 rounded-2xl p-6">
        <h3 className="dark:text-white text-gray-900 font-semibold mb-3">Ce qui va se passer</h3>
        <ul className="space-y-2 dark:text-gray-400 text-gray-500 text-sm">
          <li className="flex items-start gap-2">
            <span className="dark:text-lime text-lime-dark">1.</span>
            La chaîne sera analysée pour identifier sa niche et son créateur
          </li>
          <li className="flex items-start gap-2">
            <span className="dark:text-lime text-lime-dark">2.</span>
            Toutes les vidéos existantes seront importées
          </li>
          <li className="flex items-start gap-2">
            <span className="dark:text-lime text-lime-dark">3.</span>
            Les nouvelles vidéos seront automatiquement détectées
          </li>
          <li className="flex items-start gap-2">
            <span className="dark:text-lime text-lime-dark">4.</span>
            Vous recevrez une notification pour chaque nouvelle vidéo
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AddChannelPage;
