import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import {
  channelsApi,
  videosApi,
  analysesApi,
  notificationsApi,
  ApiError,
} from '@/services/api';
import type { Channel, Video, Analysis, ChannelPreview, Notification } from '@/services/api';

// Use the global MSW server from setup.ts
beforeEach(() => {
  // Server is already listening from setup.ts
});

afterEach(() => {
  server.resetHandlers();
});

// Mock data
const mockChannel: Channel = {
  id: 'channel-1',
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
};

const mockChannelPreview: ChannelPreview = {
  id: 'preview-1',
  name: 'Preview Channel',
  thumbnail: 'https://example.com/preview-thumb.jpg',
  description: 'Preview description',
  subscribers: '10K',
  subscriberCount: 10000,
  videoCount: 50,
  youtubeChannelId: 'UC123',
  identifierType: 'id',
};

const mockVideo: Video = {
  id: 'video-1',
  channel_id: 'channel-1',
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
};

const mockAnalysis: Analysis = {
  id: 'analysis-1',
  video_id: 'video-1',
  type: 'summary_short',
  content: '# Summary\n\nThis is a test summary.',
  model_used: 'gemini-2.0-flash',
  created_at: '2024-01-16T00:00:00Z',
};

const mockNotification: Notification = {
  id: 'notification-1',
  user_id: 'user-1',
  type: 'analysis_complete',
  title: 'Analysis Complete',
  message: 'Your video analysis is ready',
  data: { videoId: 'video-1' },
  is_read: false,
  created_at: '2024-01-17T00:00:00Z',
};

describe('API Service', () => {
  describe('channelsApi', () => {
    describe('preview', () => {
      it('should preview a YouTube channel', async () => {
        server.use(
          http.post('/api/channels/preview', () => {
            return HttpResponse.json({ channel: mockChannelPreview });
          })
        );

        const result = await channelsApi.preview('https://youtube.com/@testchannel');
        expect(result).toEqual(mockChannelPreview);
      });

      it('should handle preview errors', async () => {
        server.use(
          http.post('/api/channels/preview', () => {
            return HttpResponse.json({ error: 'Channel not found' }, { status: 404 });
          })
        );

        await expect(channelsApi.preview('invalid-url')).rejects.toThrow(ApiError);
      });
    });

    describe('add', () => {
      it('should add a new channel', async () => {
        server.use(
          http.post('/api/channels', () => {
            return HttpResponse.json({
              channel: mockChannel,
              message: 'Channel added successfully',
            });
          })
        );

        const result = await channelsApi.add('https://youtube.com/@testchannel');
        expect(result).toEqual(mockChannel);
      });

      it('should handle duplicate channel error', async () => {
        server.use(
          http.post('/api/channels', () => {
            return HttpResponse.json({ error: 'Channel already exists' }, { status: 409 });
          })
        );

        await expect(channelsApi.add('https://youtube.com/@existing')).rejects.toThrow(ApiError);
      });
    });

    describe('list', () => {
      it('should list all channels', async () => {
        server.use(
          http.get('/api/channels', () => {
            return HttpResponse.json({ channels: [mockChannel] });
          })
        );

        const result = await channelsApi.list();
        expect(result).toEqual([mockChannel]);
      });

      it('should return empty array when no channels', async () => {
        server.use(
          http.get('/api/channels', () => {
            return HttpResponse.json({ channels: [] });
          })
        );

        const result = await channelsApi.list();
        expect(result).toEqual([]);
      });
    });

    describe('get', () => {
      it('should get a single channel', async () => {
        server.use(
          http.get('/api/channels/channel-1', () => {
            return HttpResponse.json({ channel: mockChannel });
          })
        );

        const result = await channelsApi.get('channel-1');
        expect(result).toEqual(mockChannel);
      });

      it('should handle channel not found', async () => {
        server.use(
          http.get('/api/channels/invalid-id', () => {
            return HttpResponse.json({ error: 'Channel not found' }, { status: 404 });
          })
        );

        await expect(channelsApi.get('invalid-id')).rejects.toThrow(ApiError);
      });
    });

    describe('delete', () => {
      it('should delete a channel', async () => {
        server.use(
          http.delete('/api/channels/channel-1', () => {
            return HttpResponse.json({ message: 'Channel deleted' });
          })
        );

        await expect(channelsApi.delete('channel-1')).resolves.not.toThrow();
      });
    });

    describe('refresh', () => {
      it('should refresh channel data', async () => {
        server.use(
          http.post('/api/channels/channel-1/refresh', () => {
            return HttpResponse.json({ message: 'Channel refreshed' });
          })
        );

        await expect(channelsApi.refresh('channel-1')).resolves.not.toThrow();
      });
    });

    describe('refreshVideos', () => {
      it('should refresh video statistics', async () => {
        server.use(
          http.post('/api/channels/channel-1/refresh-videos', () => {
            return HttpResponse.json({
              message: 'Videos refreshed',
              updated: 5,
              total: 50,
            });
          })
        );

        const result = await channelsApi.refreshVideos('channel-1');
        expect(result.updated).toBe(5);
        expect(result.total).toBe(50);
      });
    });
  });

  describe('videosApi', () => {
    describe('listByChannel', () => {
      it('should list videos for a channel', async () => {
        server.use(
          http.get('/api/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('channelId')).toBe('channel-1');
            return HttpResponse.json({
              videos: [mockVideo],
              total: 1,
              hasMore: false,
            });
          })
        );

        const result = await videosApi.listByChannel('channel-1');
        expect(result.videos).toEqual([mockVideo]);
        expect(result.total).toBe(1);
      });

      it('should support pagination parameters', async () => {
        server.use(
          http.get('/api/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('limit')).toBe('10');
            expect(url.searchParams.get('offset')).toBe('20');
            return HttpResponse.json({
              videos: [],
              total: 50,
              hasMore: true,
            });
          })
        );

        const result = await videosApi.listByChannel('channel-1', {
          limit: 10,
          offset: 20,
        });
        expect(result.hasMore).toBe(true);
      });

      it('should support search parameter', async () => {
        server.use(
          http.get('/api/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('search')).toBe('tutorial');
            return HttpResponse.json({
              videos: [mockVideo],
              total: 1,
              hasMore: false,
            });
          })
        );

        await videosApi.listByChannel('channel-1', { search: 'tutorial' });
      });
    });

    describe('list', () => {
      it('should list all videos', async () => {
        server.use(
          http.get('/api/videos', () => {
            return HttpResponse.json({
              videos: [mockVideo],
              total: 1,
              hasMore: false,
            });
          })
        );

        const result = await videosApi.list();
        expect(result.videos).toEqual([mockVideo]);
      });

      it('should handle empty results', async () => {
        server.use(
          http.get('/api/videos', () => {
            return HttpResponse.json({
              videos: [],
              total: 0,
              hasMore: false,
            });
          })
        );

        const result = await videosApi.list();
        expect(result.videos).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('get', () => {
      it('should get a single video', async () => {
        server.use(
          http.get('/api/videos/video-1', () => {
            return HttpResponse.json({ video: mockVideo });
          })
        );

        const result = await videosApi.get('video-1');
        expect(result).toEqual(mockVideo);
      });
    });

    describe('analyze', () => {
      it('should trigger video analysis with default language', async () => {
        server.use(
          http.post('/api/videos/video-1/analyze', async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              types: ['summary_short', 'lesson_card'],
              language: 'fr',
            });
            return HttpResponse.json({ message: 'Analysis started' });
          })
        );

        await expect(
          videosApi.analyze('video-1', ['summary_short', 'lesson_card'])
        ).resolves.not.toThrow();
      });

      it('should trigger video analysis with custom language', async () => {
        server.use(
          http.post('/api/videos/video-1/analyze', async ({ request }) => {
            const body = await request.json();
            expect(body.language).toBe('en');
            return HttpResponse.json({ message: 'Analysis started' });
          })
        );

        await expect(
          videosApi.analyze('video-1', ['summary_short'], 'en')
        ).resolves.not.toThrow();
      });
    });
  });

  describe('analysesApi', () => {
    describe('list', () => {
      it('should list all analyses', async () => {
        server.use(
          http.get('/api/analyses', () => {
            return HttpResponse.json({
              analyses: [mockAnalysis],
              total: 1,
              hasMore: false,
            });
          })
        );

        const result = await analysesApi.list();
        expect(result.analyses).toEqual([mockAnalysis]);
      });

      it('should filter by type', async () => {
        server.use(
          http.get('/api/analyses', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('type')).toBe('summary_short');
            return HttpResponse.json({
              analyses: [mockAnalysis],
              total: 1,
              hasMore: false,
            });
          })
        );

        await analysesApi.list({ type: 'summary_short' });
      });

      it('should not filter when type is "all"', async () => {
        server.use(
          http.get('/api/analyses', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('type')).toBeNull();
            return HttpResponse.json({
              analyses: [],
              total: 0,
              hasMore: false,
            });
          })
        );

        await analysesApi.list({ type: 'all' });
      });
    });

    describe('listByVideo', () => {
      it('should list analyses for a video', async () => {
        server.use(
          http.get('/api/analyses', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('videoId')).toBe('video-1');
            return HttpResponse.json({ analyses: [mockAnalysis] });
          })
        );

        const result = await analysesApi.listByVideo('video-1');
        expect(result).toEqual([mockAnalysis]);
      });
    });

    describe('get', () => {
      it('should get a single analysis', async () => {
        server.use(
          http.get('/api/analyses/analysis-1', () => {
            return HttpResponse.json({ analysis: mockAnalysis });
          })
        );

        const result = await analysesApi.get('analysis-1');
        expect(result).toEqual(mockAnalysis);
      });
    });
  });

  describe('notificationsApi', () => {
    describe('list', () => {
      it('should list all notifications', async () => {
        server.use(
          http.get('/api/notifications', () => {
            return HttpResponse.json({ notifications: [mockNotification] });
          })
        );

        const result = await notificationsApi.list();
        expect(result).toEqual([mockNotification]);
      });

      it('should filter unread notifications', async () => {
        server.use(
          http.get('/api/notifications', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('unread')).toBe('true');
            return HttpResponse.json({ notifications: [mockNotification] });
          })
        );

        await notificationsApi.list(true);
      });
    });

    describe('markRead', () => {
      it('should mark a notification as read', async () => {
        server.use(
          http.post('/api/notifications/notification-1/read', () => {
            return HttpResponse.json({ message: 'Marked as read' });
          })
        );

        await expect(notificationsApi.markRead('notification-1')).resolves.not.toThrow();
      });
    });

    describe('markAllRead', () => {
      it('should mark all notifications as read', async () => {
        server.use(
          http.post('/api/notifications/read-all', () => {
            return HttpResponse.json({ message: 'All marked as read' });
          })
        );

        await expect(notificationsApi.markAllRead()).resolves.not.toThrow();
      });
    });
  });

  describe('ApiError', () => {
    it('should include status and message', async () => {
      server.use(
        http.get('/api/channels', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      try {
        await channelsApi.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).message).toBe('Server error');
      }
    });

    it('should use default error message', async () => {
      server.use(
        http.get('/api/channels', () => {
          return HttpResponse.json({}, { status: 500 });
        })
      );

      try {
        await channelsApi.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Server error. Please try again later.');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get('/api/channels', () => {
          return HttpResponse.error();
        })
      );

      await expect(channelsApi.list()).rejects.toThrow();
    });

    it('should handle 500 server errors', async () => {
      server.use(
        http.get('/api/channels', () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(channelsApi.list()).rejects.toThrow(ApiError);
    });

    it('should handle 403 forbidden errors', async () => {
      server.use(
        http.get('/api/channels', () => {
          return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
        })
      );

      try {
        await channelsApi.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(403);
      }
    });
  });
});
