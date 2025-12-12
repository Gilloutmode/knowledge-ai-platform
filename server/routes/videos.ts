import { Hono } from "hono";
import { demoVideos } from "../lib/demoStorage";
import { logger } from "../lib/logger";
import { getSupabase } from "../lib/supabase";
import { escapeIlikePattern, isValidUUID, sanitizeInput } from "../lib/utils";

const videosRouter = new Hono();

// GET /api/videos - List all videos with pagination and search
videosRouter.get("/", async (c) => {
  // Accept both channelId and channel_id for flexibility
  const channelId = c.req.query("channelId") || c.req.query("channel_id");
  const status = c.req.query("status");
  const rawSearch = c.req.query("search"); // Search by title
  const search = rawSearch ? sanitizeInput(rawSearch) : null;
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100); // Max 100
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0); // Min 0

  // Validate channelId if provided
  if (channelId && !isValidUUID(channelId)) {
    return c.json({ error: "Invalid channel ID format" }, 400);
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      // First, get total count
      let countQuery = supabase
        .from("videos")
        .select("*", { count: "exact", head: true });

      if (channelId) {
        countQuery = countQuery.eq("channel_id", channelId);
      }

      if (status) {
        countQuery = countQuery.eq("analysis_status", status);
      }

      if (search) {
        // Escape special SQL characters to prevent injection
        const escapedSearch = escapeIlikePattern(search);
        countQuery = countQuery.ilike("title", `%${escapedSearch}%`);
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;

      // Then fetch paginated data
      let query = supabase
        .from("videos")
        .select(
          `
          *,
          channels (
            id,
            name,
            thumbnail_url
          )
        `,
        )
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (channelId) {
        query = query.eq("channel_id", channelId);
      }

      if (status) {
        query = query.eq("analysis_status", status);
      }

      if (search) {
        // Escape special SQL characters to prevent injection
        const escapedSearch = escapeIlikePattern(search);
        query = query.ilike("title", `%${escapedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return c.json({
        videos: data,
        total: totalCount || 0,
        hasMore: offset + limit < (totalCount || 0),
      });
    } else {
      // Demo mode
      let videos = Array.from(demoVideos.values());

      if (channelId) {
        videos = videos.filter((v) => v.channel_id === channelId);
      }

      if (status) {
        videos = videos.filter((v) => v.analysis_status === status);
      }

      if (search) {
        videos = videos.filter((v) =>
          v.title.toLowerCase().includes(search.toLowerCase()),
        );
      }

      const total = videos.length;

      // Transform to match frontend Video type
      const transformedVideos = videos
        .sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
        )
        .slice(offset, offset + limit)
        .map((v) => ({
          ...v,
          comment_count: 0,
          is_analyzed: v.analysis_status === "completed",
        }));

      return c.json({
        videos: transformedVideos,
        total,
        hasMore: offset + limit < total,
      });
    }
  } catch (err) {
    logger.error({ err }, "Error fetching videos");
    return c.json({ error: "Failed to fetch videos" }, 500);
  }
});

// GET /api/videos/:id - Get single video with analyses
videosRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: video, error: videoError } = await supabase
        .from("videos")
        .select(
          `
          *,
          channels (
            id,
            name,
            thumbnail_url,
            niche
          )
        `,
        )
        .eq("id", id)
        .single();

      if (videoError) throw videoError;
      if (!video) return c.json({ error: "Video not found" }, 404);

      // Get analyses for this video
      const { data: analyses, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .eq("video_id", id)
        .order("created_at", { ascending: false });

      if (analysesError) throw analysesError;

      return c.json({
        video,
        analyses: analyses || [],
      });
    } else {
      // Demo mode
      const video = demoVideos.get(id);
      if (!video) return c.json({ error: "Video not found" }, 404);
      return c.json({ video, analyses: [] });
    }
  } catch (err) {
    logger.error({ err }, "Error fetching video");
    return c.json({ error: "Failed to fetch video" }, 500);
  }
});

// POST /api/videos/:id/analyze - Trigger analysis for a video
videosRouter.post("/:id/analyze", async (c) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const { types = ["summary_short", "lesson_card"], language = "fr" } = body;

    let video: { youtube_video_id: string; title: string } | null = null;
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from("videos")
        .select("youtube_video_id, title")
        .eq("id", id)
        .single();

      if (error || !data) {
        return c.json({ error: "Video not found" }, 404);
      }
      video = data;

      // Update status to processing
      await supabase
        .from("videos")
        .update({ analysis_status: "processing" })
        .eq("id", id);
    } else {
      // Demo mode
      const demoVideo = demoVideos.get(id);
      if (!demoVideo) {
        return c.json({ error: "Video not found" }, 404);
      }
      video = {
        youtube_video_id: demoVideo.youtube_video_id,
        title: demoVideo.title,
      };
      demoVideo.analysis_status = "processing";
    }

    // Trigger N8N webhook (fire-and-forget, don't await response)
    // The workflow can take 2-3 minutes for lesson_card with Gemini Pro
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
    logger.debug({ n8nWebhookUrl }, "N8N Webhook URL");
    logger.info(
      { youtubeVideoId: video?.youtube_video_id, types },
      "Triggering analysis for video",
    );
    if (n8nWebhookUrl && video) {
      // Send one webhook request per analysis type (V11 processes one type at a time)
      for (const type of types) {
        logger.info(
          { webhookUrl: `${n8nWebhookUrl}/analyze-video-v11`, type },
          "Calling N8N webhook for type",
        );
        fetch(`${n8nWebhookUrl}/analyze-video-v11`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: id,
            youtubeVideoId: video.youtube_video_id,
            type, // Single type instead of array
            language,
          }),
        }).catch((err) => logger.error({ err, type }, "N8N webhook error"));
      }
    }

    return c.json({
      message: "Analysis started",
      videoId: id,
      types,
      language,
    });
  } catch (err) {
    logger.error({ err }, "Error triggering analysis");
    return c.json({ error: "Failed to trigger analysis" }, 500);
  }
});

// GET /api/videos/:id/analyses - Get analyses for a video
videosRouter.get("/:id/analyses", async (c) => {
  const id = c.req.param("id");
  const type = c.req.query("type");
  const language = c.req.query("language");

  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from("analyses")
        .select("*")
        .eq("video_id", id)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      if (language) {
        query = query.eq("language", language);
      }

      const { data, error } = await query;

      if (error) throw error;

      return c.json({ analyses: data });
    } else {
      // Demo mode - return empty analyses
      return c.json({ analyses: [] });
    }
  } catch (err) {
    logger.error({ err }, "Error fetching analyses");
    return c.json({ error: "Failed to fetch analyses" }, 500);
  }
});

export { videosRouter };
