FROM node:20-alpine AS base
WORKDIR /app

# Build web UI
FROM base AS web-build
COPY web-ui/package*.json ./web-ui/
RUN cd web-ui && npm ci
COPY web-ui/ ./web-ui/
RUN cd web-ui && npm run build

# Build server
FROM base AS server-build
# better-sqlite3's prebuild-install can time out fetching the prebuilt binary
# from GitHub releases, in which case it falls back to node-gyp rebuild.
# That fallback needs python + a C/C++ toolchain, which alpine doesn't ship.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production
FROM base AS production
ENV NODE_ENV=production
# Same build-tool guard for the production install (which is where the
# original failure showed up — prebuild-install timed out, node-gyp had
# no python). Cost is ~50MB of build tools in the final image; harmless
# at this scale and far cheaper than wedged deploys.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/dist ./dist
COPY --from=web-build /app/web-ui/dist ./web-ui/dist
COPY scripts/ ./scripts/
COPY drizzle.config.ts ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
