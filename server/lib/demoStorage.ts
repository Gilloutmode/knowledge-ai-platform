// Shared in-memory storage for demo mode

export interface DemoChannel {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  video_count: number;
  niche: string | null;
  bio_profile: Record<string, unknown> | null;
  last_video_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoVideo {
  id: string;
  channel_id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  view_count: number;
  like_count: number;
  published_at: string;
  analysis_status: string;
  created_at: string;
}

// Shared storage maps
export const demoChannels = new Map<string, DemoChannel>();
export const demoVideos = new Map<string, DemoVideo>();

// Helper to check if we're in demo mode
export const isDemoMode =
  !process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
