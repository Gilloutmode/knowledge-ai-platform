import React, { useEffect } from "react";
import {
  Bell,
  PlayCircle,
  FileText,
  Sparkles,
  Check,
  MoreVertical,
  Loader2,
  BellOff,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";
import { Database } from "../lib/supabase";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const NotificationCard: React.FC<{
  notification: Notification;
  onMarkRead: (id: string) => void;
}> = ({ notification, onMarkRead }) => {
  const iconConfig = {
    new_video: {
      icon: <PlayCircle size={20} />,
      color: "bg-cyan-muted dark:text-cyan text-cyan-dark",
    },
    analysis_ready: {
      icon: <FileText size={20} />,
      color: "bg-lime-muted dark:text-lime text-lime-dark",
    },
    content_ready: {
      icon: <Sparkles size={20} />,
      color: "bg-purple-500/15 text-purple-400",
    },
  };

  const config = iconConfig[notification.type] || iconConfig.analysis_ready;

  // Format time relative
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60)
      return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24)
      return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 7)
      return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`
        group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
        ${
          notification.read
            ? "bg-light-100 dark:bg-dark-900 border-light-border dark:border-dark-border"
            : "bg-white dark:bg-dark-800 border-lime-dark/20 dark:border-lime/20 hover:border-lime-dark/40 dark:hover:border-lime/40 shadow-sm dark:shadow-none"
        }
      `}
      onClick={() => !notification.read && onMarkRead(notification.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Icon */}
      <div className={`p-2 rounded-xl ${config.color}`}>{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4
              className={`font-medium ${notification.read ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}
            >
              {notification.title}
            </h4>
            <p
              className={`text-sm mt-0.5 ${notification.read ? "text-gray-500" : "text-gray-600 dark:text-gray-400"}`}
            >
              {notification.message}
            </p>
          </div>
          {!notification.read && (
            <motion.span
              className="w-2 h-2 bg-lime rounded-full flex-shrink-0 mt-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {formatTime(notification.created_at)}
        </p>
      </div>

      {/* Actions */}
      <button className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-light-200 dark:hover:bg-dark-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
        <MoreVertical size={16} />
      </button>
    </motion.div>
  );
};

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useRealtimeNotifications();

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lime-muted rounded-xl">
            <Bell size={24} className="dark:text-lime text-lime-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {loading
                ? "Chargement..."
                : unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Toutes les notifications sont lues"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <motion.button
            onClick={refetch}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-light-200 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Actualiser"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </motion.button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <motion.button
              onClick={markAllAsRead}
              className="btn btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check size={18} />
              Tout marquer comme lu
            </motion.button>
          )}
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
        </span>
        Notifications en temps réel activées
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2
            size={32}
            className="animate-spin dark:text-lime text-lime-dark mb-4"
          />
          <p className="text-gray-500">Chargement des notifications...</p>
        </div>
      ) : (
        <>
          {/* Notifications List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 bg-light-100 dark:bg-dark-800 border border-light-border dark:border-dark-border rounded-2xl"
                >
                  <div className="p-4 bg-light-200 dark:bg-dark-700 rounded-full inline-block mb-4">
                    <BellOff size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucune notification
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Vous recevrez des notifications lorsque de nouvelles vidéos
                    seront détectées ou que des analyses seront terminées.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Browser Notification Permission */}
          {"Notification" in window &&
            Notification.permission === "default" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-cyan-muted border border-cyan/20 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="dark:text-cyan text-cyan-dark" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Activer les notifications du navigateur
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Recevez des alertes même quand l'app n'est pas ouverte
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => Notification.requestPermission()}
                    className="btn btn-primary text-sm"
                  >
                    Activer
                  </button>
                </div>
              </motion.div>
            )}

          {/* Permission Granted */}
          {"Notification" in window &&
            Notification.permission === "granted" && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check size={16} />
                Notifications du navigateur activées
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
