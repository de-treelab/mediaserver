# Mediaserver Frontend

## Usage

The recommended way to use this software is using Docker:

```yml
services:
  server:
    image: treelabmediaserver/mediaserver-backend:stable
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
      DOCUMENT_STORE_CONFIG_PATH: /config.json
    volumes:
      - /my-partition:/store-0
      - /tmp:/tmp
      - ./documentStoreConfig.json:/config.json
    ports:
      - ${BACKEND_PORT}:${BACKEND_PORT}
      - ${WEBSOCKET_PORT}:${WEBSOCKET_PORT}
    healthcheck: 
      test: ["CMD", "curl", "-f", "http://localhost:${BACKEND_PORT}/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "dev"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:latest
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always
    volumes:
      - redis_data:/data

  frontend:
    image: treelabmediaserver/mediaserver-web:stable
    depends_on:
      server:
        condition: service_healthy
    restart: always
    environment:
      MEDIASERVER_BACKEND_URL: "http://${BACKEND_URL}:${BACKEND_PORT}"
      MEDIASERVER_WEBSOCKET_URL: "ws://${BACKEND_URL}:${WEBSOCKET_PORT}"
    ports:
      - 80:80

volumes:
  postgres_data:
  redis_data:
```

with a corresponding `.env` file

```sh
BACKEND_URL=<your-url>
BACKEND_PORT=8080
WEBSOCKET_PORT=8081

POSTGRES_PORT=5432
POSTGRES_DB=mediaserver
POSTGRES_USER=<your-user>
POSTGRES_PASSWORD=<your-password>

REDIS_ENDPOINT=redis
REDIS_PORT=6379
REDIS_USERNAME=<your-user>
REDIS_PASSWORD=<your-password>
```

## Translations

You can install additional installations by creating a custom `manifest.json` and copying your translation into the container. 

```yml
services:
  frontend:
    image: treelabmediaserver/mediaserver-web
    volumes:
      - ./manifest.json:/var/www/html/manifest.json
      - ./fr.json:/var/www/html/translations/fr.json
```

Your manifest could look like this:
```json
{
  "plugins": [],
  "translations": [
    {
      "lang": "fr",
      "path": "/translations/fr.json",
      "name": "French",
      "localName": "Français",
      "flag": "🇫🇷"
    },
    {
      "lang": "it",
      "path": "https://some-cdn.net/mediaserver/it.json",
      "name": "Italian",
      "localName": "Italiano",
      "flag": "🇮🇹"
    }
  ]
}
```

I am not going to support other languages other than english and german out of the box, since I cannot maintain other languages and I don't want some locales to be in a broken state. 

## Plugins

Installing plugins works similar to installing language extensions. You need to update your manifest.json and copy the plugin JS file into your docker container:

```yml
services:
  frontend:
    image: treelabmediaserver/mediaserver-web
    volumes:
      - ./manifest.json:/var/www/html/manifest.json
      - ./fr.json:/var/www/html/translations/fr.json
      - ./csvPlugin.mjs:/var/www/html/plugins/csvPlugin.mjs
```

Your manifest could look like this:

```json
{
  "plugins": [
    {
      "name": "csv-plugin",
      "url": "/plugins/csvPlugin.mjs",
    },
    {
      "name": "plain-plugin",
      "url": "https://some-cdn.net/mediaserver/plainPlugin.mjs",
    }
  ],
  "translations": [
    {
      "lang": "fr",
      "path": "/translations/fr.json",
      "name": "French",
      "localName": "Français",
      "flag": "🇫🇷"
    }
  ]
}
```

## Developing plugins

Plugins need to export a default object that implements the `FileTypePlugin` interface. The `csvPlugin.mjs` plugin could look like this:

```js
const csvPlugin = {
  matcher: (type) => type === "text/csv",
  icon: (icons) => icons.FaFileCsv,
  Render: (context) => (
    // ...
  ),
  Diashow: (context) => {
    // ...
  },
};

export default csvPlugin;
```
