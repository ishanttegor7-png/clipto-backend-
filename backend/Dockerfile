# ===================================================
# Stage 1: Build TypeScript Application
# ===================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install all dependencies for compiling TypeScript
RUN npm ci

# Copy application source code
COPY src/ ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ===================================================
# Stage 2: Production Runtime with FFmpeg
# ===================================================
FROM node:20-bookworm-slim AS runner

# Install FFmpeg and required media libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifest
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for temporary media storage with appropriate permissions
RUN mkdir -p /tmp/clipto_backend && chown -R node:node /tmp/clipto_backend

# Use non-root node user for container security
USER node

# Expose the port (Render injects $PORT at runtime)
EXPOSE 3000

# Start Express server
CMD ["node", "dist/server.js"]
