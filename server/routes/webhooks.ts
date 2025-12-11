import { Hono } from 'hono';
import { demoChannels, demoVideos, DemoVideo } from '../lib/demoStorage';
import { logger } from '../lib/logger';
import { getSupabase } from '../lib/supabase';
import { webhookAuth, webhookRateLimit } from '../middleware';

// Webhook payload types
interface WebhookVideoPayload {
  youtubeVideoId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string | null;
  viewCount?: number;
  likeCount?: number;
  publishedAt: string;
}

interface WebhookAnalysisPayload {
  type: string;
  language?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const webhooksRouter = new Hono();

// Apply webhook authentication and rate limiting to all webhook routes
webhooksRouter.use('*', webhookRateLimit);
webhooksRouter.use('*', webhookAuth);

// Helper function to get user_id from channel
async function getUserIdFromChannel(channelId: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    return '00000000-0000-0000-0000-000000000000'; // Demo mode
  }

  const { data } = await supabase.from('channels').select('user_id').eq('id', channelId).single();

  return data?.user_id || '00000000-0000-0000-0000-000000000000';
}

// Helper function to get user_id from video
async function getUserIdFromVideo(videoId: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    return '00000000-0000-0000-0000-000000000000'; // Demo mode
  }

  const { data } = await supabase
    .from('videos')
    .select('channels(user_id)')
    .eq('id', videoId)
    .single();

  // @ts-ignore - Supabase join typing
  return data?.channels?.user_id || '00000000-0000-0000-0000-000000000000';
}

// POST /api/webhooks/channel-analyzed - Callback from N8N after channel analysis
webhooksRouter.post('/channel-analyzed', async (c) => {
  try {
    const body = await c.req.json();
    const {
      channelId,
      name,
      description,
      thumbnailUrl,
      bannerUrl,
      subscriberCount,
      videoCount,
      niche,
      bioProfile,
      videos = [],
    } = body;

    logger.info(
      { channelId, niche, videosCount: videos.length },
      'Received channel analysis callback'
    );

    const supabase = getSupabase();
    if (!supabase) {
      // Demo mode - update in-memory storage
      const existingChannel = demoChannels.get(channelId);
      if (existingChannel) {
        demoChannels.set(channelId, {
          ...existingChannel,
          name: name || existingChannel.name,
          description: description || existingChannel.description,
          thumbnail_url: thumbnailUrl || existingChannel.thumbnail_url,
          banner_url: bannerUrl || existingChannel.banner_url,
          subscriber_count: subscriberCount || existingChannel.subscriber_count,
          video_count: videoCount || existingChannel.video_count,
          niche: niche || existingChannel.niche,
          bio_profile: bioProfile || existingChannel.bio_profile,
          updated_at: new Date().toISOString(),
        });
        logger.debug({ channelId, niche }, 'Demo mode: Channel updated');

        // Store videos in demo mode
        if (videos.length > 0) {
          videos.forEach((video: WebhookVideoPayload) => {
            const videoId = crypto.randomUUID();
            const demoVideo: DemoVideo = {
              id: videoId,
              channel_id: channelId,
              youtube_video_id: video.youtubeVideoId,
              title: video.title,
              description: video.description,
              thumbnail_url: video.thumbnailUrl,
              duration: video.duration || null,
              view_count: video.viewCount || 0,
              like_count: video.likeCount || 0,
              published_at: video.publishedAt,
              analysis_status: 'pending',
              created_at: new Date().toISOString(),
            };
            demoVideos.set(videoId, demoVideo);
          });
          logger.debug({ videosCount: videos.length }, 'Demo mode: Added videos');
        }
      } else {
        logger.warn({ channelId }, 'Demo mode: Channel not found in storage');
      }
      return c.json({ success: true, message: 'Demo mode - channel updated' });
    }

    // Update channel with analyzed data
    const { error: channelError } = await supabase
      .from('channels')
      .update({
        name,
        description,
        thumbnail_url: thumbnailUrl,
        banner_url: bannerUrl,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        niche,
        bio_profile: bioProfile,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', channelId);

    if (channelError) {
      logger.error({ err: channelError }, 'Error updating channel');
      throw channelError;
    }

    // Insert videos if provided
    if (videos.length > 0) {
      const videosToInsert = videos.map((video: WebhookVideoPayload) => ({
        channel_id: channelId,
        youtube_video_id: video.youtubeVideoId,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnailUrl,
        duration: video.duration,
        view_count: video.viewCount || 0,
        like_count: video.likeCount || 0,
        published_at: video.publishedAt,
        analysis_status: 'pending',
      }));

      const { error: videosError } = await supabase.from('videos').upsert(videosToInsert, {
        onConflict: 'channel_id,youtube_video_id',
        ignoreDuplicates: true,
      });

      if (videosError) {
        logger.warn({ err: videosError }, 'Error inserting videos');
      }
    }

    // Create notification with real user_id
    const userId = await getUserIdFromChannel(channelId);
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'new_video',
      title: 'Chaîne analysée',
      message: `La chaîne "${name}" a été analysée avec succès. ${videos.length} vidéos importées.`,
    });

    return c.json({ success: true, message: 'Channel updated' });
  } catch (err) {
    logger.error({ err }, 'Webhook error in channel-analyzed');
    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

// POST /api/webhooks/video-analyzed - Callback from N8N after video analysis
webhooksRouter.post('/video-analyzed', async (c) => {
  try {
    const body = await c.req.json();
    const { videoId, analyses = [], status = 'completed' } = body;

    logger.info({ videoId }, 'Received video analysis callback');

    const supabase = getSupabase();
    if (!supabase) {
      return c.json({ success: true, message: 'Demo mode - video analysis received' });
    }

    // Insert analyses
    if (analyses.length > 0) {
      const analysesToInsert = analyses.map((analysis: WebhookAnalysisPayload) => ({
        video_id: videoId,
        type: analysis.type,
        language: analysis.language || 'fr',
        content: analysis.content,
        metadata: analysis.metadata || {},
      }));

      const { error: analysesError } = await supabase.from('analyses').upsert(analysesToInsert, {
        onConflict: 'video_id,type,language',
      });

      if (analysesError) {
        logger.error({ err: analysesError }, 'Error inserting analyses');
        throw analysesError;
      }
    }

    // Update video status
    const { error: videoError } = await supabase
      .from('videos')
      .update({ analysis_status: status })
      .eq('id', videoId);

    if (videoError) {
      logger.error({ err: videoError }, 'Error updating video');
    }

    // Get video info for notification
    const { data: video } = await supabase
      .from('videos')
      .select('title')
      .eq('id', videoId)
      .single();

    // Create notification with real user_id
    const userId = await getUserIdFromVideo(videoId);
    await supabase.from('notifications').insert({
      user_id: userId,
      video_id: videoId,
      type: 'analysis_ready',
      title: 'Analyse terminée',
      message: `L'analyse de "${video?.title || 'la vidéo'}" est prête. ${analyses.length} rapport(s) généré(s).`,
    });

    return c.json({ success: true, message: 'Analyses saved' });
  } catch (err) {
    logger.error({ err }, 'Webhook error in video-analyzed');
    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

// POST /api/webhooks/content-generated - Callback from N8N after content generation
webhooksRouter.post('/content-generated', async (c) => {
  try {
    const body = await c.req.json();
    const { videoId, analysisId, type, platform, title, content, mediaUrl, metadata } = body;

    logger.info({ videoId }, 'Received content generation callback');

    const supabase = getSupabase();
    if (!supabase) {
      return c.json({ success: true, message: 'Demo mode - content generation received' });
    }

    // Insert generated content
    const { data, error } = await supabase
      .from('generated_content')
      .insert({
        video_id: videoId,
        analysis_id: analysisId,
        type,
        platform,
        title,
        content,
        media_url: mediaUrl,
        metadata,
        status: 'ready',
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification with real user_id
    const userId = await getUserIdFromVideo(videoId);
    await supabase.from('notifications').insert({
      user_id: userId,
      video_id: videoId,
      type: 'content_ready',
      title: 'Contenu généré',
      message: `Votre ${type} pour ${platform} est prêt !`,
    });

    return c.json({ success: true, contentId: data.id });
  } catch (err) {
    logger.error({ err }, 'Webhook error in content-generated');
    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

// POST /api/webhooks/new-video-detected - Callback when N8N detects new videos
webhooksRouter.post('/new-video-detected', async (c) => {
  try {
    const body = await c.req.json();
    const { channelId, videos = [] } = body;

    logger.info({ channelId, videosCount: videos.length }, 'New videos detected');

    if (videos.length === 0) {
      return c.json({ success: true, message: 'No new videos' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return c.json({ success: true, message: 'Demo mode - new videos detected' });
    }

    // Insert new videos
    const videosToInsert = videos.map((video: WebhookVideoPayload) => ({
      channel_id: channelId,
      youtube_video_id: video.youtubeVideoId,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnailUrl,
      duration: video.duration,
      view_count: video.viewCount || 0,
      published_at: video.publishedAt,
      analysis_status: 'pending',
    }));

    const { data: insertedVideos, error } = await supabase
      .from('videos')
      .upsert(videosToInsert, {
        onConflict: 'channel_id,youtube_video_id',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;

    // Update channel last_checked_at
    await supabase
      .from('channels')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', channelId);

    return c.json({
      success: true,
      newVideosCount: insertedVideos?.length || 0,
    });
  } catch (err) {
    logger.error({ err }, 'Webhook error in new-video-detected');
    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

export { webhooksRouter };
