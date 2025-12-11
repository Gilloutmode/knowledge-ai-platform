// ============================================
// YOUTUBE KNOWLEDGE PLATFORM - SHARED TYPES
// ============================================

// -----------------------------
// Enums
// -----------------------------

export type ReportType =
  | 'transcript'
  | 'summary_short'
  | 'summary_detailed'
  | 'lesson_card'
  | 'actions'
  | 'flashcards';

export type VideoSource = 'upload' | 'youtube';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ContentType =
  | 'script_short'
  | 'script_long'
  | 'voiceover'
  | 'image'
  | 'video'
  | 'carousel';

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'threads' | 'x' | 'youtube';

export type NotificationType = 'new_video' | 'analysis_ready' | 'content_ready';

export type Language = 'fr' | 'en';

// -----------------------------
// Database Models
// -----------------------------

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  default_language: Language;
  email_notifications: boolean;
  auto_analyze_new_videos: boolean;
  default_report_types: ReportType[];
}

export interface Channel {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  banner_url?: string;
  niche?: string;
  bio_profile?: CreatorBioProfile;
  subscriber_count: number;
  video_count: number;
  last_checked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreatorBioProfile {
  summary: string;
  expertise_areas: string[];
  content_style: string;
  target_audience: string;
  notable_topics: string[];
  posting_frequency?: string;
}

export interface Video {
  id: string;
  channel_id: string;
  youtube_video_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  duration: string;
  view_count: number;
  like_count?: number;
  published_at: Date;
  analysis_status: AnalysisStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Analysis {
  id: string;
  video_id: string;
  type: ReportType;
  language: Language;
  content: string; // Markdown
  metadata?: AnalysisMetadata;
  created_at: Date;
}

export interface AnalysisMetadata {
  model_used: string;
  tokens_used: number;
  processing_time_ms: number;
  thinking_enabled: boolean;
}

export interface GeneratedContent {
  id: string;
  video_id: string;
  analysis_id?: string;
  type: ContentType;
  platform: Platform;
  title?: string;
  content: string;
  media_url?: string;
  metadata?: ContentMetadata;
  status: 'draft' | 'ready' | 'published';
  created_at: Date;
  updated_at: Date;
}

export interface ContentMetadata {
  duration_seconds?: number;
  voice_id?: string;
  image_prompt?: string;
  format?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  video_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  sent_at?: Date;
  created_at: Date;
}

// -----------------------------
// API Request/Response Types
// -----------------------------

export interface AddChannelRequest {
  youtube_url: string;
}

export interface AddChannelResponse {
  channel: Channel;
  videos_count: number;
}

export interface AnalyzeVideoRequest {
  video_id: string;
  types: ReportType[];
  language: Language;
}

export interface GenerateContentRequest {
  video_id: string;
  type: ContentType;
  platform: Platform;
  options?: {
    duration?: 'short' | 'medium' | 'long';
    tone?: 'educational' | 'entertaining' | 'professional';
    voice_id?: string;
  };
}

// -----------------------------
// Report Types Configuration
// -----------------------------

export interface ReportTypeConfig {
  label: string;
  description: string;
  icon: string;
  model: 'flash' | 'pro';
  thinking: boolean;
  estimated_time_seconds: number;
}

export const REPORT_TYPES_CONFIG: Record<ReportType, ReportTypeConfig> = {
  transcript: {
    label: 'Transcription',
    description: 'Transcription complète mot à mot de la vidéo.',
    icon: 'file-text',
    model: 'flash',
    thinking: false,
    estimated_time_seconds: 30,
  },
  summary_short: {
    label: 'Résumé Express',
    description: 'Synthèse en 5-10 points essentiels.',
    icon: 'zap',
    model: 'flash',
    thinking: false,
    estimated_time_seconds: 20,
  },
  summary_detailed: {
    label: 'Résumé Détaillé',
    description: 'Analyse approfondie avec contexte et nuances.',
    icon: 'book-open',
    model: 'pro',
    thinking: true,
    estimated_time_seconds: 60,
  },
  lesson_card: {
    label: 'Lesson Card',
    description: 'Fiche pédagogique complète : concepts, actions, citations.',
    icon: 'graduation-cap',
    model: 'pro',
    thinking: true,
    estimated_time_seconds: 90,
  },
  actions: {
    label: "Plan d'Action",
    description: 'Étapes concrètes et checklists à appliquer.',
    icon: 'check-square',
    model: 'pro',
    thinking: true,
    estimated_time_seconds: 45,
  },
  flashcards: {
    label: 'Flashcards',
    description: 'Questions/Réponses pour mémorisation active.',
    icon: 'layers',
    model: 'flash',
    thinking: false,
    estimated_time_seconds: 30,
  },
};

// -----------------------------
// Platform Configuration
// -----------------------------

export interface PlatformConfig {
  label: string;
  icon: string;
  color: string;
  formats: {
    video: { width: number; height: number; max_duration: number };
    image: { width: number; height: number };
  };
}

export const PLATFORMS_CONFIG: Record<Platform, PlatformConfig> = {
  instagram: {
    label: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    formats: {
      video: { width: 1080, height: 1920, max_duration: 90 },
      image: { width: 1080, height: 1080 },
    },
  },
  facebook: {
    label: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    formats: {
      video: { width: 1080, height: 1920, max_duration: 60 },
      image: { width: 1200, height: 630 },
    },
  },
  tiktok: {
    label: 'TikTok',
    icon: 'music',
    color: '#000000',
    formats: {
      video: { width: 1080, height: 1920, max_duration: 180 },
      image: { width: 1080, height: 1920 },
    },
  },
  threads: {
    label: 'Threads',
    icon: 'at-sign',
    color: '#000000',
    formats: {
      video: { width: 1080, height: 1920, max_duration: 300 },
      image: { width: 1080, height: 1350 },
    },
  },
  x: {
    label: 'X (Twitter)',
    icon: 'twitter',
    color: '#000000',
    formats: {
      video: { width: 1920, height: 1080, max_duration: 140 },
      image: { width: 1600, height: 900 },
    },
  },
  youtube: {
    label: 'YouTube Shorts',
    icon: 'youtube',
    color: '#FF0000',
    formats: {
      video: { width: 1080, height: 1920, max_duration: 60 },
      image: { width: 1280, height: 720 },
    },
  },
};
