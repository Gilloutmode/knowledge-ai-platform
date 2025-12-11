# Knowledge AI Platform - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  React 19 + Vite + TypeScript + Tailwind CSS (Holo Design)     │
│  ├── Dashboard (Analytics & Overview)                           │
│  ├── Channels (YouTube Channel Management)                      │
│  ├── Videos (Video Library & Sync)                              │
│  └── Analyses (AI-Generated Reports)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼─────────────────────────────────────┐
│                        API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Hono.js Server (Node.js + TypeScript)                          │
│  ├── Security: Rate Limiting, CORS, Security Headers            │
│  ├── Logging: Pino Structured Logging                           │
│  ├── Caching: In-Memory (Redis-ready)                           │
│  └── Health: Kubernetes-compatible endpoints                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Supabase    │  │     N8N       │  │   YouTube     │
│  (Database)   │  │  (Automation) │  │   Data API    │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ PostgreSQL    │  │ Workflows:    │  │ Channel Info  │
│ Auth          │  │ - Analyze     │  │ Video Data    │
│ Storage       │  │ - Sync        │  │ Transcripts   │
│ Row Level Sec │  │ - Generate    │  │               │
└───────────────┘  └───────┬───────┘  └───────────────┘
                           │
                           ▼
                  ┌───────────────┐
                  │  Google AI    │
                  │  (Gemini 2.5) │
                  ├───────────────┤
                  │ Pro: Deep     │
                  │ Flash: Fast   │
                  └───────────────┘
```

## Component Details

### Frontend (src/)

```
src/
├── components/
│   └── Layout/
│       ├── Header.tsx      # Navigation & user menu
│       ├── Sidebar.tsx     # Main navigation
│       └── Layout.tsx      # Page wrapper
├── pages/
│   ├── Dashboard.tsx       # Analytics overview
│   ├── Channels.tsx        # Channel management
│   ├── Videos.tsx          # Video library
│   └── Analyses.tsx        # AI reports
├── hooks/                  # Custom React hooks
├── lib/
│   └── supabase.ts         # Database client
├── services/
│   └── api.ts              # API client with error handling
└── styles/                 # CSS modules
```

### Backend (server/)

```
server/
├── index.ts                # Entry point, middleware setup
├── routes/
│   ├── channels.ts         # Channel CRUD
│   ├── videos.ts           # Video management
│   ├── analyses.ts         # Analysis generation
│   ├── webhooks.ts         # N8N callbacks
│   └── health.ts           # Health endpoints
├── middleware/
│   ├── auth.ts             # JWT validation
│   ├── rateLimit.ts        # Rate limiting
│   ├── securityHeaders.ts  # Security headers
│   ├── pinoLogger.ts       # Structured logging
│   └── cacheMiddleware.ts  # Response caching
└── lib/
    ├── logger.ts           # Pino logger config
    └── cache.ts            # Cache service
```

### Shared Types (shared/)

```typescript
// shared/types.ts
interface Channel { ... }
interface Video { ... }
interface Analysis { ... }
interface GeneratedContent { ... }
```

## Data Flow

### Video Analysis Flow

```
1. User triggers analysis from UI
2. Frontend → POST /api/analyses
3. Server validates & triggers N8N webhook
4. N8N workflow:
   a. Fetches video transcript (YouTube API)
   b. Sends to Gemini AI with prompt
   c. Receives analysis result
   d. Calls webhook callback
5. Server stores analysis in Supabase
6. Frontend polls/receives update
```

### Channel Sync Flow

```
1. User adds channel or triggers sync
2. Frontend → POST /api/videos/sync/:channelId
3. Server triggers N8N webhook
4. N8N workflow:
   a. Fetches channel videos (YouTube API)
   b. Compares with existing videos
   c. Inserts new videos to Supabase
   d. Calls sync callback
5. Frontend refreshes video list
```

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Server  │────▶│ Supabase │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │  JWT Token     │   Verify       │
     │───────────────▶│───────────────▶│
     │                │   User Data    │
     │                │◀───────────────│
     │                │                │
```

### Security Layers

1. **Transport**: HTTPS (enforced in production)
2. **Authentication**: Supabase JWT
3. **Authorization**: Row Level Security (RLS)
4. **Rate Limiting**: Per-IP request limits
5. **Headers**: OWASP security headers
6. **Validation**: Input sanitization
7. **Secrets**: Environment variables only

## Deployment Architecture

### Docker Compose (Production)

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │   Nginx     │   │    App      │   │   Redis     │      │
│  │  (Proxy)    │──▶│  (Node.js)  │──▶│  (Cache)    │      │
│  │  Port 80    │   │  Port 3002  │   │  Port 6379  │      │
│  └─────────────┘   └─────────────┘   └─────────────┘      │
│        │                                                    │
│        │ Health checks, rate limiting, caching              │
│        ▼                                                    │
│   External Traffic                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```
Production:
├── NODE_ENV=production
├── Strict CORS
├── No demo mode
├── JSON logging (Pino)
└── Redis caching

Development:
├── NODE_ENV=development
├── Permissive CORS
├── Demo mode allowed
├── Pretty logging
└── In-memory caching
```

## Performance Considerations

### Caching Strategy

| Data Type | Cache TTL | Invalidation |
|-----------|-----------|--------------|
| Channel list | 5 min | On add/delete |
| Video list | 5 min | On sync |
| Analysis | 15 min | On create |
| Static assets | 1 year | Build hash |

### Database Indexes

```sql
-- Recommended indexes (already in schema)
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_analyses_video_id ON analyses(video_id);
CREATE INDEX idx_analyses_type ON analyses(type);
```

### API Response Optimization

1. **Pagination**: All list endpoints support limit/offset
2. **Partial Responses**: Select specific fields when possible
3. **Compression**: Gzip enabled in Nginx
4. **Caching Headers**: Proper Cache-Control for browsers

## Monitoring & Observability

### Logging (Pino)

```json
{
  "level": "info",
  "time": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/channels",
  "status": 200,
  "responseTime": 45
}
```

### Health Endpoints

| Endpoint | Purpose | Response Time |
|----------|---------|---------------|
| /health | Load balancer | < 10ms |
| /health/detailed | Monitoring | < 100ms |
| /health/ready | K8s readiness | < 50ms |
| /health/live | K8s liveness | < 10ms |

### Metrics (Future)

- Request rate per endpoint
- Error rate by type
- Response time percentiles
- Cache hit ratio
- Database query latency

## AI Integration

### Gemini Models

| Model | Use Case | Thinking | Speed |
|-------|----------|----------|-------|
| gemini-2.0-flash | Transcripts, Quick summaries | No | Fast |
| gemini-2.5-pro | Deep analysis, Lesson cards | Yes | Slower |

### Prompt Engineering

- Language-specific prompts (FR/EN)
- Structured output (JSON/Markdown)
- Dynamic video duration estimation
- Quality validation rules

## Scalability Path

### Current (MVP)

- Single server
- In-memory cache
- Supabase managed DB

### Future (Scale)

- Container orchestration (K8s)
- Redis cluster
- Read replicas
- CDN for static assets
- Queue system (BullMQ)
