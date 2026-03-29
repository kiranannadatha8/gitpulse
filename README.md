# GitPulse — AI Code Review Summarizer

Paste a GitHub PR URL and get a structured AI-powered code review in seconds. GitPulse fetches the PR diff via the GitHub REST API, sends it to Claude for analysis, and returns a structured review with a risk level, per-file comments, and actionable suggestions.

## Features

- Paste any public GitHub PR URL to get an instant AI review
- Structured output: summary, risk level (low/medium/high/critical), per-file comments with severity and suggestions
- Review history persisted per browser session
- Rate limited to prevent abuse (10 requests/min per IP)
- All secrets loaded from environment variables — nothing hardcoded

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Query |
| Backend | Node.js 20, Express 5, Prisma ORM |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude (`claude-sonnet-4-5`) |
| GitHub | Octokit REST API |

## Project Structure

```
gitpulse/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Review model
│   └── src/
│       ├── lib/
│       │   ├── env.ts           # Zod env validation (fail-fast)
│       │   ├── logger.ts        # Pino structured logger
│       │   ├── parsePrUrl.ts    # URL sanitizer + validator
│       │   ├── prisma.ts        # Prisma singleton
│       │   └── schemas.ts       # Shared Zod schemas
│       ├── middleware/          # rateLimit, session, errorHandler
│       ├── routes/              # POST /api/reviews, GET /api/reviews
│       └── services/
│           ├── github.ts        # Fetch PR diff via Octokit
│           ├── claude.ts        # Analyze diff with Claude API
│           └── review.ts        # Orchestrator
├── frontend/
│   └── src/
│       ├── components/          # PRInput, ReviewCard, HistorySidebar, LoadingState
│       ├── hooks/               # useReview, useHistory (React Query)
│       ├── lib/                 # axios client
│       └── pages/               # Home
└── docker-compose.yml           # PostgreSQL 16 for local dev
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) or an existing PostgreSQL 16 instance
- A [GitHub personal access token](https://github.com/settings/tokens) (read-only, public repos)
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repo

```bash
git clone https://github.com/kiranannadatha8/gitpulse.git
cd gitpulse
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, GITHUB_TOKEN in .env
```

### 4. Install dependencies and run migrations

```bash
# Backend
cd backend
npm install
npm run db:migrate
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:5173`.

## API

### `POST /api/reviews`

Submit a PR URL for review.

**Request body:**
```json
{ "prUrl": "https://github.com/owner/repo/pull/123" }
```

**Response:**
```json
{
  "id": "uuid",
  "prTitle": "feat: add dark mode",
  "prUrl": "https://github.com/owner/repo/pull/123",
  "riskLevel": "medium",
  "summary": "...",
  "fileReviews": [
    {
      "filename": "src/App.tsx",
      "comments": [
        {
          "line": 42,
          "severity": "warning",
          "message": "...",
          "suggestion": "..."
        }
      ]
    }
  ],
  "createdAt": "2026-03-28T00:00:00.000Z"
}
```

### `GET /api/reviews`

Returns review history for the current browser session.

## Testing

```bash
cd backend
npm test              # Run all tests
npm run test:coverage # With coverage report
```

42 tests, 81%+ coverage across all service and utility modules.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `PORT` | Backend port (default: `3001`) |
| `FRONTEND_URL` | Frontend origin for CORS (default: `http://localhost:5173`) |
| `NODE_ENV` | `development` \| `production` \| `test` |

## License

MIT
