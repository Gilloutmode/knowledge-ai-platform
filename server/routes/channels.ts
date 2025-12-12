import { Hono } from "hono";
import { z } from "zod";
import { demoChannels, DemoChannel } from "../lib/demoStorage";
import { logger } from "../lib/logger";
import { getSupabase } from "../lib/supabase";

// YouTube API response types
interface YouTubePlaylistItem {
  contentDetails: {
    videoId: string;
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: {
      high?: { url: string };
      default?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

const channelsRouter = new Hono();

// Validation schemas
const addChannelSchema = z.object({
  youtube_url: z.string().url(),
});

// YouTube URL parsing utilities
function extractChannelId(
  url: string,
): { type: "id" | "handle" | "custom"; value: string } | null {
  const patterns = [
    // @handle format
    { regex: /youtube\.com\/@([^\/\?]+)/, type: "handle" as const },
    // /channel/ID format
    { regex: /youtube\.com\/channel\/([^\/\?]+)/, type: "id" as const },
    // /c/CustomName format
    { regex: /youtube\.com\/c\/([^\/\?]+)/, type: "custom" as const },
    // /user/Username format
    { regex: /youtube\.com\/user\/([^\/\?]+)/, type: "custom" as const },
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return { type: pattern.type, value: match[1] };
    }
  }

  return null;
}

// POST /api/channels/preview - Preview channel before adding
channelsRouter.post("/preview", async (c) => {
  try {
    const body = await c.req.json();
    const { youtube_url } = addChannelSchema.parse(body);

    // Extract channel identifier from URL
    const channelInfo = extractChannelId(youtube_url);
    if (!channelInfo) {
      return c.json({ error: "Invalid YouTube channel URL" }, 400);
    }

    // Check if channel already exists
    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase
        .from("channels")
        .select("id, name")
        .eq("youtube_channel_id", channelInfo.value)
        .single();

      if (existing) {
        return c.json(
          {
            error: "Cette chaîne est déjà dans votre bibliothèque",
            existingChannel: existing,
          },
          409,
        );
      }
    } else {
      // Demo mode - check in memory
      const existing = Array.from(demoChannels.values()).find(
        (ch) => ch.youtube_channel_id === channelInfo.value,
      );
      if (existing) {
        return c.json(
          {
            error: "Cette chaîne est déjà dans votre bibliothèque",
            existingChannel: { id: existing.id, name: existing.name },
          },
          409,
        );
      }
    }

    // Call YouTube API to get channel info
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return c.json({ error: "YouTube API key not configured" }, 500);
    }

    // Determine the right API parameter based on identifier type
    let apiParam: string;
    switch (channelInfo.type) {
      case "handle":
        apiParam = `forHandle=${encodeURIComponent(channelInfo.value)}`;
        break;
      case "id":
        apiParam = `id=${encodeURIComponent(channelInfo.value)}`;
        break;
      case "custom":
        apiParam = `forUsername=${encodeURIComponent(channelInfo.value)}`;
        break;
    }

    const ytResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&${apiParam}&key=${youtubeApiKey}`,
    );

    if (!ytResponse.ok) {
      const errorData = await ytResponse.json();
      logger.error({ errorData }, "YouTube API error");
      return c.json({ error: "Failed to fetch channel from YouTube" }, 500);
    }

    const ytData = await ytResponse.json();

    if (!ytData.items || ytData.items.length === 0) {
      return c.json({ error: "Chaîne YouTube non trouvée" }, 404);
    }

    const channel = ytData.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;

    // Format subscriber count for display
    const subCount = parseInt(statistics.subscriberCount) || 0;
    let subscribersDisplay: string;
    if (subCount >= 1000000) {
      subscribersDisplay = `${(subCount / 1000000).toFixed(1)}M`;
    } else if (subCount >= 1000) {
      subscribersDisplay = `${(subCount / 1000).toFixed(1)}K`;
    } else {
      subscribersDisplay = subCount.toString();
    }

    return c.json({
      channel: {
        id: channel.id,
        name: snippet.title,
        thumbnail:
          snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        description: snippet.description?.substring(0, 300) || "",
        subscribers: subscribersDisplay,
        subscriberCount: subCount,
        videoCount: parseInt(statistics.videoCount) || 0,
        youtubeChannelId: channel.id,
        identifierType: channelInfo.type,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(
        { error: "Invalid request data", details: err.errors },
        400,
      );
    }
    logger.error({ err }, "Error previewing channel");
    return c.json({ error: "Failed to preview channel" }, 500);
  }
});

// GET /api/channels - List all channels
channelsRouter.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return c.json({ channels: data });
    } else {
      // Demo mode
      const channels = Array.from(demoChannels.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return c.json({ channels });
    }
  } catch (err) {
    logger.error({ err }, "Error fetching channels");
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

// GET /api/channels/:id - Get single channel
channelsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return c.json({ error: "Channel not found" }, 404);
      return c.json({ channel: data });
    } else {
      // Demo mode
      const channel = demoChannels.get(id);
      if (!channel) return c.json({ error: "Channel not found" }, 404);
      return c.json({ channel });
    }
  } catch (err) {
    logger.error({ err }, "Error fetching channel");
    return c.json({ error: "Failed to fetch channel" }, 500);
  }
});

// POST /api/channels - Add new channel
channelsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { youtube_url } = addChannelSchema.parse(body);

    // Extract channel identifier from URL
    const channelInfo = extractChannelId(youtube_url);
    if (!channelInfo) {
      return c.json({ error: "Invalid YouTube channel URL" }, 400);
    }

    let channel: DemoChannel;
    const supabase = getSupabase();

    if (supabase) {
      // Resolve the real YouTube channel ID first
      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      let realYoutubeChannelId = channelInfo.value;
      let channelName = `Loading... (${channelInfo.value})`;
      let thumbnail = null;
      let description = null;
      let subscriberCount = 0;
      let videoCount = 0;

      if (youtubeApiKey) {
        let apiParam: string;
        switch (channelInfo.type) {
          case "handle":
            apiParam = `forHandle=${encodeURIComponent(channelInfo.value)}`;
            break;
          case "id":
            apiParam = `id=${encodeURIComponent(channelInfo.value)}`;
            break;
          case "custom":
            apiParam = `forUsername=${encodeURIComponent(channelInfo.value)}`;
            break;
        }

        try {
          const ytResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${apiParam}&key=${youtubeApiKey}`,
          );
          if (ytResponse.ok) {
            const ytData = await ytResponse.json();
            if (ytData.items && ytData.items.length > 0) {
              const ytChannel = ytData.items[0];
              realYoutubeChannelId = ytChannel.id;
              channelName = ytChannel.snippet.title;
              thumbnail = ytChannel.snippet.thumbnails?.high?.url;
              description = ytChannel.snippet.description;
              subscriberCount =
                parseInt(ytChannel.statistics.subscriberCount) || 0;
              videoCount = parseInt(ytChannel.statistics.videoCount) || 0;
            }
          }
        } catch (e) {
          logger.warn({ err: e }, "Failed to fetch YouTube data");
        }
      }

      // Check if channel already exists (using real ID)
      const { data: existing } = await supabase
        .from("channels")
        .select("id")
        .eq("youtube_channel_id", realYoutubeChannelId)
        .single();

      if (existing) {
        return c.json({ error: "Channel already added" }, 409);
      }

      // Create channel with resolved YouTube data
      const { data, error } = await supabase
        .from("channels")
        .insert({
          youtube_channel_id: realYoutubeChannelId,
          name: channelName,
          description,
          thumbnail_url: thumbnail,
          subscriber_count: subscriberCount,
          video_count: videoCount,
        })
        .select()
        .single();

      if (error) throw error;
      channel = data;
    } else {
      // Demo mode - check if exists
      const existing = Array.from(demoChannels.values()).find(
        (ch) => ch.youtube_channel_id === channelInfo.value,
      );
      if (existing) {
        return c.json({ error: "Channel already added" }, 409);
      }

      // Fetch from YouTube API to get real data for demo
      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      let channelName = `Channel (${channelInfo.value})`;
      let thumbnail = null;
      let description = null;
      let subscriberCount = 0;
      let videoCount = 0;
      let realYoutubeChannelId = channelInfo.value; // Default to input, but try to get real ID

      if (youtubeApiKey) {
        let apiParam: string;
        switch (channelInfo.type) {
          case "handle":
            apiParam = `forHandle=${encodeURIComponent(channelInfo.value)}`;
            break;
          case "id":
            apiParam = `id=${encodeURIComponent(channelInfo.value)}`;
            break;
          case "custom":
            apiParam = `forUsername=${encodeURIComponent(channelInfo.value)}`;
            break;
        }

        try {
          const ytResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${apiParam}&key=${youtubeApiKey}`,
          );
          if (ytResponse.ok) {
            const ytData = await ytResponse.json();
            if (ytData.items && ytData.items.length > 0) {
              const ytChannel = ytData.items[0];
              realYoutubeChannelId = ytChannel.id; // Get the actual YouTube channel ID (UCxxxxxxx)
              channelName = ytChannel.snippet.title;
              thumbnail = ytChannel.snippet.thumbnails?.high?.url;
              description = ytChannel.snippet.description;
              subscriberCount =
                parseInt(ytChannel.statistics.subscriberCount) || 0;
              videoCount = parseInt(ytChannel.statistics.videoCount) || 0;
            }
          }
        } catch (e) {
          logger.warn({ err: e }, "Failed to fetch YouTube data");
        }
      }

      // Create demo channel
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      channel = {
        id,
        user_id: "00000000-0000-0000-0000-000000000000",
        youtube_channel_id: realYoutubeChannelId,
        name: channelName,
        description,
        thumbnail_url: thumbnail,
        banner_url: null,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        niche: null,
        bio_profile: null,
        last_video_check: null,
        created_at: now,
        updated_at: now,
      };
      demoChannels.set(id, channel);
    }

    // Trigger N8N webhook to analyze the channel (only if configured)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nWebhookUrl) {
      try {
        // Send the real YouTube channel ID (UCxxxxxxx format) for n8n workflow
        await fetch(`${n8nWebhookUrl}/analyze-channel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: channel.id,
            youtubeChannelId: channel.youtube_channel_id, // Use the resolved channel ID
            identifierType: "id", // Always send as ID since we resolved it
          }),
        });
        logger.info(
          { youtubeChannelId: channel.youtube_channel_id },
          "N8N webhook triggered for channel analysis",
        );
      } catch (webhookErr) {
        logger.warn({ err: webhookErr }, "Failed to trigger N8N webhook");
        // Don't fail the request, channel is still created
      }
    }

    return c.json(
      {
        channel,
        message: "Channel added. Analysis in progress...",
      },
      201,
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(
        { error: "Invalid request data", details: err.errors },
        400,
      );
    }
    logger.error({ err }, "Error adding channel");
    return c.json({ error: "Failed to add channel" }, 500);
  }
});

// DELETE /api/channels/:id - Delete channel
channelsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from("channels").delete().eq("id", id);

      if (error) throw error;
    } else {
      // Demo mode
      if (!demoChannels.has(id)) {
        return c.json({ error: "Channel not found" }, 404);
      }
      demoChannels.delete(id);
    }

    return c.json({ message: "Channel deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting channel");
    return c.json({ error: "Failed to delete channel" }, 500);
  }
});

// POST /api/channels/:id/refresh-videos - Fetch new videos from YouTube and add to database
channelsRouter.post("/:id/refresh-videos", async (c) => {
  const id = c.req.param("id");

  try {
    const supabase = getSupabase();
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    if (!youtubeApiKey) {
      return c.json({ error: "YouTube API key not configured" }, 500);
    }

    if (!supabase) {
      return c.json({ error: "Database not configured" }, 500);
    }

    // Get channel to verify it exists
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, youtube_channel_id, name")
      .eq("id", id)
      .single();

    if (channelError || !channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    // Get existing video IDs to avoid duplicates
    const { data: existingVideos, error: existingError } = await supabase
      .from("videos")
      .select("youtube_video_id")
      .eq("channel_id", id);

    if (existingError) {
      throw existingError;
    }

    const existingVideoIds = new Set(
      existingVideos?.map((v) => v.youtube_video_id) || [],
    );

    // First, get the channel's uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channel.youtube_channel_id}&key=${youtubeApiKey}`,
    );

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      logger.error({ errorText }, "YouTube Channels API error");
      return c.json(
        { error: "Failed to fetch channel info from YouTube" },
        500,
      );
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return c.json({ error: "Channel not found on YouTube" }, 404);
    }

    const uploadsPlaylistId =
      channelData.items[0].contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return c.json({ error: "Could not find uploads playlist" }, 500);
    }

    // Fetch latest videos from the uploads playlist (more reliable than search API)
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${youtubeApiKey}`,
    );

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      logger.error({ errorText }, "YouTube PlaylistItems API error");
      return c.json({ error: "Failed to fetch videos from YouTube" }, 500);
    }

    const playlistData = await playlistResponse.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      return c.json({
        message: "No new videos found",
        updated: 0,
        total: existingVideoIds.size,
      });
    }

    // Log first few videos from YouTube for debugging
    logger.debug(
      {
        count: playlistData.items.length,
        first3: playlistData.items
          .slice(0, 3)
          .map(
            (item: {
              snippet: { title: string };
              contentDetails: { videoId: string };
            }) => ({
              title: item.snippet.title,
              videoId: item.contentDetails.videoId,
            }),
          ),
      },
      "YouTube returned videos",
    );

    // Get ALL video IDs for statistics update
    const allVideoIds = playlistData.items
      .map((item: YouTubePlaylistItem) => item.contentDetails.videoId)
      .join(",");

    // Get detailed info (statistics, duration) for ALL videos
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${allVideoIds}&key=${youtubeApiKey}`,
    );

    if (!detailsResponse.ok) {
      logger.error(
        { errorText: await detailsResponse.text() },
        "YouTube Videos API error",
      );
      return c.json({ error: "Failed to fetch video details" }, 500);
    }

    const detailsData = await detailsResponse.json();

    // Filter out videos we need to add
    const newVideos = detailsData.items.filter(
      (ytVideo: YouTubeVideoDetails) => !existingVideoIds.has(ytVideo.id),
    );

    // Filter videos we need to update
    const videosToUpdate = detailsData.items.filter(
      (ytVideo: YouTubeVideoDetails) => existingVideoIds.has(ytVideo.id),
    );

    logger.info(
      {
        newVideosCount: newVideos.length,
        videosToUpdateCount: videosToUpdate.length,
      },
      "Video sync status",
    );

    // Parse duration from ISO 8601 format (PT1H2M3S)
    function parseDuration(isoDuration: string): string | null {
      if (!isoDuration) return null;
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || "0");
        const minutes = parseInt(match[2] || "0");
        const seconds = parseInt(match[3] || "0");
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        } else {
          return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }
      }
      return null;
    }

    // Update existing videos' statistics
    if (videosToUpdate.length > 0) {
      for (const ytVideo of videosToUpdate) {
        await supabase
          .from("videos")
          .update({
            view_count: parseInt(ytVideo.statistics?.viewCount) || 0,
            like_count: parseInt(ytVideo.statistics?.likeCount) || 0,
            duration: parseDuration(ytVideo.contentDetails?.duration),
          })
          .eq("youtube_video_id", ytVideo.id)
          .eq("channel_id", id);
      }
      logger.info(
        { count: videosToUpdate.length },
        "Updated statistics for existing videos",
      );
    }

    if (newVideos.length === 0) {
      return c.json({
        message: `Statistiques mises à jour pour ${videosToUpdate.length} vidéos`,
        updated: videosToUpdate.length,
        total: existingVideoIds.size,
      });
    }

    // Prepare videos for insertion
    const videosToInsert = newVideos.map((ytVideo: YouTubeVideoDetails) => ({
      channel_id: id,
      youtube_video_id: ytVideo.id,
      title: ytVideo.snippet.title,
      description: ytVideo.snippet.description,
      thumbnail_url:
        ytVideo.snippet.thumbnails?.high?.url ||
        ytVideo.snippet.thumbnails?.default?.url,
      published_at: ytVideo.snippet.publishedAt,
      duration: parseDuration(ytVideo.contentDetails?.duration),
      view_count: parseInt(ytVideo.statistics?.viewCount) || 0,
      like_count: parseInt(ytVideo.statistics?.likeCount) || 0,
    }));

    // Insert new videos
    const { data: insertedVideos, error: insertError } = await supabase
      .from("videos")
      .insert(videosToInsert)
      .select();

    if (insertError) {
      logger.error({ err: insertError }, "Error inserting videos");
      throw insertError;
    }

    // Update channel video count
    const newTotal = existingVideoIds.size + (insertedVideos?.length || 0);
    await supabase
      .from("channels")
      .update({ video_count: newTotal })
      .eq("id", id);

    logger.info(
      { count: insertedVideos?.length || 0, channelName: channel.name },
      "Added new videos to channel",
    );

    const statsUpdated = videosToUpdate.length;
    const message =
      statsUpdated > 0
        ? `${insertedVideos?.length || 0} nouvelles vidéos ajoutées, ${statsUpdated} vidéos mises à jour`
        : `${insertedVideos?.length || 0} nouvelles vidéos ajoutées`;

    return c.json({
      message,
      updated: (insertedVideos?.length || 0) + statsUpdated,
      total: newTotal,
    });
  } catch (err) {
    logger.error({ err }, "Error refreshing videos");
    return c.json({ error: "Failed to refresh videos" }, 500);
  }
});

// POST /api/channels/:id/refresh - Refresh channel data
channelsRouter.post("/:id/refresh", async (c) => {
  const id = c.req.param("id");

  try {
    let youtubeChannelId: string | undefined;
    const supabase = getSupabase();

    if (supabase) {
      const { data: channel, error } = await supabase
        .from("channels")
        .select("youtube_channel_id")
        .eq("id", id)
        .single();

      if (error || !channel) {
        return c.json({ error: "Channel not found" }, 404);
      }
      youtubeChannelId = channel.youtube_channel_id;
    } else {
      // Demo mode
      const channel = demoChannels.get(id);
      if (!channel) {
        return c.json({ error: "Channel not found" }, 404);
      }
      youtubeChannelId = channel.youtube_channel_id;
    }

    // Trigger N8N webhook to refresh channel data
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nWebhookUrl && youtubeChannelId) {
      await fetch(`${n8nWebhookUrl}/analyze-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: id,
          youtubeChannelId,
          refresh: true,
        }),
      });
    }

    return c.json({ message: "Refresh triggered" });
  } catch (err) {
    logger.error({ err }, "Error refreshing channel");
    return c.json({ error: "Failed to refresh channel" }, 500);
  }
});

export { channelsRouter };
