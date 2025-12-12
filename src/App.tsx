import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const ContentsPage = lazy(() =>
  import("./pages/Contents").then((m) => ({ default: m.ContentsPage })),
);
const SourcesPage = lazy(() =>
  import("./pages/Sources").then((m) => ({ default: m.SourcesPage })),
);
const YouTubeSourcesPage = lazy(() =>
  import("./pages/YouTubeSources").then((m) => ({
    default: m.YouTubeSourcesPage,
  })),
);
const ChatPage = lazy(() =>
  import("./pages/Chat").then((m) => ({ default: m.ChatPage })),
);
const AddSourcePage = lazy(() =>
  import("./pages/AddSource").then((m) => ({ default: m.AddSourcePage })),
);
const ChannelsPage = lazy(() =>
  import("./pages/Channels").then((m) => ({ default: m.ChannelsPage })),
);
const VideosPage = lazy(() =>
  import("./pages/Videos").then((m) => ({ default: m.VideosPage })),
);
const AnalysesPage = lazy(() =>
  import("./pages/Analyses").then((m) => ({ default: m.AnalysesPage })),
);
const NotificationsPage = lazy(() =>
  import("./pages/Notifications").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.SettingsPage })),
);
const AddChannelPage = lazy(() =>
  import("./pages/AddChannel").then((m) => ({ default: m.AddChannelPage })),
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2
        size={32}
        className="animate-spin dark:text-lime text-lime-dark"
      />
    </div>
  );
}

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Main Navigation */}
            <Route
              path="/"
              element={<Dashboard onNavigate={handleNavigate} />}
            />
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
              element={
                <AddChannelPage onSuccess={() => navigate("/channels")} />
              }
            />

            {/* Utility routes */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
