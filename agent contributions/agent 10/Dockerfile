# ============================================================
# TaskFlow — Dockerfile (Agent 10)
# Multi-stage build: install deps → build frontend → slim runtime
# ============================================================

# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# ── Stage 2: Build Frontend ───────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ── Stage 3: Production Runtime ───────────────────────────
FROM node:20-alpine AS runtime

LABEL maintainer="TaskFlow Team"
LABEL description="TaskFlow — collaborative task management"
LABEL org.opencontainers.image.source="https://github.com/taskflow/taskflow"

# Security: run as non-root
RUN addgroup -S taskflow && adduser -S taskflow -G taskflow

WORKDIR /app

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy server code and built frontend
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R taskflow:taskflow /app/data

# Switch to non-root user
USER taskflow

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/taskflow.db

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the server
CMD ["node", "server/index.js"]
