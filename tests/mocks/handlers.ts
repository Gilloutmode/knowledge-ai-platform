import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

// Mock data
export const mockChannels = [
  {
    id: '1',
    user_id: 'user-1',
    youtube_channel_id: 'UC123',
    name: 'Test Channel',
    description: 'A test channel',
    thumbnail_url: 'https://example.com/thumb.jpg',
    banner_url: null,
    subscriber_count: 10000,
    video_count: 50,
    niche: 'Technology',
    bio_profile: null,
    last_video_check: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockVideos = [
  {
    id: 'video-1',
    channel_id: '1',
    youtube_video_id: 'abc123',
    title: 'Test Video',
    description: 'A test video description',
    thumbnail_url: 'https://example.com/video-thumb.jpg',
    published_at: '2024-01-15T00:00:00Z',
    duration: '10:30',
    view_count: 5000,
    like_count: 200,
    comment_count: 50,
    is_analyzed: false,
    created_at: '2024-01-15T00:00:00Z',
  },
];

export const mockAnalyses = [
  {
    id: 'analysis-1',
    video_id: 'video-1',
    type: 'summary_short',
    content: '# Summary\n\nThis is a test summary.',
    model_used: 'gemini-2.0-flash',
    created_at: '2024-01-16T00:00:00Z',
    videos: {
      id: 'video-1',
      title: 'Test Video',
      thumbnail_url: 'https://example.com/video-thumb.jpg',
      youtube_video_id: 'abc123',
      channels: {
        id: '1',
        name: 'Test Channel',
        thumbnail_url: 'https://example.com/thumb.jpg',
      },
    },
  },
];

// API Handlers
export const handlers = [
  // Channels
  http.get(`${API_BASE}/channels`, () => {
    return HttpResponse.json({ channels: mockChannels });
  }),

  http.get(`${API_BASE}/channels/:id`, ({ params }) => {
    const channel = mockChannels.find((c) => c.id === params.id);
    if (!channel) {
      return HttpResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    return HttpResponse.json({ channel });
  }),

  http.post(`${API_BASE}/channels`, async ({ request }) => {
    const body = (await request.json()) as { youtube_url: string };
    const newChannel = {
      ...mockChannels[0],
      id: 'new-channel-id',
      youtube_channel_id: body.youtube_url,
    };
    return HttpResponse.json({ channel: newChannel, message: 'Channel added' }, { status: 201 });
  }),

  http.delete(`${API_BASE}/channels/:id`, ({ params }) => {
    const channel = mockChannels.find((c) => c.id === params.id);
    if (!channel) {
      return HttpResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    return HttpResponse.json({ message: 'Channel deleted' });
  }),

  http.post(`${API_BASE}/channels/:id/refresh`, () => {
    return HttpResponse.json({ message: 'Channel refreshed' });
  }),

  http.post(`${API_BASE}/channels/:id/refresh-videos`, () => {
    return HttpResponse.json({ message: 'Videos refreshed', updated: 5, total: 50 });
  }),

  // Videos
  http.get(`${API_BASE}/videos`, ({ request }) => {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('channelId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let videos = [...mockVideos];
    if (channelId) {
      videos = videos.filter((v) => v.channel_id === channelId);
    }

    const paginatedVideos = videos.slice(offset, offset + limit);
    return HttpResponse.json({
      videos: paginatedVideos,
      total: videos.length,
      hasMore: offset + limit < videos.length,
    });
  }),

  http.get(`${API_BASE}/videos/:id`, ({ params }) => {
    const video = mockVideos.find((v) => v.id === params.id);
    if (!video) {
      return HttpResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return HttpResponse.json({ video });
  }),

  http.post(`${API_BASE}/videos/:id/analyze`, async ({ request }) => {
    const body = (await request.json()) as { types: string[]; language: string };
    return HttpResponse.json({
      message: 'Analysis started',
      types: body.types,
      language: body.language,
    });
  }),

  // Analyses
  http.get(`${API_BASE}/analyses`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const videoId = url.searchParams.get('videoId');

    let analyses = [...mockAnalyses];
    if (type && type !== 'all') {
      analyses = analyses.filter((a) => a.type === type);
    }
    if (videoId) {
      analyses = analyses.filter((a) => a.video_id === videoId);
    }

    return HttpResponse.json({
      analyses,
      total: analyses.length,
      hasMore: false,
    });
  }),

  http.get(`${API_BASE}/analyses/:id`, ({ params }) => {
    const analysis = mockAnalyses.find((a) => a.id === params.id);
    if (!analysis) {
      return HttpResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    return HttpResponse.json({ analysis });
  }),

  // Channel Preview
  http.post(`${API_BASE}/channels/preview`, async ({ request }) => {
    const body = (await request.json()) as { youtube_url: string };
    return HttpResponse.json({
      channel: {
        id: 'preview-id',
        name: 'Preview Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        description: 'Preview description',
        subscribers: '10K',
        subscriberCount: 10000,
        videoCount: 50,
        youtubeChannelId: body.youtube_url,
        identifierType: 'id' as const,
      },
    });
  }),

  // Notifications
  http.get(`${API_BASE}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const notifications = [
      {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'analysis_complete',
        title: 'Analysis Complete',
        message: 'Your video analysis is ready',
        data: { videoId: 'video-1' },
        is_read: false,
        created_at: '2024-01-17T00:00:00Z',
      },
    ];

    if (unreadOnly) {
      return HttpResponse.json({ notifications: notifications.filter((n) => !n.is_read) });
    }
    return HttpResponse.json({ notifications });
  }),

  http.post(`${API_BASE}/notifications/:id/read`, () => {
    return HttpResponse.json({ message: 'Marked as read' });
  }),

  http.post(`${API_BASE}/notifications/read-all`, () => {
    return HttpResponse.json({ message: 'All marked as read' });
  }),

  // Health check
  http.get('/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),
];
