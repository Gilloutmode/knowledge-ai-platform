# 🧠 Knowledge AI

**Educational Intelligence Platform for Enterprise Teams**

*Transform sector monitoring into actionable learning — automatically.*

![Version](https://img.shields.io/badge/version-1.0.0-lime)
![License](https://img.shields.io/badge/license-Private-red)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Hono%20%2B%20Supabase-blue)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5-orange)

---

## 📋 Table of Contents

- [The Problem](#-the-problem-we-solve)
- [Our Solution](#-our-solution)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Roadmap](#-roadmap)
- [Metrics & Impact](#-metrics--impact)
- [Security](#-security)
- [Author](#-author)

---

## 🎯 The Problem We Solve

### For Enterprise Teams

> *"We spend hours every week monitoring industry content across YouTube, newsletters, podcasts, and reports — but we never have time to actually learn from it."*

**The reality today:**

- 📺 Teams follow 50+ YouTube channels but miss 90% of new content
- 📰 Newsletters pile up unread in inboxes
- 📄 Industry reports get downloaded but never analyzed
- ⏰ Knowledge workers spend **5-10 hours/week** on manual monitoring
- 🧠 Information consumed is rarely transformed into actionable skills

**The result:** Companies invest in learning & development, but employees don't have time to learn.

---

## 💡 Our Solution

### Educational Intelligence, Not Just Aggregation

Knowledge AI doesn't just collect content — it **transforms surveillance into learning**.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  MULTI-SOURCE   │     │   AI ANALYSIS    │     │  ACTIONABLE OUTPUT  │
│                 │     │                  │     │                     │
│  • YouTube      │────▶│  • Transcription │────▶│  • Lesson Cards     │
│  • RSS/Blogs    │     │  • Summarization │     │  • Action Plans     │
│  • Documents    │     │  • Key Insights  │     │  • Flashcards       │
│  • Podcasts     │     │  • Contextualize │     │  • Team Briefings   │
│  • LinkedIn     │     │                  │     │                     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

### The Job-to-be-Done

> **"When** my team needs to stay current on industry trends, **I want** to automate content monitoring and analysis **so that** we can focus on learning and applying knowledge instead of hunting for it."

---

## ✨ Features

### 🎬 Multi-Source Content Aggregation

| Source | Status | Description |
|--------|--------|-------------|
| YouTube | ✅ Live | Monitor channels, auto-index new videos |
| RSS Feeds | 🔜 Q1 2025 | Aggregate blogs, newsletters, news sites |
| Documents | 🔜 Q1 2025 | Upload PDFs, articles, internal reports |
| Podcasts | 🔜 Q2 2025 | Audio transcription and analysis |
| LinkedIn | 🔜 Q2 2025 | Track thought leaders and company updates |
| Twitter/X | 🔜 Q2 2025 | Monitor industry conversations |

### 🤖 AI-Powered Analysis Engine

Transform any content into structured, actionable knowledge:

| Analysis Type | Model | Output |
|---------------|-------|--------|
| Express Summary | Gemini Flash | 5-10 bullet points in 30 seconds |
| Deep Analysis | Gemini Pro + Thinking | Comprehensive breakdown with context |
| Lesson Card | Gemini Pro | Structured learning format with key concepts |
| Action Plan | Gemini Pro | Concrete next steps and implementation guide |
| Flashcards | Gemini Flash | Q&A format for knowledge retention |
| Transcript | Gemini Flash | Full text with timestamps |

### 📊 Smart Dashboard

- **Priority Queue** — AI recommends what to analyze next based on relevance
- **Activity Feed** — Real-time updates on new content and analyses
- **Time Saved Metrics** — Track ROI: hours saved vs. manual monitoring
- **Source Health** — Monitor all your content sources at a glance

### 🔍 Unified Search & Discovery

- **Global Search** — Find any content across all sources instantly
- **Cross-Channel Insights** — Discover topics covered by multiple sources
- **Smart Filters** — By source type, date, analysis status, topic
- **Saved Searches** — Create persistent queries for recurring needs

### 🏢 Enterprise-Ready (Multi-Tenant)

| Feature | Description |
|---------|-------------|
| Isolated Data | Each company has its own secure corpus |
| Team Workspaces | Organize by department or project |
| Role-Based Access | Admin, Editor, Viewer permissions |
| SSO Integration | SAML/OIDC support (roadmap) |
| Audit Logs | Track all user actions |

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript 5.8 | Type Safety |
| Tailwind CSS 4 | Styling |
| Vite 6 | Build Tool |
| Framer Motion | Animations |
| React Query | Data Fetching |
| React Router 7 | Routing |
| Lucide Icons | Icon System |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Hono 4 | Web Framework (ultra-fast) |
| Zod | Validation |
| Pino | Structured Logging |

### Database & Auth

| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL + Auth + Realtime + Storage |
| Row Level Security | Data isolation per tenant |

### AI & Automation

| Technology | Purpose |
|------------|---------|
| Google Gemini 2.5 | Pro (deep analysis) + Flash (quick tasks) |
| N8N Cloud | Workflow automation |
| YouTube Data API | Channel/video metadata |

### Design System

| Element | Description |
|---------|-------------|
| "Holo" Theme | Dark mode with lime/cyan accents |
| Glassmorphism | Modern UI with depth |
| 3D Card Effects | Interactive hover states |

---

## 📁 Project Structure

```
knowledge-ai-platform/
│
├── src/                         # Frontend Source
│   ├── components/              # Reusable UI Components
│   │   ├── Layout/              # Sidebar, Header, Shell
│   │   ├── Cards/               # Content & Analysis Cards
│   │   ├── Filters/             # Search & Filter Components
│   │   └── Modals/              # Dialog Components
│   │
│   ├── pages/                   # Application Pages
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Contents.tsx         # Unified content view
│   │   ├── Sources.tsx          # Source management
│   │   ├── Analyses.tsx         # Analysis library
│   │   └── Chat.tsx             # AI Chat (RAG)
│   │
│   ├── hooks/                   # Custom React Hooks
│   ├── services/                # API Service Layer
│   ├── lib/                     # Utilities (Supabase client, helpers)
│   └── styles/                  # Global CSS
│
├── server/                      # Backend Source
│   ├── routes/                  # API Endpoints
│   │   ├── channels.ts          # YouTube channel CRUD
│   │   ├── videos.ts            # Video CRUD + search
│   │   ├── analyses.ts          # Analysis CRUD
│   │   └── webhooks.ts          # N8N integration
│   │
│   ├── middleware/              # Hono Middlewares
│   └── index.ts                 # Server entry point
│
├── supabase/                    # Database
│   ├── migrations/              # SQL migrations
│   └── schema.sql               # Full schema
│
├── n8n-workflows/               # Automation Configs
│   ├── youtube-analyzer-v9.json
│   └── new-video-detector.json
│
├── docs/                        # Documentation
│   ├── 00-PROJECT-OVERVIEW.md
│   ├── 01-DATABASE-SCHEMA.md
│   ├── 02-FRONTEND-PAGES.md
│   ├── 03-FRONTEND-COMPONENTS.md
│   ├── 04-BACKEND-API.md
│   ├── 05-SERVICES.md
│   ├── 06-N8N-WORKFLOWS.md
│   └── 07-DESIGN-SYSTEM.md
│
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 Installation

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Google Cloud account (for Gemini API)
- N8N Cloud account (optional, for automation)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Gilloutmode/knowledge-ai-platform.git
cd knowledge-ai-platform
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-side only
YOUTUBE_API_KEY=AIza...
GEMINI_API_KEY=AIza...

# N8N (optional)
N8N_WEBHOOK_BASE_URL=https://your-instance.app.n8n.cloud/webhook
N8N_WEBHOOK_SECRET=your-secret
```

### Step 4: Database Setup

Run the migrations in your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually import supabase/schema.sql in Supabase Dashboard
```

### Step 5: Start Development

```bash
# Start both frontend and backend
npm run dev:all

# Or separately:
npm run dev      # Frontend on http://localhost:5173
npm run server   # Backend on http://localhost:3001
```

### Step 6: Build for Production

```bash
npm run build
npm run start
```

---

## 🗺️ Roadmap

### ✅ Phase 1 — Foundation (Complete)

- [x] YouTube channel management
- [x] Video indexing and metadata
- [x] 6 AI analysis types
- [x] Dashboard with real stats
- [x] Search and filters

### ✅ Phase 2 — B2B Pivot (Complete)

- [x] Multi-source architecture (YouTube + RSS + Docs)
- [x] Unified Contents view
- [x] Sources management hub
- [x] Global search across all content

### 🔄 Phase 3 — Multi-Source Integration (In Progress)

- [ ] RSS feed ingestion
- [ ] Document upload and processing
- [ ] Cross-source topic clustering
- [ ] Enhanced filtering by source type

### ⏳ Phase 4 — RAG Chat (Q1 2025)

- [ ] Gemini File Search integration
- [ ] Chat with your knowledge base
- [ ] Citation and source linking
- [ ] Conversation history

### ⏳ Phase 5 — Team Collaboration (Q2 2025)

- [ ] Multi-user workspaces
- [ ] Shared analyses and annotations
- [ ] Team activity dashboard
- [ ] Notification system

### ⏳ Phase 6 — Advanced Integrations (Q2-Q3 2025)

- [ ] Podcast ingestion (Whisper)
- [ ] LinkedIn monitoring
- [ ] Twitter/X tracking
- [ ] Slack/Teams notifications
- [ ] Calendar integration

---

## 📊 Metrics & Impact

### Time Saved Calculator

| Team Size | Channels Monitored | Weekly Time Saved | Monthly ROI |
|-----------|-------------------|-------------------|-------------|
| 5 people | 50 channels | 25 hours | €2,500+ |
| 10 people | 100 channels | 60 hours | €6,000+ |
| 25 people | 200 channels | 150 hours | €15,000+ |

*Based on average knowledge worker cost of €50/hour and 30 min saved per analyzed video.*

---

## 🔐 Security

- **Row Level Security (RLS)** — Data isolation at database level
- **API Key Management** — Server-side only, never exposed
- **HTTPS Only** — All traffic encrypted
- **Input Validation** — Zod schemas on all endpoints
- **Rate Limiting** — Protection against abuse

---

## 📄 License

**Private** — All Rights Reserved

This software is proprietary. Unauthorized copying, modification, or distribution is prohibited.

---

## 👨‍💻 Author

**Gil** — Founder & Developer

Building at the intersection of AI and education. Focused on B2B SaaS for enterprise learning.

---

**Transform How Your Team Learns**

*Stop monitoring. Start learning.*

---

*Built with ❤️ and ☕ by Gil*
