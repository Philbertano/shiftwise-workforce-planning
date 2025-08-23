# Multi-stage Dockerfile for ShiftWise API

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S shiftwise -u 1001

# Install dependencies including dev dependencies for ts-node
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Install ts-node globally
RUN npm install -g ts-node typescript

# Copy source code
COPY --chown=shiftwise:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown shiftwise:nodejs logs

# Switch to non-root user
USER shiftwise

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["npx", "ts-node", "src/index.ts"]