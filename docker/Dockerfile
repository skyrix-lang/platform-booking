#node
FROM node:22-alpine as build
WORKDIR /app
COPY . .
RUN npm install -g
RUN corepack enable
RUN yarn install
RUN yarn build

#webserver
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
RUN chown nginx.nginx /usr/share/nginx/html/ -R

RUN if ! grep -q "include /etc/nginx/conf.d/*.conf" /etc/nginx/nginx.conf; then echo "\ninclude /etc/nginx/conf.d/*.conf;" >> /etc/nginx/nginx.conf; fi

COPY nginx.conf /etc/nginx/nginx.conf.d/nginx-exodia.conf

EXPOSE 80

CMD ["nginx -g 'daemon off;'"]
