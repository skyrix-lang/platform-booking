FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && yarn install

COPY tsconfig.json ./
COPY apps/backend apps/backend/
COPY packages/shared packages/shared/

WORKDIR /app/apps/backend
RUN yarn build

FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && yarn workspaces focus @booking/backend --production

COPY --from=builder /app/apps/backend/dist apps/backend/dist/
COPY --from=builder /app/packages/shared packages/shared/

WORKDIR /app/apps/backend

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]
