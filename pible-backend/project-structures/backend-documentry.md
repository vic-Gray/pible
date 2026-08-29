Pible Backend Structure & Logic
Pible — Backend Project Structure & Logic
apps/api — NestJS backend Companion to the System Architecture document — this is the implementation-level folder structure and
the logic inside each module.
1. Monorepo Layout (recap)
pible/
├── apps/
│
├── web/
│
└── api/
├── packages/
│
├── cli/
│
└── shared-types/
├── turbo.json (or nx.json)
└── package.json
# Next.js dashboard
# NestJS backend ← this document
# Commander.js CLI
# DTOs / interfaces shared across web, api, cli
packages/shared-types matters more than it looks — it’s what keeps the CLI, the dashboard, and (later) both extensions from drifting out of
sync with the API’s request/response shapes. Every DTO the API exposes on the Agent Interface should have its TypeScript type defined
here once, imported everywhere else.
2. apps/api Folder Structure
apps/api/
├── src/
│
├── main.ts
# bootstrap, global pipes, Swagger setup
│
├── app.module.ts
# root module, wires everything together
│
│
│
├── auth/
│
│
├── auth.module.ts
│
│
├── jwt.strategy.ts
# passport-jwt strategy (dashboard)
│
│
├── api-key.strategy.ts
# custom strategy (agents/CLI)
│
│
├── guards/
│
│
│
├── jwt-auth.guard.ts
│
│
│
└── api-key.guard.ts
│
│
├── decorators/
│
│
│
└── current-actor.decorator.ts
# extracts RequestContext
│
│
└── request-context.ts
# { projectId, actorType, actorId }
│
│
│
├── project-memory/
│
│
├── project-memory.module.ts
│
│
├── project-memory.controller.ts
│
│
├── project-memory.service.ts
│
│
├── dto/
│
│
│
├── create-decision.dto.ts
│
│
│
├── create-architecture-note.dto.ts
│
│
│
└── create-known-issue.dto.ts
│
│
└── project-memory.repository.ts
│
│
│
├── task-engine/
│
│
├── task-engine.module.ts
│
│
├── task-engine.controller.ts
│
│
├── task-engine.service.ts
│
│
├── dto/
│
│
│
├── create-task.dto.ts
│
│
│
├── update-task-status.dto.ts
│
│
│
└── task-run.dto.ts
│
│
├── task-engine.repository.ts
│
│
└── next-task.strategy.ts
# dependency/blocker-aware selection (v3+)
│
│
│
├── agent-interface/
│
│
├── agent-interface.module.ts
│
│
├── agent-interface.controller.ts
# thin — delegates to other services
│
│
└── dto/
│
│
├── task-report.dto.ts
│
│
└── issue-report.dto.ts
│
│
│
├── context-compiler/
│
│
├── context-compiler.module.ts
│
│
├── context-compiler.service.ts
│
│
├── budget/
│
│
│
├── token-budget.ts
# size estimation + truncation policy
│
│
│
└── section-priority.ts
# what gets cut first if over budget
│
│
├── templates/
│
│
│
└── context-package.template.ts
# Markdown+YAML frontmatter renderer
│
│
└── context-compiler.spec.ts
# heavily tested — this is the core differentiator│
│
│
├── verification/
│
│
├── verification.module.ts
│
│
├── verification.controller.ts
│
│
├── verification.service.ts
│
│
├── verification.processor.ts
# BullMQ job processor
│
│
└── runners/
│
│
└── shell-command-runner.ts # shells out to project's own test/build cmd
│
│
│
├── analytics/
│
│
├── analytics.module.ts
│
│
├── analytics.controller.ts
│
│
├── analytics.service.ts
│
│
└── rollup/
│
│
└── agent-performance.rollup.ts
# cached in Redis
│
│
│
├── projects/
│
│
├── projects.module.ts
│
│
├── projects.controller.ts
# pible init lands here
│
│
└── projects.service.ts
│
│
│
├── prisma/
│
│
├── prisma.module.ts
│
│
├── prisma.service.ts
# injectable PrismaClient wrapper
│
│
└── schema.prisma
│
│
│
├── queue/
│
│
├── queue.module.ts
# BullMQ registration
│
│
└── redis.provider.ts
│
│
│
└── common/
│
├── filters/
│
│
└── http-exception.filter.ts
│
├── interceptors/
│
│
└── logging.interceptor.ts
│
└── pipes/
│
└── validation.pipe.ts
│
├── test/
# e2e tests (supertest)
│
└── agent-interface.e2e-spec.ts
# covers init → context → update → switch-agent loop
├── prisma/
│
└── migrations/
├── .env.example
└── nest-cli.json
Why agent-interface/ has almost no logic of its own: per the module-boundary table in the architecture doc, the Agent Interface’s job
is auth + routing, not business logic. Its controller methods should read like:
@Post(':id/report')
async reportTask(@Param('id') id: string, @Body() dto: TaskReportDto, @CurrentActor() actor: RequestContext) {
return this.taskEngineService.recordTaskRun(id, dto, actor);
}
If you ever find yourself writing an if statement inside an Agent Interface controller method that isn’t about auth, that logic belongs in
task-engine , project-memory , or context-compiler instead.
3. Module Logic
3.1 Auth ( auth/ )
Both guards resolve to the same RequestContext shape so nothing downstream needs to know which auth path was used:
interface RequestContext {
projectId: string;
actorType: 'human' | 'agent';
actorId: string;
// userId or apiKeyId
}
JwtAuthGuard — validates access token, loads user, resolves projectId from the route param (dashboard always scopes by project
explicitly).
ApiKeyGuard — looks up the hashed key in Postgres, checks revoked_at IS NULL , resolves projectId from the key record itself (a key is
minted for one project — it can’t be redirected at request time). Updates last_used_at on every call (fire-and-forget, doesn’t block the
request).
3.2 Project Memory ( project-memory/ )
Straightforward CRUD service over three entities (Decision, ArchitectureNote, KnownIssue), scoped by projectId from RequestContext on
every query — never trust a projectId from the request body, only from the resolved context. This one rule prevents an entire class of
cross-project data leaks.3.3 Task Engine ( task-engine/ )
createTask , updateStatus , recordTaskRun — standard CRUD plus the append-only TaskRun write (never an update, per the architecture
doc’s immutability rule).
getNextTask delegates to next-task.strategy.ts :
v1: simplest possible — first status = 'todo' task ordered by priority DESC, created_at ASC .
v3: same query, plus a filter excluding tasks whose dependencies[] aren’t all completed , and excluding anything currently blocked .
Keeping this behind a strategy interface from v1 means v3 is a new implementation of NextTaskStrategy , not a rewrite of the
service.
interface NextTaskStrategy {
selectNext(projectId: string): Promise<Task | null>;
}
3.4 Context Compiler ( context-compiler/ )
This is the module worth designing most carefully — it’s the core differentiator, and its output shape is a de facto contract with every AI
agent that will ever read it.
Logic flow for GET /context?taskId=:id :
1. Fetch: current Task , its TaskRun history, related ArchitectureNote s (filtered by related_files overlap with the task if possible), open
KnownIssue s, and recent Decision s.
2. Render each section into Markdown via context-package.template.ts .
3. Estimate token count of the assembled package ( token-budget.ts ).
4. If over budget, apply section-priority.ts — a fixed cut order (e.g., trim older TaskRun summaries first, then older Decision s, never
trim the current task or the most recent TaskRun ).
5. Prepend a context_format_version field in a YAML frontmatter block — the versioning hook flagged in the architecture doc, so future
format changes are detectable by any consumer.
---
context_format_version: 1
project: harvest-finance
task_id: task_0192
generated_at: 2026-08-28T19:00:00Z
---
3.5 Verification Engine ( verification/ )
verification.service.ts enqueues a job on POST /tasks/:id/report (via queue.module.ts ) rather than running synchronously —
build/test commands can take minutes, and the reporting agent shouldn’t block on that.
verification.processor.ts (BullMQ worker) pulls the job, invokes shell-command-runner.ts with the command defined in the project’s
own project.md config, captures exit code + output, and writes the result back to the TaskRun (a new field, not a mutation of the
original report) as COMPLETED — VERIFIED or COMPLETED — UNVERIFIED .
Deliberately kept language-agnostic: the runner only knows “run this shell command and capture the result,” never anything about
npm vs. pytest vs. go test.
3.6 Analytics ( analytics/ )
Read-side aggregation only — never writes to TaskRun or Task . agent-performance.rollup.ts computes success rate / reopened rate /
human-approval rate per AgentProfile and caches the result in Redis with a short TTL, recomputed on a schedule (BullMQ repeatable job)
rather than on every dashboard request.
4. Request Lifecycle (concrete example)
pible update → POST /api/v1/tasks/:id/report :
Request ──▶ ApiKeyGuard (resolves RequestContext)
──▶ ValidationPipe (TaskReportDto)
──▶ AgentInterfaceController.reportTask()
──▶ TaskEngineService.recordTaskRun()
├─▶ Prisma: INSERT TaskRun (append-only)
└─▶ QueueService: enqueue verification job (Phase 4+)
──▶ Response: { taskRunId, status: 'recorded' }
──▶ CLI regenerates .pible/ mirror from a fresh GET, not from the response payload
That last step matters: the CLI should always re-fetch current state to rebuild the mirror rather than trying to patch it from a single write’s
response — keeps “backend is the only source of truth” true in practice, not just in the diagram.5. Testing Structure
Unit tests ( *.spec.ts beside each service): heaviest coverage on context-compiler (budget/truncation edge cases) and next-
task.strategy (dependency logic once v3 lands).
e2e tests ( test/ ): one suite specifically named for the MVP promise — agent-interface.e2e-spec.ts should literally simulate init →
report (Agent A) → context (Agent B) → assert the compiled package contains Agent A’s summary. This is the automated version of the
“dogfood test” milestone in your build plan, and it’s worth writing before the dashboard, not after.
6. Config & Environment
.env.example
├── DATABASE_URL=postgresql://...
├── REDIS_URL=redis://...
├── JWT_ACCESS_SECRET=
├── JWT_REFRESH_SECRET=
├── API_KEY_HASH_SALT=
└── PORT=3001
Nothing project-specific (like a test command) belongs in environment variables — that’s per-project config living in project.md / the
Project row ( build_command , test_command fields), since the Verification Engine needs it to vary per repo, not per deployment.