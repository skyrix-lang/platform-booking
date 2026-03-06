FROM node:22-alpine AS builder

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
RUN yarn build

FROM nginx:stable-alpine

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
