# Production image of the site (local development uses `npm run dev`, not this).
#   docker build -t premium-cars-frontend .
# CI builds it on every pull request and pushes it to ghcr.io/ilutov90/premium-cars-frontend on main.
# The /api and /media rewrites are fixed at build time, so API_URL is a build argument.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG API_URL=http://backend:8080
ARG SITE_URL=https://premiumcarsimport.bg
ENV API_URL=$API_URL \
    SITE_URL=$SITE_URL \
    NEXT_OUTPUT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ARG API_URL=http://backend:8080
ARG SITE_URL=https://premiumcarsimport.bg
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_URL=$API_URL \
    SITE_URL=$SITE_URL
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
