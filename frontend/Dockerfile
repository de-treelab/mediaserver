FROM node:20 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

RUN npm run build

FROM node:20

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY ./public/translations ./public/translations
COPY ./package*.json ./

RUN npm install --production

HEALTHCHECK --interval=1m --timeout=5s --start-period=10s CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "preview"]
