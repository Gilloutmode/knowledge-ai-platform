-- ============================================
-- KNOWLEDGE AI PLATFORM
-- Database Schema for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users preferences (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    default_language TEXT DEFAULT 'fr' CHECK (default_language IN ('fr', 'en')),
    email_notifications BOOLEAN DEFAULT true,
    auto_analyze_new_videos BOOLEAN DEFAULT true,
    default_report_types TEXT[] DEFAULT ARRAY['summary_short', 'lesson_card'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- YouTube Channels
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    youtube_channel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    banner_url TEXT,
    niche TEXT,
    bio_profile JSONB,
    subscriber_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique channel per user
    UNIQUE(user_id, youtube_channel_id)
);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    youtube_video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique video per channel
    UNIQUE(channel_id, youtube_video_id)
);

-- Analyses
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('transcript', 'summary_short', 'summary_detailed', 'lesson_card', 'actions', 'flashcards')),
    language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique analysis type per video and language
    UNIQUE(video_id, type, language)
);

-- Generated Content
CREATE TABLE IF NOT EXISTS public.generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('script_short', 'script_long', 'voiceover', 'image', 'video', 'carousel')),
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'threads', 'x', 'youtube')),
    title TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_video', 'analysis_ready', 'content_ready')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_youtube_id ON public.channels(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_last_checked ON public.channels(last_checked_at);

-- Videos indexes
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON public.videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(analysis_status);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON public.videos(published_at DESC);

-- Analyses indexes
CREATE INDEX IF NOT EXISTS idx_analyses_video_id ON public.analyses(video_id);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON public.analyses(type);

-- Generated content indexes
CREATE INDEX IF NOT EXISTS idx_content_video_id ON public.generated_content(video_id);
CREATE INDEX IF NOT EXISTS idx_content_platform ON public.generated_content(platform);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.generated_content(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Channels Policies
CREATE POLICY "Users can view own channels" ON public.channels
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own channels" ON public.channels
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own channels" ON public.channels
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own channels" ON public.channels
    FOR DELETE USING (auth.uid() = user_id);

-- Videos Policies (access through channel ownership)
CREATE POLICY "Users can view videos from own channels" ON public.videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channels
            WHERE channels.id = videos.channel_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert videos to own channels" ON public.videos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channels
            WHERE channels.id = videos.channel_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update videos from own channels" ON public.videos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.channels
            WHERE channels.id = videos.channel_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete videos from own channels" ON public.videos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.channels
            WHERE channels.id = videos.channel_id
            AND channels.user_id = auth.uid()
        )
    );

-- Analyses Policies (access through video -> channel ownership)
CREATE POLICY "Users can view analyses from own videos" ON public.analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = analyses.video_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert analyses to own videos" ON public.analyses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = analyses.video_id
            AND channels.user_id = auth.uid()
        )
    );

-- Generated Content Policies
CREATE POLICY "Users can view own generated content" ON public.generated_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = generated_content.video_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own generated content" ON public.generated_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = generated_content.video_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update own generated content" ON public.generated_content
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = generated_content.video_id
            AND channels.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete own generated content" ON public.generated_content
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.channels ON channels.id = videos.channel_id
            WHERE videos.id = generated_content.video_id
            AND channels.user_id = auth.uid()
        )
    );

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_user_preferences
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_channels
    BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_videos
    BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_generated_content
    BEFORE UPDATE ON public.generated_content
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create user preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS
-- ============================================

-- View: Videos with analysis count
CREATE OR REPLACE VIEW public.videos_with_stats AS
SELECT
    v.*,
    c.name as channel_name,
    c.thumbnail_url as channel_thumbnail,
    c.user_id,
    COUNT(DISTINCT a.id) as analysis_count,
    COUNT(DISTINCT gc.id) as content_count
FROM public.videos v
JOIN public.channels c ON c.id = v.channel_id
LEFT JOIN public.analyses a ON a.video_id = v.id
LEFT JOIN public.generated_content gc ON gc.video_id = v.id
GROUP BY v.id, c.id;

-- View: Channel stats
CREATE OR REPLACE VIEW public.channel_stats AS
SELECT
    c.*,
    COUNT(DISTINCT v.id) as analyzed_video_count,
    COUNT(DISTINCT a.id) as total_analyses,
    MAX(v.published_at) as latest_video_date
FROM public.channels c
LEFT JOIN public.videos v ON v.channel_id = c.id
LEFT JOIN public.analyses a ON a.video_id = v.id
GROUP BY c.id;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- This section can be uncommented for initial testing
-- INSERT INTO ...
