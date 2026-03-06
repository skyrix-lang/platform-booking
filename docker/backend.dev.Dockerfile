FROM node:22-alpine

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

EXPOSE 3001

CMD ["yarn", "dev"]
