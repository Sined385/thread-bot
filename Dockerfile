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
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production
FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/dist ./dist
COPY --from=web-build /app/web-ui/dist ./web-ui/dist
COPY scripts/ ./scripts/
COPY drizzle.config.ts ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
