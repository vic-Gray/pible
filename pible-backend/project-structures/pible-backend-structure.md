pible/
├── apps/
│   ├── web/                              # Next.js dashboard
│   └── api/                              # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   │
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── api-key.strategy.ts
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   └── api-key.guard.ts
│       │   │   ├── decorators/
│       │   │   │   └── current-actor.decorator.ts
│       │   │   └── request-context.ts
│       │   │
│       │   ├── project-memory/
│       │   │   ├── project-memory.module.ts
│       │   │   ├── project-memory.controller.ts
│       │   │   ├── project-memory.service.ts
│       │   │   ├── project-memory.repository.ts
│       │   │   └── dto/
│       │   │       ├── create-decision.dto.ts
│       │   │       ├── create-architecture-note.dto.ts
│       │   │       └── create-known-issue.dto.ts
│       │   │
│       │   ├── task-engine/
│       │   │   ├── task-engine.module.ts
│       │   │   ├── task-engine.controller.ts
│       │   │   ├── task-engine.service.ts
│       │   │   ├── task-engine.repository.ts
│       │   │   ├── next-task.strategy.ts
│       │   │   └── dto/
│       │   │       ├── create-task.dto.ts
│       │   │       ├── update-task-status.dto.ts
│       │   │       └── task-run.dto.ts
│       │   │
│       │   ├── agent-interface/
│       │   │   ├── agent-interface.module.ts
│       │   │   ├── agent-interface.controller.ts
│       │   │   └── dto/
│       │   │       ├── task-report.dto.ts
│       │   │       └── issue-report.dto.ts
│       │   │
│       │   ├── context-compiler/
│       │   │   ├── context-compiler.module.ts
│       │   │   ├── context-compiler.service.ts
│       │   │   ├── context-compiler.spec.ts
│       │   │   ├── budget/
│       │   │   │   ├── token-budget.ts
│       │   │   │   └── section-priority.ts
│       │   │   └── templates/
│       │   │       └── context-package.template.ts
│       │   │
│       │   ├── verification/
│       │   │   ├── verification.module.ts
│       │   │   ├── verification.controller.ts
│       │   │   ├── verification.service.ts
│       │   │   ├── verification.processor.ts
│       │   │   └── runners/
│       │   │       └── shell-command-runner.ts
│       │   │
│       │   ├── analytics/
│       │   │   ├── analytics.module.ts
│       │   │   ├── analytics.controller.ts
│       │   │   ├── analytics.service.ts
│       │   │   └── rollup/
│       │   │       └── agent-performance.rollup.ts
│       │   │
│       │   ├── projects/
│       │   │   ├── projects.module.ts
│       │   │   ├── projects.controller.ts
│       │   │   └── projects.service.ts
│       │   │
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   ├── prisma.service.ts
│       │   │   └── schema.prisma
│       │   │
│       │   ├── queue/
│       │   │   ├── queue.module.ts
│       │   │   └── redis.provider.ts
│       │   │
│       │   └── common/
│       │       ├── filters/
│       │       │   └── http-exception.filter.ts
│       │       ├── interceptors/
│       │       │   └── logging.interceptor.ts
│       │       └── pipes/
│       │           └── validation.pipe.ts
│       │
│       ├── test/
│       │   └── agent-interface.e2e-spec.ts
│       ├── prisma/
│       │   └── migrations/
│       ├── .env.example
│       └── nest-cli.json
│
├── packages/
│   ├── cli/                              # Commander.js CLI
│   └── shared-types/                     # DTOs shared across web, api, cli
│
├── turbo.json
└── package.json