# Stage 1: Dependencies
FROM node:18-alpine as deps

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:18-alpine as build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY tsconfig.json ./
COPY src/scripts/log-agent ./src/scripts/log-agent

# Stage 3: Runtime
FROM node:18-alpine as runner

WORKDIR /app

# Copy built files from previous stage
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/tsconfig.json ./

# Set environment variables
ENV NODE_ENV=production
ENV LOG_AGENT_PORT=3002

# Expose the port
EXPOSE 3002

# Create a user to run the app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Start the service
CMD ["npx", "tsx", "src/scripts/log-agent/server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -O- http://localhost:3002/health || exit 1 