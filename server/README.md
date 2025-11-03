# Mediaserver Backend

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

## Plugins

Installing plugins works similar to installing language extensions. You need to update your manifest.json and copy the plugin JS file into your docker container. It is important that you copy the plugin as a commonJS file into your container:

```yml
services:
  server:
    image: treelabmediaserver/mediaserver-backend:stable
    # ...
    volumes:
      - ./manifest.backend.json:/usr/src/app/manifest.json
      - ./plainPlugin.backend.js:/usr/src/app/dist/plugins/plainPlugin.cjs
```

Your manifest could look like this:

```json
{
  "plugins": [
    {
      "name": "plain-plugin",
      "path": "./plainPlugin.cjs",
    }
  ]
}
```

## Developing plugins

Use the plugin creation helper script to build a plugin skeleton that you can expand on:

```
npx @lars_hagemann/mediaserver-create-plugin
```

See the [sample plugin](../plugin/frontend/) for more details.
