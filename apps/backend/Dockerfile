FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/

FROM manifests AS build
RUN npm ci --no-audit --no-fund --workspace=@cv/backend --include-workspace-root
COPY apps/backend/ apps/backend/
RUN npm run build --workspace=@cv/backend

FROM manifests AS production-deps
RUN npm ci --omit=dev --no-audit --no-fund --workspace=@cv/backend

FROM base AS runtime
ENV NODE_ENV=production
ENV CV_TEMPLATE_SAMPLE=/app/apps/backend/templates/start-bootstrap-resume.zip
COPY --from=production-deps /app/ /app/
COPY --from=build --chown=node:node /app/apps/backend/dist apps/backend/dist
COPY apps/backend/prisma.config.ts apps/backend/
COPY apps/backend/prisma/ apps/backend/prisma/
COPY apps/backend/templates/start-bootstrap-resume.zip apps/backend/templates/
COPY apps/backend/templates/json-resume/ apps/backend/templates/json-resume/
USER node
CMD ["sh", "-c", "npm run migrate --workspace=@cv/backend && exec node apps/backend/dist/main.js"]
