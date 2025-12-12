import { Hono } from "hono";
import { logger } from "../lib/logger";
import { getSupabase } from "../lib/supabase";

const analysesRouter = new Hono();

// GET /api/analyses - List all analyses with optional filters
analysesRouter.get("/", async (c) => {
  const videoId = c.req.query("videoId") || c.req.query("video_id");
  const type = c.req.query("type");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100); // Max 100
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0); // Min 0

  try {
    const supabase = getSupabase();
    if (!supabase) {
      // Demo mode - return empty
      return c.json({ analyses: [], total: 0, hasMore: false });
    }

    // Get total count first
    let countQuery = supabase
      .from("analyses")
      .select("*", { count: "exact", head: true });

    if (videoId) {
      countQuery = countQuery.eq("video_id", videoId);
    }
    if (type && type !== "all") {
      countQuery = countQuery.eq("type", type);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throw countError;

    // Fetch analyses with video info
    let query = supabase
      .from("analyses")
      .select(
        `
        *,
        videos (
          id,
          title,
          thumbnail_url,
          youtube_video_id,
          channels (
            id,
            name,
            thumbnail_url
          )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (videoId) {
      query = query.eq("video_id", videoId);
    }
    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return c.json({
      analyses: data || [],
      total: totalCount || 0,
      hasMore: offset + limit < (totalCount || 0),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching analyses");
    return c.json({ error: "Failed to fetch analyses" }, 500);
  }
});

// GET /api/analyses/:id - Get single analysis
analysesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return c.json({ error: "Analysis not found" }, 404);
    }

    const { data, error } = await supabase
      .from("analyses")
      .select(
        `
        *,
        videos (
          id,
          title,
          thumbnail_url,
          youtube_video_id,
          channels (
            id,
            name
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Analysis not found" }, 404);

    return c.json({ analysis: data });
  } catch (err) {
    logger.error({ err }, "Error fetching analysis");
    return c.json({ error: "Failed to fetch analysis" }, 500);
  }
});

export { analysesRouter };
