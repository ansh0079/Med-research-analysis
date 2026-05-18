# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/app.js ./app.js
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/database ./database
COPY --from=builder /app/cache ./cache
COPY --from=builder /app/server ./server
COPY --from=builder /app/config.js ./config.js
EXPOSE 3002
CMD ["node", "server.js"]
