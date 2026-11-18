FROM node:22-alpine

# Use dumb-init to properly handle PID 1 process signals and reaping
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Ensure upload directory exists and has appropriate permissions
RUN mkdir -p uploads && chown -R node:node /app

# Use non-root node user
USER node

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

# Container healthcheck using Node.js built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
