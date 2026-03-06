# Platform Booking

A platform booking application with a React frontend and Fastify + SQLite backend.

## Prerequisites

- Node.js 22+
- Yarn 4+ (via Corepack)
- Docker & Docker Compose (for containerized environments)

## Project Structure

```
platform-booking/
├── apps/
│   ├── frontend/          # React + Vite frontend
│   └── backend/           # Fastify + SQLite backend
├── packages/
│   └── shared/            # Shared types and utilities
├── docker/                # Docker configuration files
├── docker-compose.yml     # Production Docker Compose
└── docker-compose.dev.yml # Development Docker Compose
```

## Getting Started

### First-time Setup

1. **Enable Corepack** (for Yarn 4):
   ```bash
   corepack enable
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Run in development mode**:
   ```bash
   yarn dev
   ```

   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start all workspaces in development mode |
| `yarn build` | Build all workspaces |
| `yarn check` | Run TypeScript type checking |

## Docker

### Development with Docker

Start the development environment with hot-reload:

```bash
yarn docker:dev
```

Stop the development environment:

```bash
yarn docker:dev:down
```

### Production with Docker Compose

Start production environment (separate containers):

```bash
yarn docker:prod
```

Stop production environment:

```bash
yarn docker:prod:down
```

### Unified Production Image

Build a single Docker image containing frontend, backend, and nginx:

```bash
yarn docker:build
```

Run the unified image:

```bash
yarn docker:run
```

Or with custom options:

```bash
docker run -d \
  -p 80:80 \
  -v booking-data:/app/data \
  -e CORS_ORIGINS=https://your-domain.com \
  platform-booking:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `HOST` | `0.0.0.0` | Backend server host |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `DB_PATH` | `./data/booking.db` | SQLite database file path |
| `NODE_ENV` | `development` | Environment mode |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/platforms` | List all platforms |
| `GET` | `/api/bookings` | List active bookings |
| `POST` | `/api/bookings` | Create a booking |
| `DELETE` | `/api/bookings/:platformId` | Release a booking |
| `GET` | `/api/health` | Health check |

## License

Private
