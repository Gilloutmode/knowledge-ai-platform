import React from "react";
import { Bell, Moon, Sun, User, ChevronDown, Monitor } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { GlobalSearch } from "../GlobalSearch";

interface HeaderProps {
  title: string;
  breadcrumb?: string[];
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  breadcrumb = [],
  notificationCount = 0,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  const themeOptions = [
    { value: "light" as const, label: "Clair", icon: Sun },
    { value: "dark" as const, label: "Sombre", icon: Moon },
    { value: "system" as const, label: "Système", icon: Monitor },
  ];

  return (
    <header className="h-16 bg-white/90 dark:bg-dark-900/80 backdrop-blur-xl border-b border-light-border dark:border-dark-border sticky top-0 z-40 transition-colors duration-200">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Breadcrumb & Title */}
        <div className="flex items-center gap-2">
          {breadcrumb.length > 0 && (
            <>
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                Main
              </span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
            </>
          )}
          <h1 className="text-gray-900 dark:text-white font-semibold text-lg transition-colors">
            {title}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <GlobalSearch />

          {/* Theme Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              aria-label="Changer le thème"
              aria-expanded={showThemeMenu}
              aria-haspopup="true"
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200
                bg-light-100 dark:bg-dark-800
                border border-light-border dark:border-dark-border
                hover:bg-light-200 dark:hover:bg-dark-700
              `}
            >
              {resolvedTheme === "dark" ? (
                <Moon size={16} className="dark:text-lime text-lime-dark" />
              ) : (
                <Sun size={16} className="text-amber-500" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {theme === "system"
                  ? "Auto"
                  : theme === "dark"
                    ? "Sombre"
                    : "Clair"}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${showThemeMenu ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showThemeMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowThemeMenu(false)}
                />

                {/* Menu */}
                <div
                  className="absolute right-0 top-full mt-2 z-50 w-40 py-1 rounded-xl shadow-lg border
                  bg-white dark:bg-dark-800
                  border-light-border dark:border-dark-border
                  animate-fade-in
                "
                >
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTheme(option.value);
                          setShowThemeMenu(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                          ${
                            isActive
                              ? "dark:text-lime text-lime-dark bg-lime/10"
                              : "text-gray-600 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700"
                          }
                        `}
                      >
                        <Icon size={16} />
                        <span>{option.label}</span>
                        {isActive && (
                          <span className="ml-auto dark:text-lime text-lime-dark">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} nouvelles)` : ""}`}
            className="relative p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white
              hover:bg-light-200 dark:hover:bg-dark-700 rounded-xl transition-colors"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-lime rounded-full animate-pulse" />
            )}
          </button>

          {/* User Menu */}
          <button
            aria-label="Menu utilisateur"
            aria-haspopup="true"
            className="flex items-center gap-2 p-1.5 pr-3
              bg-light-100 dark:bg-dark-800
              hover:bg-light-200 dark:hover:bg-dark-700
              rounded-full transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-lime to-cyan rounded-full flex items-center justify-center">
              <User size={16} className="text-black" />
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
