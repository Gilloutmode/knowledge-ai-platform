import { Hono } from "hono";
import { logger } from "../lib/logger";
import { getSupabase } from "../lib/supabase";
import { escapeIlikePattern, sanitizeInput } from "../lib/utils";

const searchRouter = new Hono();

// GET /api/search - Global search for channels and videos
searchRouter.get("/", async (c) => {
  const rawQuery = c.req.query("q");
  const query = rawQuery ? sanitizeInput(rawQuery) : null;

  // Require at least 2 characters
  if (!query || query.length < 2) {
    return c.json({ channels: [], videos: [] });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.warn("Search: Supabase not available");
      return c.json({ channels: [], videos: [] });
    }

    const searchPattern = `%${escapeIlikePattern(query)}%`;

    // Run both searches in parallel
    const [channelsResult, videosResult] = await Promise.all([
      supabase
        .from("channels")
        .select("id, name, thumbnail_url, video_count, subscriber_count, niche")
        .ilike("name", searchPattern)
        .limit(5),
      supabase
        .from("videos")
        .select("id, title, thumbnail_url, channel_id, youtube_video_id")
        .ilike("title", searchPattern)
        .order("published_at", { ascending: false })
        .limit(5),
    ]);

    if (channelsResult.error) {
      logger.error(
        { error: channelsResult.error },
        "Search: Channel search error",
      );
    }
    if (videosResult.error) {
      logger.error({ error: videosResult.error }, "Search: Video search error");
    }

    return c.json({
      channels: channelsResult.data || [],
      videos: videosResult.data || [],
    });
  } catch (error) {
    logger.error({ error }, "Search: Error during global search");
    return c.json({ channels: [], videos: [] }, 500);
  }
});

export { searchRouter };
