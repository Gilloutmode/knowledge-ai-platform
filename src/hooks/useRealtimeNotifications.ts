import { useEffect, useState, useCallback } from 'react';
import { supabase, notificationsApi, Database } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll();
      const notificationData = (data || []) as Notification[];
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter((n: Notification) => !n.read).length);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime changes on notifications table
    const channel: RealtimeChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          if (!newNotification.read) {
            setUnreadCount((prev) => prev + 1);
            // Show browser notification if permitted
            showBrowserNotification(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

// Also subscribe to analyses table for real-time analysis notifications
export function useRealtimeAnalyses(onNewAnalysis?: (analysis: unknown) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('analyses-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analyses',
        },
        (payload) => {
          if (onNewAnalysis) {
            onNewAnalysis(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewAnalysis]);
}

// Browser notification helper
function showBrowserNotification(notification: Notification) {
  // Check if browser notifications are supported and permitted
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    createNotification(notification);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        createNotification(notification);
      }
    });
  }
}

function createNotification(notification: Notification) {
  const icons: Record<string, string> = {
    new_video: '🎬',
    analysis_ready: '📊',
    content_ready: '✨',
  };

  new Notification(notification.title, {
    body: notification.message,
    icon: icons[notification.type] || '🔔',
    tag: notification.id,
  });
}

export default useRealtimeNotifications;
