FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && yarn install

COPY tsconfig.json ./
COPY apps apps/
COPY packages packages/

# Build backend
WORKDIR /app/apps/backend
RUN yarn build

# Build frontend
WORKDIR /app/apps/frontend
RUN yarn build

# Production image
FROM node:22-alpine

RUN apk add --no-cache nginx supervisor python3 make g++

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && yarn workspaces focus @booking/backend --production

# Copy shared package (needed at runtime for JSON imports)
COPY --from=builder /app/packages/shared packages/shared/

# Copy built backend
COPY --from=builder /app/apps/backend/dist apps/backend/dist/

# Copy built frontend to nginx
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx/production.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 80

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=127.0.0.1
ENV DB_PATH=/app/data/booking.db

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
