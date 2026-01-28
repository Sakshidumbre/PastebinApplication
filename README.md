# Pastebin-Lite

A simple pastebin-like application where users can create text pastes and share them via URLs. Pastes can optionally expire after a certain time (TTL) or after a maximum number of views.

## Features

- Create pastes with arbitrary text content
- Optional time-based expiry (TTL)
- Optional view-count limits
- Shareable URLs for each paste
- Safe HTML rendering (no script execution)
- Support for deterministic testing via TEST_MODE

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Persistence**: Upstash Redis (serverless Redis)
- **Deployment**: Vercel (recommended)

## Running Locally

### Prerequisites

- Node.js 18+ installed
- Upstash Redis (via Vercel Integrations) or Redis instance

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Pastebin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Upstash Redis credentials:
```
UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
```

   For local development with a Redis instance, you can use:
```
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=your-token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Persistence Layer

This application uses **Upstash Redis** (serverless Redis) for persistence. Upstash Redis provides:

- Fast, serverless-compatible storage
- Automatic scaling
- Built-in TTL support for time-based expiration
- No manual database migrations required
- REST API for easy integration

Each paste is stored with the key format `paste:{id}`. When a TTL is specified, Upstash Redis automatically handles expiration. View counts are tracked and updated atomically.

### Setting Up Upstash Redis on Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Integrations** → **Browse Marketplace**
3. Search for "Upstash Redis" and install it
4. Create a new Redis database or connect an existing one
5. Environment variables (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) will be automatically added to your project

### Alternative Persistence Options

If you prefer not to use Upstash Redis, you can easily swap it out for:
- **Redis**: Direct Redis connection
- **PostgreSQL**: Using a library like `pg` or Prisma
- **Other KV stores**: PlanetScale, etc.

To use an alternative, modify the `lib/kv.ts` file to use your preferred storage solution.

## API Endpoints

### Health Check
- `GET /api/healthz` - Returns `{ "ok": true }` if the service is healthy

### Create Paste
- `POST /api/pastes`
  - Body: `{ "content": "string", "ttl_seconds": 60, "max_views": 5 }`
  - Returns: `{ "id": "string", "url": "https://your-app.vercel.app/p/<id>" }`

### Get Paste (API)
- `GET /api/pastes/:id`
  - Returns: `{ "content": "string", "remaining_views": 4, "expires_at": "2026-01-01T00:00:00.000Z" }`
  - Note: Each API fetch counts as a view

### View Paste (HTML)
- `GET /p/:id` - Returns HTML page with the paste content
  - Note: HTML views also count toward `max_views` limit

## Testing Mode

For deterministic testing, set the environment variable `TEST_MODE=1` and include the `x-test-now-ms` header in requests. This allows tests to control the current time for TTL validation.

Example:
```bash
TEST_MODE=1
# In request headers:
x-test-now-ms: 1704067200000
```

## Design Decisions

1. **View Counting**: Both API requests (`GET /api/pastes/:id`) and HTML page views (`GET /p/:id`) increment the view count to properly enforce `max_views` constraints. The availability check happens before incrementing to prevent counting views for unavailable pastes.

2. **ID Generation**: Simple 8-character alphanumeric IDs are used. For production, you might want longer IDs or UUIDs for better collision resistance.

3. **Error Handling**: All errors return appropriate HTTP status codes (4xx for client errors, 404 for unavailable pastes, 500 for server errors) with JSON error bodies. Unavailable pastes (expired, max views reached, or not found) all return consistent 404 responses.

4. **HTML Escaping**: All paste content is escaped when rendered in HTML to prevent XSS attacks. The `escapeHtml` function handles all HTML special characters.

5. **Constraint Checking**: Both TTL and view count constraints are checked before incrementing view count. If either constraint is violated, the paste returns 404. The check happens atomically to prevent race conditions.

6. **Base URL Detection**: The application automatically detects the base URL from request headers (`x-forwarded-proto` and `host`) to generate correct shareable URLs. This works correctly in both development and production environments.

7. **Persistence Layer**: Upstash Redis is used for persistence, with an in-memory fallback for local development when Redis credentials are not configured. This ensures the application works both locally and in production without requiring manual database setup.

8. **Test Mode**: The application supports deterministic time testing via `TEST_MODE=1` environment variable and `x-test-now-ms` header. This allows automated tests to control time for TTL validation without waiting for actual expiration.

## Deployment

### Vercel

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Import the project in Vercel
3. Install Upstash Redis integration from Vercel Marketplace (environment variables will be added automatically)
4. Deploy

The application will automatically build and deploy.

## License

MIT


