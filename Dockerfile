# ==========================================
# Production Dockerfile
# Multi-stage build for the Medical Research
# Intelligence Platform backend + frontend
#
# Serves both web and worker roles:
#   Web (default): CMD ["node", "server.js"]
#   Worker:        command: ["node", "server/worker.js"]  (set in docker-compose)
# ==========================================

# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time args for VITE_ vars (baked into the frontend bundle by Vite)
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENV=production
ARG VITE_SENTRY_ORG
ARG VITE_SENTRY_PROJECT
ARG VITE_APP_VERSION=2.0.0
ARG SENTRY_AUTH_TOKEN

ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENV=$VITE_SENTRY_ENV
ENV VITE_SENTRY_ORG=$VITE_SENTRY_ORG
ENV VITE_SENTRY_PROJECT=$VITE_SENTRY_PROJECT
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

COPY package*.json ./
# npm install (not ci) because Vite 8 pulls platform-specific native Rolldown
# bindings (@emnapi) that differ between Windows dev machines and Linux Docker.
RUN npm install --prefer-offline --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Dependencies stage ----
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund --omit=dev && npm cache clean --force

# ---- Production stage ----
FROM node:22-alpine AS app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy built application artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/app.js ./app.js
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/config.js ./config.js
COPY --from=builder /app/database ./database
COPY --from=builder /app/cache ./cache
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
# Gold fixtures are read by the nightly quality-eval schedulers in the worker
COPY --from=builder /app/tests/fixtures ./tests/fixtures

# Fix ownership
RUN chown -R nodejs:nodejs /app

# Create data directory (fallback for SQLite or file uploads)
RUN mkdir -p /app/data /app/logs && chown -R nodejs:nodejs /app/data /app/logs

# Switch to non-root user
USER nodejs

# Environment defaults — overridden by docker-compose environment block
ENV NODE_ENV=production
ENV PORT=3002
ENV DEV_DISABLE_AUTH=false

# Health check (web role on :3002; worker overrides in compose)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.WORKER_HEALTH_PORT||process.env.PORT||3002;require('http').get('http://127.0.0.1:'+p+'/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

EXPOSE 3002

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default: web server (worker overrides CMD via docker-compose)
CMD ["node", "server.js"]
