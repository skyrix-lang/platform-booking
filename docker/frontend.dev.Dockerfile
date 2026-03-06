FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && yarn install

COPY tsconfig.json ./
COPY apps/frontend apps/frontend/
COPY packages/shared packages/shared/

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["yarn", "dev", "--host"]
