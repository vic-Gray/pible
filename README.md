# Pible

**The continuity & intelligence layer for AI-assisted software development.**

Pible is not another AI coding assistant. It's an external, persistent layer that sits between a developer, their codebase, and whichever AI coding agent they happen to be using — Claude Code, Cursor, Kiro, or others. Agents come and go, and each one starts with zero memory of what the last one did. Pible fixes that by owning the project's memory, decisions, task state, and history independently of any single AI tool.

> The AI agent may change. The project's memory, decisions, progress, and unfinished work should not.

**MVP promise:** a developer can switch from one AI coding agent to another mid-project without losing context. Agent A finishes a task → Pible records what happened → Agent B reads Pible → Agent B receives a compiled context package and continues exactly where Agent A left off.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Monorepo structure](#monorepo-structure)
- [Data model](#data-model)
- [Backend modules](#backend-modules)
- [CLI](#cli)
- [Local `.pible/` mirror](#local-pible-mirror)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing & CI](#testing--ci)
- [Roadmap](#roadmap)
- [Non-functional considerations](#non-functional-considerations)
- [Contributing](#contributing)

---

## Architecture

Three surfaces talk to one backend. Optional surfaces (browser extension, VS Code extension) plug into the same API later without changing the core.

```
                    +---------------------------+
                    |   Next.js Web Dashboard    |
                    |  (project view, tasks,     |
                    |   analytics, timeline)     |
                    +--------------+-------------+
                                   |
                                   |  REST / WebSocket
                                   v
+------------------+   +---------------------------+   +------------------+
|  Pible CLI (npm) |<->|     NestJS Backend API     |<->|  Postgres (DB)   |
|  init/task/       |   |  - Auth (JWT + API keys)   |   |  projects, tasks,|
|  context/update    |   |  - Project Memory module   |   |  decisions, logs |
+---------+----------+   |  - Task Engine module      |   +------------------+
          |               |  - Context Compiler module |
          v               |  - Agent Interface         |   +------------------+
+------------------+       |  - Verification Engine     |-->|  Redis (cache /  |
|   AI Agents      |       |  - Analytics module        |   |  job queue)      |
|  Claude Code,     |       +---------------+-------------+   +------------------+
|  Kiro, Cursor...  |                       |
+--------------------+                      | reads/writes
                                            v
                              +---------------------------+
                              |  Local .pible/ folder in   |
                              |  the developer's repo      |
                              |  (git-trackable mirror)    |
                              +---------------------------+
```

**Key boundary:** the dashboard is a human-facing, read-mostly surface. It consumes the same NestJS API as the CLI and agents — it never talks to Postgres/Redis directly and never becomes a second source of truth.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Web frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Server Components for fast dashboard loads; API routes for lightweight backend-for-frontend needs |
| Backend API | NestJS + TypeScript | Modular, opinionated structure maps 1:1 onto the module boundaries below |
| Database | PostgreSQL (via Prisma) | Relational data — projects, tasks, decisions, agent runs — with strong query needs |
| Cache / queue | Redis + BullMQ | Background jobs: context compilation, verification checks (running tests/builds) |
| Auth | JWT + API keys | JWT for human dashboard sessions; scoped, revocable API keys for AI agents / CLI |
| CLI | Node.js + TypeScript, Commander.js | `pible init`, `pible task next`, `pible context`, `pible update`, `pible compile` |
| Browser extension | TypeScript + WebExtensions API (Manifest V3) + React | Injects project context into web-based AI chats (claude.ai, chatgpt.com) |
| VS Code extension | TypeScript + VS Code Extension API | Current task, project state, and "compile context" inline in the editor |
| Verification runner | Bash/Node script (Go later if needed) | Runs tests/build after an agent claims a task done |

Agent-facing context files (`.pible/*.md`) are plain Markdown + YAML frontmatter — agent-agnostic by design.

---

## Monorepo structure

Managed with Turborepo (or Nx):

```
pible/
├── apps/
│   ├── web/                 # Next.js dashboard
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── middleware.ts
│   └── api/                 # NestJS backend
│       └── src/
│           ├── memory/           # Project Memory module
│           ├── tasks/             # Task Engine module
│           ├── context/           # Context Compiler module
│           ├── agents/            # Agent Interface module (API-key guarded)
│           ├── verification/      # Verification Engine
│           └── analytics/         # Analytics module
├── packages/
│   ├── cli/                 # `pible` CLI (Commander.js)
│   └── shared-types/        # Request/response types shared by web, api, and cli
├── turbo.json
└── package.json
```

Shared TypeScript config, ESLint, and Prettier are enforced across all packages via Husky pre-commit hooks.

---

## Data model

Core entities owned by the backend:

| Entity | Key fields |
|---|---|
| `Project` | `id`, `name`, `repo_url`, `overall_progress`, `current_phase`, `created_at` |
| `Decision` | `id`, `project_id`, `title`, `description`, `made_by` (human/agent), `created_at` |
| `Task` | `id`, `project_id`, `title`, `description`, `status`, `priority`, `dependencies[]` |
| `TaskRun` | `id`, `task_id`, `agent_name`, `files_changed[]`, `summary`, `tests_passed`, `tests_failed`, `confidence_score` |
| `KnownIssue` | `id`, `project_id`, `description`, `severity`, `status` |
| `ArchitectureNote` | `id`, `project_id`, `layer`, `description`, `related_files[]` |
| `AgentProfile` | `id`, `project_id`, `agent_name`, `tasks_completed`, `success_rate`, `reopened_count`, `human_approval_rate` |
| `TimelineEvent` | `id`, `project_id`, `event_type`, `description`, `timestamp` |

`TaskRun` is agent/CLI-authored only and immutable from the dashboard — see [Non-functional considerations](#non-functional-considerations).

---

## Backend modules

- **Project Memory** — architecture notes, technical decisions, conventions, known issues. Read/edit from the dashboard; read by the Context Compiler.
- **Task Engine** — tasks, subtasks, status, dependencies, priority, blockers, acceptance criteria. Serves `GET /tasks/next`.
- **Agent Interface** — the surface AI agents actually call, authenticated via scoped API keys:
  - `GET /context` — compiled context package for the current or a specific task
  - `GET /tasks/next` — next actionable task, respecting dependencies/blockers
  - `POST /tasks/:id/status` — agent reports status changes
  - `POST /tasks/:id/report` — agent submits its `TaskRun`
  - `POST /issues` — agent reports a newly discovered problem
- **Context Compiler** *(the core differentiator)* — merges Project Memory + current Task + relevant prior `TaskRun`s + relevant files + constraints + known issues into a single Markdown package sized to fit an agent's context window.
- **Verification Engine** — after a reported completion, optionally runs the project's build/test command (queued job) and compares claimed vs. actual status (e.g. `COMPLETED — UNVERIFIED` until a human confirms).
- **Analytics** — aggregates `TaskRun` data into per-agent performance (success rate, reopened rate, human-approval rate) and the project timeline.

Full request/response contracts are documented via Swagger/OpenAPI at `/api/docs` once the API is running.

---

## CLI

| Command | What it does |
|---|---|
| `pible init` | Registers the repo with Pible, creates the local `.pible/` folder, links to a Project on the backend |
| `pible task next` | Fetches the next actionable task from the Task Engine |
| `pible context` | Calls the Context Compiler and prints/saves the ready-to-paste context package |
| `pible update` | Records what an agent (or developer) just did — files changed, summary, test results |
| `pible compile` | Explicit alias for generating a full AI-ready task package, useful right before switching agents |

The CLI is a thin client: it authenticates with a locally stored API key (never committed to git) and calls the NestJS Agent Interface.

---

## Local `.pible/` mirror

Every project gets a git-trackable local mirror so context works offline and diffs review cleanly in pull requests:

```
.pible/
├── project.md
├── architecture.md
├── decisions.md
├── tasks.md
├── agents.md
├── issues.md
├── progress.md
└── history/
```

Backend data is always the source of truth — the mirror is regenerated on write and handles merge conflicts by re-deriving from the backend, not by attempting a manual merge.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm (or your package manager of choice — adjust scripts accordingly)
- Docker (for local Postgres + Redis)

### Setup

```bash
# clone and install
git clone <repo-url> pible
cd pible
pnpm install

# start local Postgres + Redis
docker compose up -d

# copy env files and fill in secrets
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# run database migrations + seed a demo project
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

# run everything (web + api) via Turborepo
pnpm dev
```

The dashboard runs at `http://localhost:3000`, the API at `http://localhost:4000` (adjust to whatever ports your `.env` files specify).

### First real workflow

```bash
npx pible init          # inside the target repo you want Pible to track
pible task next          # see what's next
# ... let an agent work ...
pible update              # record what happened
pible context             # generate a package for the next agent
```

---

## Environment variables

**`apps/api/.env`**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Signing secret for dashboard sessions |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens |
| `API_KEY_SALT` | Salt used when hashing scoped agent/CLI API keys |
| `PORT` | API port (default `4000`) |

**`apps/web/.env`**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Points at the NestJS API's current host — this is the only thing that changes across the Railway/Render → AWS/GCP migration |
| `NEXTAUTH_URL` | Base URL of the dashboard |
| `NEXTAUTH_SECRET` | Auth.js session secret |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials |

Never commit real values — `.env.example` files should list keys only.

---

## Scripts

Run from the repo root via Turborepo unless noted:

| Command | Description |
|---|---|
| `pnpm dev` | Runs `web` and `api` in dev mode concurrently |
| `pnpm build` | Builds all apps/packages |
| `pnpm lint` | Lints all packages |
| `pnpm typecheck` | Runs `tsc --noEmit` across all packages |
| `pnpm test` | Runs unit tests across all packages |
| `pnpm --filter api prisma migrate dev` | Runs a new Prisma migration locally |
| `pnpm --filter api prisma studio` | Opens Prisma Studio against the local DB |

---

## Testing & CI

- **Unit tests** cover each backend module in isolation (Project Memory, Task Engine, Context Compiler, Agent Interface, Verification, Analytics).
- **Integration/E2E tests** cover the full `init → context → update → switch-agent` loop — this is the workflow the whole product depends on, so it's tested end-to-end, not just unit-by-unit.
- **GitHub Actions** runs lint + typecheck + test on every PR. Merges to `main` are blocked on a green CI run.
- Release pipelines (post-MVP) automate publishing the CLI to npm and the browser/VS Code extensions to their respective stores.

---

## Roadmap

| Phase | Theme | Adds |
|---|---|---|
| **Phase 0** | Foundations | Monorepo, CI, Postgres schema, NestJS skeleton + auth |
| **v1 — Continuity Core** | "Don't lose context when switching agents." | CLI, Context Compiler, local `.pible/` folder, minimal read-only dashboard |
| **v2 — Project Memory & Dashboard** | "Everything important is preserved." | Architecture notes, decisions log, known issues, full dashboard CRUD |
| **v3 — Task Intelligence** | "Always know what should happen next." | Full Task Engine: dependencies, blockers, priority, acceptance criteria |
| **v4 — AI Performance** | "Know how your AI agents are actually performing." | Verification Engine, TaskRun scoring, per-agent analytics dashboard |
| **v5 — Project Intelligence** | "Understand how your software evolved." | Timeline view, project health score |
| **Phase 6 — Extensions & Reach** | Meet developers where they already work | Browser extension, VS Code extension, production deployment & release pipelines |

MVP is intentionally scoped to one workflow done well — see [Getting started](#getting-started) → "First real workflow." Everything past v2 is additive UI/analytics over data the backend is already producing; the dashboard itself doesn't grow new responsibilities, just new views.

---

## Non-functional considerations

- **Auth model:** JWT sessions for the dashboard (GitHub/Google OAuth via Auth.js); short-lived, revocable, per-project API keys for CLI/agent/extension access. The dashboard never uses API keys; agents never use JWTs.
- **Hosting:** Next.js on Vercel; NestJS API + Postgres + Redis on Railway/Render for MVP, migrating to AWS/GCP once usage justifies it. Only `NEXT_PUBLIC_API_BASE_URL` changes across that migration.
- **Multi-language repos:** the Verification Engine shells out to whatever test/build command the project defines in `project.md`, rather than assuming one language or framework.
- **Privacy by default:** Pible stores project structure, decisions, and summaries — **not full source code**. There is no project-structure or file-content browsing in the dashboard, by design.
- **Immutability:** `TaskRun` records are agent/CLI-authored only. The dashboard can display `TaskRun` history but can never create or edit one.
- **Offline-first CLI:** the local `.pible/` Markdown mirror remains usable even if the backend is briefly unreachable, syncing on reconnect.

---

## Contributing

1. Branch off `main`, open a PR — CI must pass (lint, typecheck, test) before merge.
2. Keep module boundaries intact: dashboard code never talks to Postgres/Redis directly; agent-facing logic lives behind the Agent Interface, not scattered across modules.
3. New backend endpoints touching shared contracts should update `packages/shared-types` in the same PR, so the web app and CLI can't silently drift out of sync.
4. Significant architectural changes should be logged as a `Decision` in Pible itself once the dashboard's Memory CRUD is live — dogfooding is the point.

---

## License

