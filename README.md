# Signal MD

Medical evidence intelligence for search, synopsis, review, and adaptive learning.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg?style=flat-square)

## Overview

Signal MD combines multi-source biomedical search, evidence synthesis, citation and retraction signals, and learning-agent feedback loops for clinicians, researchers, and medical learners. The app is a React/Vite frontend backed by an Express API, SQLite/Postgres storage, optional pgvector search, and Redis-backed background jobs.

## Core Capabilities

- Multi-source evidence search across PubMed, OpenAlex, Semantic Scholar, guidelines, and cached local evidence.
- AI-assisted clinical answer, paper synopsis, consensus synthesis, and claim provenance workflows.
- Search quality signals including impressions, clicks, saves, dwell, no-click rate, reformulations, and feedback.
- Adaptive quizzes, spaced repetition, learner memory, and reward attribution from search-to-learning outcomes.
- Admin and quality dashboards for readiness, observability, synthesis quality, learning quality, and search quality.
- Team workspaces, collections, comments, review projects, exports, billing hooks, and production safety checks.

## Requirements

- Node.js 22.14.0 recommended, 22.13.0 minimum. The repo includes `.nvmrc`.
- npm 10+.
- SQLite works out of the box for local development.
- Optional: PostgreSQL for the main app database, pgvector for vector search, and Redis for durable queues/rate-limit storage.

## Quick Start

```bash
nvm use
npm ci
cp .env.example .env
npm run dev
```

The development command starts both services:

- API: `http://localhost:3002`
- Vite frontend: `http://localhost:5173`

For API-only local runs:

```bash
npm start
```

## Configuration

Start with `.env.example` and fill only what you need for the environment.

Useful local variables:

- `JWT_SECRET`: required for auth flows; use at least 32 characters.
- `ADMIN_TOKEN`: enables protected admin endpoints locally.
- `DATABASE_URL`: optional Postgres main database URL.
- `PG_VECTOR_URL` or `VECTOR_DATABASE_URL`: optional pgvector database URL.
- `REDIS_URL`: optional Redis URL for queues and shared rate limits.
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, or provider-specific keys: optional AI backends.

Production hardening flags are documented in `.env.example`, `COMMERCIAL_READINESS.md`, and the deployment docs.

## Common Commands

```bash
npm run dev                  # Start API and frontend
npm start                    # Start Express API
npm run build                # Typecheck and build frontend
npm test                     # Run Jest suites
npm run lint                 # Run ESLint with zero-warning policy
npm run typecheck:all        # Client and server TypeScript checks
npm run db:schema:check      # Validate schema snapshots
npm run verify:db-contract   # Check route/controller DB guard contracts
npm run eval:search-quality  # Search quality smoke/eval script
```

## Quality Gates

Before opening a PR, run:

```bash
npm run typecheck:all
npm test -- --runInBand
npm run build
npm run lint
npm run db:schema:check
npm run verify:db-contract
```

The GitHub PR guardrail workflow also runs targeted search pipeline, search quality, personalization, OpenAPI, production-env, build, E2E smoke, and audit checks.

## Repository Map

- `src/`: React frontend, hooks, pages, UI, and API clients.
- `server/`: Express routes, services, jobs, auth, search, synthesis, learning, and admin logic.
- `database/`: database core, mixins, schemas, migrations, and SQL conversion tools.
- `scripts/`: evals, schema tooling, deployment checks, and maintenance scripts.
- `tests/`: backend, integration, load, and E2E tests.
- `docs/`: architecture, deployment, collaboration, and operational notes.

## Deployment Notes

- Docker Compose and Hetzner deployment files are included for production-style deployments.
- See `docs/HETZNER_DEPLOY.md`, `COMMERCIAL_READINESS.md`, and `.env.production.example`.
- `npm run verify:production-env` checks required production settings.
- The app defaults to safe local development behavior; do not use placeholder secrets in production.

## Security

Rotate secrets if they were ever committed or shared. Keep `JWT_SECRET`, provider API keys, SMTP credentials, Stripe secrets, and database URLs outside git. Use `npm run secrets:generate` for strong local secret generation.

## License

MIT. See `LICENSE`.
