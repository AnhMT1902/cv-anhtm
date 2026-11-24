FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS base
WORKDIR /app

FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/

FROM manifests AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm ci --no-audit --no-fund --workspace=@cv/frontend --include-workspace-root
COPY apps/frontend/ apps/frontend/
RUN npm run build --workspace=@cv/frontend

FROM manifests AS production-deps
RUN npm ci --omit=dev --no-audit --no-fund --workspace=@cv/frontend

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=production-deps /app/ /app/
COPY --from=build --chown=node:node /app/apps/frontend/.next apps/frontend/.next
COPY --from=build --chown=node:node /app/apps/frontend/public apps/frontend/public
USER node
CMD ["node", "node_modules/next/dist/bin/next", "start", "apps/frontend", "--hostname", "0.0.0.0"]
