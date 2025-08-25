# Multi-stage Dockerfile for ShiftWise Frontend

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built application
COPY --from=build /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN adduser -S shiftwise -u 1001 -G nginx

# Set ownership
RUN chown -R shiftwise:nginx /usr/share/nginx/html && \
    chown -R shiftwise:nginx /var/cache/nginx && \
    chown -R shiftwise:nginx /var/log/nginx && \
    chown -R shiftwise:nginx /etc/nginx/conf.d

# Switch to non-root user
USER shiftwise

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]