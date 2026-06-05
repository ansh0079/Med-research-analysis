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

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Dependencies stage ----
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

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
COPY --from=builder /app/server ./server

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
