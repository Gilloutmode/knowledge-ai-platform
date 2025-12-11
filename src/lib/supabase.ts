import { createClient } from '@supabase/supabase-js';

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          default_language: 'fr' | 'en';
          email_notifications: boolean;
          auto_analyze_new_videos: boolean;
          default_report_types: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['user_preferences']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      channels: {
        Row: {
          id: string;
          user_id: string;
          youtube_channel_id: string;
          name: string;
          description: string | null;
          thumbnail_url: string | null;
          banner_url: string | null;
          niche: string | null;
          bio_profile: Record<string, unknown> | null;
          subscriber_count: number;
          video_count: number;
          last_checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['channels']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
      };
      videos: {
        Row: {
          id: string;
          channel_id: string;
          youtube_video_id: string;
          title: string;
          description: string | null;
          thumbnail_url: string;
          duration: string;
          view_count: number;
          like_count: number | null;
          published_at: string;
          analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['videos']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['videos']['Insert']>;
      };
      analyses: {
        Row: {
          id: string;
          video_id: string;
          type: string;
          language: 'fr' | 'en';
          content: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['analyses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['analyses']['Insert']>;
      };
      generated_content: {
        Row: {
          id: string;
          video_id: string;
          analysis_id: string | null;
          type: string;
          platform: string;
          title: string | null;
          content: string;
          media_url: string | null;
          metadata: Record<string, unknown> | null;
          status: 'draft' | 'ready' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['generated_content']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['generated_content']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          video_id: string | null;
          type: 'new_video' | 'analysis_ready' | 'content_ready';
          title: string;
          message: string;
          read: boolean;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
    Views: {
      videos_with_stats: {
        Row: Database['public']['Tables']['videos']['Row'] & {
          channel_name: string;
          channel_thumbnail: string | null;
          user_id: string;
          analysis_count: number;
          content_count: number;
        };
      };
      channel_stats: {
        Row: Database['public']['Tables']['channels']['Row'] & {
          analyzed_video_count: number;
          total_analyses: number;
          latest_video_date: string | null;
        };
      };
    };
  };
}

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Running in demo mode.');
}

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Helper functions for common operations

// Channels
export const channelsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('channels').select('*').eq('id', id).single();

    if (error) throw error;
    return data;
  },

  async getWithStats() {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: Database['public']['Tables']['channels']['Row']) => ({
      ...c,
      analyzed_video_count: 0,
      total_analyses: 0,
      latest_video_date: null as string | null,
    }));
  },

  async create(channel: Database['public']['Tables']['channels']['Insert']) {
    const { data, error } = await supabase
      .from('channels')
      .insert(channel as never)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('channels').delete().eq('id', id);

    if (error) throw error;
  },
};

// Videos
export const videosApi = {
  async getAll(channelId?: string) {
    let query = supabase
      .from('videos')
      .select(`
        *,
        channels!inner (
          id,
          name,
          thumbnail_url,
          user_id
        )
      `)
      .order('published_at', { ascending: false });

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    type VideoWithChannel = Database['public']['Tables']['videos']['Row'] & {
      channels: { id: string; name: string; thumbnail_url: string | null; user_id: string } | null;
    };
    return (data || []).map((v: VideoWithChannel) => ({
      ...v,
      channel_name: v.channels?.name,
      channel_thumbnail: v.channels?.thumbnail_url,
      user_id: v.channels?.user_id,
      analysis_count: 0,
      content_count: 0,
    }));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('videos')
      .select('*, channels(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed') {
    const { error } = await supabase
      .from('videos')
      .update({ analysis_status: status } as never)
      .eq('id', id);

    if (error) throw error;
  },
};

// Analyses
export const analysesApi = {
  async getByVideoId(videoId: string) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('analyses')
      .select('*, videos(title, thumbnail_url, channels(name))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// Notifications
export const notificationsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('read', false);

    if (error) throw error;
  },
};

// Auth helpers
export const authApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;
