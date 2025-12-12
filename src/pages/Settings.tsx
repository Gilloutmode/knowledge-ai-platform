import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Key,
  Save,
  Check,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [defaultLanguage, setDefaultLanguage] = useState<"fr" | "en">("fr");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
  }> = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-all duration-200
        ${checked ? "bg-lime" : "bg-gray-300 dark:bg-dark-500"}
      `}
    >
      <span
        className={`
          absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm
          ${checked ? "left-7" : "left-1"}
        `}
      />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-light-200 dark:bg-dark-700 rounded-xl">
          <SettingsIcon size={24} className="text-gray-700 dark:text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Paramètres
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configurez votre expérience
          </p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <User size={20} className="text-lime-dark dark:text-lime" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profil
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-lime to-cyan rounded-full flex items-center justify-center">
            <User size={32} className="text-black" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Votre nom"
              defaultValue="Utilisateur"
              className="input mb-3"
            />
            <input
              type="email"
              placeholder="email@exemple.com"
              defaultValue="user@example.com"
              className="input"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <Globe size={20} className="text-cyan-dark dark:text-cyan" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Préférences
          </h2>
        </div>

        <div className="space-y-6">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium">
                Langue par défaut
              </h3>
              <p className="text-gray-500 text-sm">
                Langue des analyses générées
              </p>
            </div>
            <div className="flex items-center bg-light-200 dark:bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setDefaultLanguage("fr")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  defaultLanguage === "fr"
                    ? "bg-lime text-black"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => setDefaultLanguage("en")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  defaultLanguage === "en"
                    ? "bg-lime text-black"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Auto Analyze */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium">
                Analyse automatique
              </h3>
              <p className="text-gray-500 text-sm">
                Analyser automatiquement les nouvelles vidéos
              </p>
            </div>
            <ToggleSwitch checked={autoAnalyze} onChange={setAutoAnalyze} />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
        </div>

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium">
                Notifications par email
              </h3>
              <p className="text-gray-500 text-sm">
                Recevoir un email pour chaque nouvelle analyse
              </p>
            </div>
            <ToggleSwitch
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <Key size={20} className="text-orange-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Clés API
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              ElevenLabs API Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              Nano Banana Pro API Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`
          w-full btn py-4 text-lg font-semibold transition-all
          ${saved ? "bg-green-500 text-white" : "btn-primary"}
        `}
      >
        {saved ? (
          <>
            <Check size={20} />
            Enregistré !
          </>
        ) : (
          <>
            <Save size={20} />
            Enregistrer les modifications
          </>
        )}
      </button>
    </div>
  );
};

export default SettingsPage;
