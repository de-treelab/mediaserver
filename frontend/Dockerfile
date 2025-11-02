FROM node:20 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

ENV VITE_BACKEND_URL=MEDIASERVER_BACKEND_URL
ENV VITE_WEBSOCKET_URL=MEDIASERVER_WEBSOCKET_URL

RUN npm run build

FROM nginx:alpine

COPY ./nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /usr/src/app/dist /var/www/html/

COPY ./env.sh /docker-entrypoint.d/env.sh
RUN dos2unix /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

COPY ./public/manifest.json /var/www/html/manifest.json

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
