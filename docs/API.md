# Knowledge AI Platform - API Documentation

## Base URL

- **Development**: `http://localhost:3002/api`
- **Production**: `https://your-domain.com/api`

## Authentication

The API supports optional authentication via Supabase JWT tokens.

```http
Authorization: Bearer <supabase-jwt-token>
```

In development mode with `ALLOW_DEMO_MODE=true`, authentication is optional.

## Rate Limiting

API requests are rate-limited to protect the server:

| Endpoint Type | Rate Limit |
|--------------|------------|
| General API | 100 req/min |
| Webhooks | 30 req/min |
| Auth endpoints | 10 req/min |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Channels

### List Channels

```http
GET /api/channels
```

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Channel Name",
      "youtube_channel_id": "UC...",
      "thumbnail_url": "https://...",
      "description": "Channel description",
      "video_count": 42,
      "subscriber_count": 100000,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Channel

```http
GET /api/channels/:id
```

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "name": "Channel Name",
    "youtube_channel_id": "UC...",
    "thumbnail_url": "https://...",
    "description": "Channel description",
    "video_count": 42,
    "subscriber_count": 100000,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Add Channel

```http
POST /api/channels
Content-Type: application/json

{
  "youtube_channel_id": "UC..."
}
```

Or with YouTube URL:
```json
{
  "youtube_url": "https://www.youtube.com/@channelname"
}
```

**Response** `201 Created`
```json
{
  "data": { ... },
  "message": "Channel added successfully"
}
```

### Delete Channel

```http
DELETE /api/channels/:id
```

**Response** `200 OK`
```json
{
  "message": "Channel deleted successfully"
}
```

---

## Videos

### List Videos

```http
GET /api/videos
GET /api/videos?channel_id=uuid
GET /api/videos?limit=20&offset=0
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| channel_id | uuid | Filter by channel |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "channel_id": "uuid",
      "youtube_video_id": "dQw4w9WgXcQ",
      "title": "Video Title",
      "description": "Video description",
      "thumbnail_url": "https://...",
      "duration": "PT10M30S",
      "view_count": 1000000,
      "like_count": 50000,
      "published_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Video

```http
GET /api/videos/:id
```

### Sync Channel Videos

```http
POST /api/videos/sync/:channelId
```

Triggers N8N workflow to fetch new videos from YouTube.

**Response** `202 Accepted`
```json
{
  "message": "Video sync initiated",
  "channel_id": "uuid"
}
```

---

## Analyses

### List Analyses

```http
GET /api/analyses
GET /api/analyses?video_id=uuid
GET /api/analyses?type=summary_short
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| video_id | uuid | Filter by video |
| type | string | Filter by analysis type |

**Analysis Types**
| Type | Description | AI Model |
|------|-------------|----------|
| transcript | Full video transcription | Flash |
| summary_short | 5-10 key points | Flash |
| summary_detailed | Deep analysis with thinking | Pro |
| lesson_card | Complete learning card | Pro |
| actions | Actionable checklist | Pro |
| flashcards | Q&A for memorization | Flash |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "video_id": "uuid",
      "type": "summary_short",
      "content": "Analysis content...",
      "language": "en",
      "model_used": "gemini-2.0-flash",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Analysis

```http
GET /api/analyses/:id
```

### Create Analysis

```http
POST /api/analyses
Content-Type: application/json

{
  "video_id": "uuid",
  "type": "summary_short",
  "language": "en"
}
```

Triggers N8N workflow to generate analysis using AI.

**Response** `202 Accepted`
```json
{
  "message": "Analysis generation initiated",
  "video_id": "uuid",
  "type": "summary_short"
}
```

### Delete Analysis

```http
DELETE /api/analyses/:id
```

---

## Webhooks

Internal endpoints for N8N integration.

### Analyze Video Callback

```http
POST /api/webhooks/analysis-complete
X-Webhook-Secret: <secret>
Content-Type: application/json

{
  "video_id": "uuid",
  "type": "summary_short",
  "content": "Generated analysis...",
  "model_used": "gemini-2.0-flash",
  "language": "en"
}
```

### Sync Complete Callback

```http
POST /api/webhooks/sync-complete
X-Webhook-Secret: <secret>
Content-Type: application/json

{
  "channel_id": "uuid",
  "videos_added": 5,
  "videos_updated": 2
}
```

---

## Health Endpoints

### Basic Health Check

```http
GET /health
```

Fast endpoint for load balancers.

**Response** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Detailed Health Check

```http
GET /health/detailed
```

Includes dependency status and metrics.

**Response** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 256,
    "percentage": 50
  },
  "checks": {
    "database": {
      "status": "ok",
      "latency": 15
    }
  }
}
```

### Kubernetes Readiness

```http
GET /health/ready
```

Returns 503 if dependencies are not available.

### Kubernetes Liveness

```http
GET /health/live
```

Returns 200 if server can respond.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "requestId": "uuid",
  "details": {} // Optional, only in development
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Dependency down |

---

## Request IDs

All requests include a unique identifier for tracing:

**Response Header**
```http
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

Include this ID when reporting issues.
