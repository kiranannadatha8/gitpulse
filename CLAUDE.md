# GitPulse — AI Code Review Summarizer

## Project overview

Full-stack web app. User pastes a GitHub PR URL → backend fetches the diff via
GitHub REST API → Claude analyzes it → structured review returned and saved.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, React Query
- Backend: Node.js 20, Express 5, Prisma ORM
- Database: PostgreSQL 16
- External APIs: GitHub REST API (Octokit), Anthropic Claude API (claude-sonnet-4-5)

## Folder structure

gitpulse/
frontend/ # React app (Vite)
src/
components/ # ReviewCard, HistorySidebar, PRInput, LoadingState
pages/ # Home.tsx
hooks/ # useReview.ts, useHistory.ts
lib/ # api.ts (axios client)
backend/ # Express API
src/
routes/ # reviews.ts
services/ # github.ts, claude.ts, review.ts
middleware/ # auth.ts, rateLimit.ts
db/ # prisma schema + migrations
CLAUDE.md

## Code style

- TypeScript everywhere (strict mode)
- Functional React components only, no class components
- async/await, never .then() chains
- Zod for all API input validation
- Every service function must have a unit test
- No console.log in production code — use a logger

## Git conventions

- Conventional commits: feat:, fix:, chore:, test:
- Never commit secrets or .env files
- Always run typecheck before committing

## Security rules

- ANTHROPIC_API_KEY and GITHUB_TOKEN must be env vars only, never hardcoded
- Sanitize all PR URLs before passing to GitHub API
- Rate limit the /api/reviews endpoint (10 req/min per IP)
- Validate PR URL format server-side before any external call

```

```
