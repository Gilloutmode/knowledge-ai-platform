# ============================================
# Knowledge AI Platform - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Stage 2: Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Build dependencies (includes devDependencies)
FROM base AS build-deps
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Stage 4: Builder
FROM build-deps AS builder
COPY . .
# Build frontend
RUN npm run build
# Compile TypeScript for server (if needed)
RUN npx tsc --noEmit || true

# Stage 5: Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3002

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server files
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R hono:nodejs /app

# Switch to non-root user
USER hono

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start server
CMD ["node", "--import", "tsx", "server/index.ts"]
