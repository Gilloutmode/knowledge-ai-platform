import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Dashboard } from "./pages/Dashboard";
import { ContentsPage } from "./pages/Contents";
import { SourcesPage } from "./pages/Sources";
import { YouTubeSourcesPage } from "./pages/YouTubeSources";
import { ChatPage } from "./pages/Chat";
import { AddSourcePage } from "./pages/AddSource";
import { ChannelsPage } from "./pages/Channels";
import { VideosPage } from "./pages/Videos";
import { AnalysesPage } from "./pages/Analyses";
import { NotificationsPage } from "./pages/Notifications";
import { SettingsPage } from "./pages/Settings";
import { AddChannelPage } from "./pages/AddChannel";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";

// Page title mapping based on route
const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/contents": "Contents",
    "/sources": "Sources",
    "/sources/youtube": "YouTube",
    "/chat": "Chat",
    "/add-source": "Ajouter une source",
    "/channels": "Chaînes YouTube",
    "/videos": "Vidéos",
    "/analyses": "Analyses",
    "/notifications": "Notifications",
    "/settings": "Paramètres",
    "/add-channel": "Ajouter une chaîne",
  };
  return titles[pathname] || "Dashboard";
};

function App() {
  const { unreadCount } = useRealtimeNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string, channelId?: string) => {
    if (channelId) {
      navigate(`${path}?channelId=${channelId}`);
    } else {
      navigate(path);
    }
  };

  return (
    <Layout
      pageTitle={getPageTitle(location.pathname)}
      notificationCount={unreadCount}
    >
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // Log errors for monitoring (could send to external service)
          console.error("Application error:", {
            error,
            errorInfo,
            path: location.pathname,
          });
        }}
      >
        <Routes>
          {/* Main Navigation */}
          <Route path="/" element={<Dashboard onNavigate={handleNavigate} />} />
          <Route
            path="/dashboard"
            element={<Dashboard onNavigate={handleNavigate} />}
          />
          <Route path="/contents" element={<ContentsPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/sources/youtube" element={<YouTubeSourcesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/add-source" element={<AddSourcePage />} />

          {/* Legacy routes (kept for backward compatibility) */}
          <Route
            path="/channels"
            element={<ChannelsPage onNavigate={handleNavigate} />}
          />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/analyses" element={<AnalysesPage />} />
          <Route
            path="/add-channel"
            element={<AddChannelPage onSuccess={() => navigate("/channels")} />}
          />

          {/* Utility routes */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
