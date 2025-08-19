# Multi-stage Dockerfile for ShiftWise API

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S shiftwise -u 1001

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=shiftwise:nodejs /app/dist ./dist
COPY --from=build --chown=shiftwise:nodejs /app/src/database ./src/database
COPY --chown=shiftwise:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown shiftwise:nodejs logs

# Switch to non-root user
USER shiftwise

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["node", "dist/index.js"]