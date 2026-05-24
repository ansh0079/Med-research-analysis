# ==========================================
# Production Dockerfile
# Multi-stage build for the Medical Research
# Intelligence Platform backend + frontend
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
RUN npm ci --only=production && npm cache clean --force

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

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3002
ENV DATABASE_PATH=/app/data/app.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 3002

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
