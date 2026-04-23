# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Everything Claude Code** (v1.10.0) is a production-ready plugin for AI agent harnesses — a curated collection of agents, skills, hooks, commands, rules, and MCP configurations that provide battle-tested development workflows. It works with Claude Code, Codex, Cursor, OpenCode, Gemini, and other harnesses.

**Key stats:** 48 agents, 183 skills, 74 commands, 25+ hooks, 14 language rule sets, 27 pre-configured MCP servers.

## Running Tests

```bash
# Run all tests
node tests/run-all.js

# Run individual test files
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js

# Code coverage (80% threshold enforced)
npm run coverage

# Lint JS + Markdown
npm run lint
```

The full `npm test` also validates Unicode, agents, commands, rules, skills, hooks, and manifests.

## Architecture

```
everything-claude-code/
├── agents/          # 48 specialized subagents (Markdown + YAML frontmatter)
├── skills/          # 183 skill directories, each with SKILL.md
├── commands/        # 74 slash commands (/tdd, /plan, /e2e, etc.)
├── hooks/           # hooks.json — event-driven automations
├── rules/           # Language-specific and cross-cutting coding rules
│   ├── common/      # Hooks, security, patterns, testing, coding-style
│   └── <lang>/      # cpp, csharp, dart, golang, java, kotlin, perl, php,
│                    # python, rust, swift, typescript, web, zh
├── mcp-configs/     # mcp-servers.json — 27 pre-configured MCP servers
├── scripts/         # Node.js CLI utilities, hook implementations, lib helpers
│   ├── hooks/       # Hook script implementations
│   └── lib/         # Shared library modules
├── tests/           # Test suite (Node.js + Python)
│   └── lib/         # Library unit tests
├── docs/            # 80+ documentation files, multi-language guides
├── examples/        # Project-specific CLAUDE.md templates
├── contexts/        # Context files for specific workflows
├── schemas/         # JSON/YAML schema definitions
├── manifests/       # Install manifests and state
├── ecc2/            # ECC 2.0 Rust control-plane prototype (alpha)
└── plugins/         # Plugin extensions
```

## Key Commands

### Testing & Quality
- `/tdd` — Test-driven development workflow
- `/e2e` — Generate and run E2E tests
- `/test-coverage` — Coverage analysis
- `/verify` — Run verification loop
- `/code-review` — Quality review
- `/quality-gate` — Enforce quality standards

### Planning & Architecture
- `/plan` — Implementation planning
- `/feature-dev` — Feature development workflow
- `/multi-plan` — Multi-agent parallel planning

### Build & Error Fixing
- `/build-fix` — Fix build errors (generic)
- `/cpp-build`, `/go-build`, `/kotlin-build`, `/rust-build`, `/flutter-build` — Language-specific builds

### Language Reviews
- `/cpp-review`, `/go-review`, `/kotlin-review`, `/python-review`, `/flutter-review`, `/rust-review`

### Session & Learning
- `/learn` — Extract patterns from sessions
- `/skill-create` — Generate skills from git history
- `/save-session`, `/resume-session` — Session persistence
- `/checkpoint` — Checkpoint current state

### Multi-Agent Orchestration
- `/orchestrate` — Spawn orchestrated agent fleet
- `/devfleet` — Multi-agent dev fleet
- `/multi-backend`, `/multi-frontend`, `/multi-execute`

### Utilities
- `/rules-distill` — Extract rules from codebase
- `/hookify` — Configure hooks
- `/context-budget` — Manage context token budget
- `/prompt-optimize` — Optimize prompts

## Agents

48 specialized subagents for delegation. Use them via the `Agent` tool with `subagent_type` matching the agent filename (without `.md`):

| Agent | Purpose |
|-------|---------|
| `planner` | Implementation planning and task breakdown |
| `code-reviewer` | Expert code review — use for all significant changes |
| `tdd-guide` | Test-driven development workflow guide |
| `architect` | System design and scalability |
| `code-architect` | Feature architecture, codebase pattern analysis |
| `security-reviewer` | Security vulnerability detection |
| `performance-optimizer` | Profiling and optimization |
| `build-error-resolver` | Build and TypeScript error resolution |
| `typescript-reviewer` | TypeScript code review |
| `python-reviewer` | Python code review |
| `rust-reviewer` | Rust code review (memory safety, idioms) |
| `go-reviewer` | Go code review |
| `java-reviewer` | Java code review (Spring, enterprise patterns) |
| `kotlin-reviewer` | Kotlin code review (coroutines, patterns) |
| `cpp-reviewer` | C++ code review (memory safety, modern idioms) |
| `csharp-reviewer` | C# code review (.NET, async, nullable refs) |
| `flutter-reviewer` | Flutter/Dart mobile code review |
| `database-reviewer` | PostgreSQL/Supabase queries and schema |
| `e2e-runner` | E2E test generation and execution |
| `refactor-cleaner` | Code refactoring and cleanup |
| `doc-updater` | Documentation maintenance |
| `silent-failure-hunter` | Silent failure detection |
| `pr-test-analyzer` | PR test analysis and failure diagnosis |
| `loop-operator` | Autonomous loop orchestration |
| `harness-optimizer` | AI agent harness optimization |

Language-specific build resolvers: `cpp-build-resolver`, `go-build-resolver`, `java-build-resolver`, `kotlin-build-resolver`, `rust-build-resolver`, `dart-build-resolver`, `pytorch-build-resolver`.

## Skills System

Skills live in `skills/<name>/SKILL.md`. Each has frontmatter (`name`, `description`, `origin`) and sections: **When to Use**, **How It Works**, **Examples**.

- **Curated skills** → `skills/` (checked into repo)
- **Generated/imported skills** → `~/.claude/skills/` (user-local)

See `docs/SKILL-PLACEMENT-POLICY.md` for placement decisions.

### Skills to Use for This Codebase

| File(s) | Skill |
|---------|-------|
| `README.md` | `/readme` |
| `.github/workflows/*.yml` | `/ci-workflow` |
| Any file in this repo | `/everything-claude-code` |
| Feature work | `/feature-development` |
| Language rule files | `/add-language-rules` |
| Database changes | `/database-migration` |

When spawning subagents, always pass conventions from the respective skill into the agent's prompt.

## Hook System

Hooks live in `hooks/hooks.json` and are implemented in `scripts/hooks/`. All hooks route through `scripts/hooks/run-with-flags.js` for profile-gating via `ECC_HOOK_PROFILE` and `ECC_DISABLED_HOOKS`.

**Lifecycle events:** `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SessionStart`, `SessionEnd`, `PreCompact`

**Hook profiles:** `minimal`, `standard` (default), `strict`

Key behaviors:
- `PreToolUse` on Bash: quality checks, tmux integration, commit/push validation
- `PostToolUse` on Bash: PR logging, build analysis, quality gates
- `Stop`: format + typecheck, session end, cost tracking, desktop notification
- `SessionStart`: load previous context, detect package manager

Hook development rules:
- Always `exit 0` on non-critical errors — never block tool execution unexpectedly
- Blocking hooks (PreToolUse, Stop) must stay fast (<200ms) — no network calls
- Mark async hooks with `"async": true` and timeout ≤30s in `settings.json`
- Export `run(rawInput)` when using the `run-with-flags.js` wrapper
- Log errors to stderr with `[HookName]` prefix

## Rules

Rules in `rules/` are always-follow guidelines loaded per language context.

**Structure per language:** `coding-style.md`, `patterns.md`, `testing.md`, `security.md`, `hooks.md`

**Languages covered:** common, cpp, csharp, dart, golang, java, kotlin, perl, php, python, rust, swift, typescript, web, zh

## Development Conventions

### Code Style
- **Runtime:** Node.js >=18, plain CommonJS (`require`/`module.exports`), no transpilation
- **No ESM** unless file ends in `.mjs`
- **No TypeScript** — plain `.js` throughout
- `const` over `let`; never `var`
- 2-space indentation, single quotes, semicolons, max 200 char lines
- Hook scripts: keep under 200 lines — extract helpers to `scripts/lib/`

### File Naming
- **Lowercase with hyphens**: `python-reviewer.md`, `tdd-workflow.md`, `session-start.js`
- Agent files: `agents/<name>.md`
- Skill directories: `skills/<name>/SKILL.md`
- Command files: `commands/<name>.md`
- Test files: `tests/<mirror-of-scripts>/*.test.js`

### File Formats

**Agents** — YAML frontmatter required:
```markdown
---
name: agent-name
description: What this agent does
tools: [Read, Bash, Edit]
model: claude-sonnet-4-5
---
Agent instructions...
```

**Skills** — SKILL.md with frontmatter:
```markdown
---
name: skill-name
description: What this skill covers
origin: curated | generated
---
# When to Use
# How It Works
# Examples
```

**Commands** — `description:` frontmatter required:
```markdown
---
description: What this command does
---
Command instructions...
```

**Hooks** — JSON matcher + hooks array in `hooks/hooks.json`.

### Package Manager
Detection order: `CLAUDE_PACKAGE_MANAGER` env var → project config → auto-detect (npm/pnpm/yarn/bun). Current project uses **Yarn 4.9.2**.

### Cross-Platform
All scripts use Node.js for cross-platform compatibility (Windows, macOS, Linux). Avoid shell-only constructs in hook scripts.

## MCP Configurations

`mcp-configs/mcp-servers.json` contains 27 pre-configured MCP servers. Notable ones:

| Server | Purpose |
|--------|---------|
| `github` | GitHub PRs, issues, repositories |
| `supabase` | Database operations |
| `memory` | Persistent memory across sessions |
| `sequential-thinking` | Chain-of-thought reasoning |
| `playwright` | Browser automation |
| `filesystem` | Filesystem operations |
| `exa-web-search` | Web search |
| `context7` | Live documentation lookup |
| `jira` | Atlassian Jira integration |
| `token-optimizer` | Token optimization (95%+ reduction) |

## Testing Requirements

- Run `node tests/run-all.js` before committing
- New scripts in `scripts/lib/` require a matching test in `tests/lib/`
- New hooks require at least one integration test in `tests/hooks/`
- 80% coverage threshold enforced (lines, functions, branches, statements)
- Run `npx markdownlint-cli '**/*.md' --ignore node_modules` before committing Markdown

## Contributing

Follow formats in `CONTRIBUTING.md`. Key rules:
- Use **conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Keep changes focused — one concept per PR
- New language support: add agent (`agents/<lang>-reviewer.md`), skill (`skills/<lang>-patterns/`), rule set (`rules/<lang>/`), and tests
- Validate with `npm test` before submitting

## ECC 2.0 (Alpha)

The `ecc2/` directory contains an in-tree Rust control-plane prototype. It is experimental and not yet stable. Do not modify it without understanding the architecture in `docs/ecc2/`.
