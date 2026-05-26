# Docker

The repository includes production-oriented Docker assets:

- `docker/Dockerfile` builds the Vite frontend and Node backend into one runtime image.
- `docker-compose.yml` runs the app plus a `pgvector/pgvector:pg16` service for vector search.
- `docker-compose.postgres.yml` runs only the vector database for local development beside `npm run dev`.

## Production-Style Local Run

```powershell
docker compose up --build
```

Required secrets can be supplied through the environment or an `.env` file:

```powershell
$env:JWT_SECRET = "replace-me"
$env:GEMINI_API_KEY = "..."
docker compose up --build
```

The app listens on `http://localhost:3002` by default. Persistent SQLite data is mounted at `./data`.

## Vector Database Only

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Then run the app locally with:

```powershell
$env:PG_VECTOR_URL = "postgresql://medsearch:medsearch@localhost:5432/medsearch"
npm run dev
```

## Validation

Validate Compose syntax before deploy:

```powershell
docker compose config --quiet
```

The current machine must have Docker installed for that command; CI should run it as part of the container build check.
