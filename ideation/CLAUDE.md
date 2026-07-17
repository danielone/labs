# CLAUDE.md — `ideation` workspace

This file governs **all work inside `ideation/`**. Read it before creating, modifying, or reviewing any code here. Rules in this file take precedence over general habits; per-app `CLAUDE.md` files may *extend* these rules but never contradict them.

## 1. What this directory is

`ideation` is a multi-application workspace for rapidly prototyping and maturing product ideas. Each idea becomes its own application, but all applications share one design system, one architectural pattern, and one set of execution rules so that code, components, and lessons transfer cleanly between them.

## 2. Workspace layout (top level)

```
ideation/
├── CLAUDE.md                  ← this file (global rules)
├── package.json               ← workspace root (npm workspaces)
├── tsconfig.base.json         ← shared TS config all apps extend
├── apps/                      ← one directory per application
│   ├── <app-name>/
│   └── <app-name>/
└── packages/                  ← code shared across applications
    ├── ui/                    ← shared shadcn/ui component library + theme tokens
    ├── core/                  ← shared pure domain utilities (framework-free)
    └── config/                ← shared eslint / tailwind / ts configs
```

- **Every new application** goes in `apps/<app-name>/` (kebab-case name). Never scaffold an app at the workspace root or inside another app.
- **`packages/*` is created lazily** — don't build shared packages speculatively. Extract into `packages/` only when a *second* app actually needs the code. Until then, code lives in the app that uses it.
- Use **npm workspaces** (root `package.json` with `"workspaces": ["apps/*", "packages/*"]`). One lockfile at the workspace root. Never run `npm install` inside an app directory with its own lockfile.

## 3. Per-application layered architecture

Every app under `apps/<app-name>/` uses the same four layers, as distinct directories. Default stack: **Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui**. If an app justifies a different framework, keep the same layer names and rules and document the deviation in the app's own `CLAUDE.md`.

```
apps/<app-name>/
├── CLAUDE.md              ← app-specific notes: purpose, status, deviations
├── src/
│   ├── app/               ← LAYER 1: routes/entry (Next.js App Router pages, layouts, API routes)
│   ├── components/        ← LAYER 2: presentation
│   │   ├── ui/            ←   shadcn/ui primitives (CLI-generated — see §4)
│   │   └── <feature>/     ←   composed feature components
│   ├── domain/            ← LAYER 3: business logic (pure TS: types, entities, rules, calculations)
│   └── infrastructure/    ← LAYER 4: external world (API clients, storage, third-party SDKs)
│   └── lib/               ← cross-cutting helpers only (cn(), formatters); no business logic
└── ...
```

### Layer responsibilities

| Layer | Contains | Must NOT contain |
|---|---|---|
| `app/` (routes) | Routing, layouts, page composition, server actions/API route handlers that *delegate* | Business rules, direct fetch calls to third parties, UI markup beyond composition |
| `components/` (presentation) | React components, styling, client interactivity | Data-fetching logic, business rules, direct API/storage access |
| `domain/` | Types, entities, validation, business rules, pure functions | React, Next.js, fetch, browser/node APIs — **zero framework imports** |
| `infrastructure/` | HTTP clients, DB/storage adapters, external SDK wrappers, env access | React components, business rules (it moves data, it doesn't decide) |

### Dependency direction (the one rule that matters most)

Imports flow **downward only**:

```
app  →  components  →  domain
app  →  infrastructure  →  domain
```

- `domain/` imports nothing from the other layers. It is the innermost layer.
- `components/` never imports from `infrastructure/` — data reaches components as props or via hooks/server components defined in `app/`.
- `infrastructure/` never imports from `components/` or `app/`.
- If you need to break this, stop and restructure instead — the exception becomes the norm within a week.

## 4. Design system: shadcn/ui (mandatory)

All UI in every app is built with **shadcn/ui** (https://ui.shadcn.com) on Tailwind CSS. No other component libraries (no MUI, Chakra, Ant, Mantine, DaisyUI) without an explicit decision recorded in the app's `CLAUDE.md`.

### Setup and usage rules

1. **Install via the CLI, never copy-paste from memory**: `npx shadcn@latest init` to set up, `npx shadcn@latest add <component>` to add components. Components land in `src/components/ui/`.
2. **`components/ui/` is the primitives directory.** Light edits to generated primitives are allowed (that's the point of shadcn), but keep them app-agnostic — variants and styling only, no business logic and no app-specific copy.
3. **Compose, don't fork.** Build feature components in `components/<feature>/` by composing primitives from `components/ui/`. Don't duplicate a primitive to tweak it — add a variant with `class-variance-authority`.
4. **Theme through CSS variables only.** All colors, radii, etc. flow through the shadcn CSS-variable tokens in `globals.css` (`--background`, `--primary`, `--radius`, …). Never hardcode hex values in components; use semantic Tailwind classes (`bg-primary`, `text-muted-foreground`).
5. **Dark mode is not optional.** Every app supports light and dark via the standard shadcn `.dark` class strategy (use `next-themes`). Verify both modes before calling UI work done.
6. **Use `cn()`** (from `lib/utils.ts`) for all conditional class merging. Never string-concatenate Tailwind classes.
7. **Accessibility comes from Radix — don't undo it.** Don't replace shadcn's Radix-based interactive components (Dialog, Dropdown, Select, …) with hand-rolled divs and click handlers.
8. **Icons: `lucide-react`** (shadcn's default). One icon set per app.
9. **When two apps need the same customized component**, promote it to `packages/ui/` and import it from there in both — don't maintain two divergent copies.

## 5. Global project rules

- **TypeScript strict mode everywhere.** `"strict": true`, no `any` unless annotated with a comment explaining why. No `@ts-ignore` — use `@ts-expect-error` with a reason if truly unavoidable.
- **Validation at the boundary.** Anything entering from the outside world (API responses, form input, URL params, env vars) is validated with `zod` in the infrastructure or route layer before it touches domain code. Inside the boundary, trust the types.
- **Secrets and env**: never commit secrets. Env access happens only in `infrastructure/` (or a single `env.ts` that validates `process.env` with zod). Components and domain code never read `process.env`.
- **Naming**: kebab-case for files and directories (`user-card.tsx`), PascalCase for components/types, camelCase for functions/variables.
- **Every app ships with**: `dev`, `build`, `lint`, and `typecheck` scripts in its `package.json`. `npm run typecheck -w apps/<app>` must pass before any work is called done.
- **Testing**: prototypes don't need exhaustive coverage, but `domain/` logic that implements real rules gets unit tests (Vitest). Pure functions are cheap to test — test them.
- **Commits**: prefix with the app name — `<app-name>: <what changed>` (e.g. `next-train: add express diamond badges`). Workspace-level changes use `ideation:`.

## 6. Cross-layer & cross-app execution rules

These are the rules for *how agents and humans work* in this workspace:

1. **No cross-app imports.** `apps/foo` never imports from `apps/bar`. Shared code goes through `packages/*`.
2. **Change one layer at a time when possible.** A PR/commit that touches `domain/` and `components/` should explain why both moved together.
3. **New feature workflow**: define types + rules in `domain/` → wire data access in `infrastructure/` → compose UI in `components/` → mount it in `app/`. Work inside-out; the UI is the last thing you write, not the first.
4. **Before creating a component, check what exists**: first `components/ui/` in the app, then `packages/ui/`, then the shadcn registry (`npx shadcn@latest add …`). Writing a bespoke button/dialog/table from scratch is almost always wrong here.
5. **Refactors that move code across layers** (e.g. extracting fetch logic out of a component into `infrastructure/`) are always welcome and can be done opportunistically — that direction of travel is the architecture working as intended.
6. **When starting a brand-new app**, scaffold it as: `apps/<name>` via `create-next-app` (TypeScript, Tailwind, App Router, `src/` dir) → `npx shadcn@latest init` → create the four layer directories → add an app-level `CLAUDE.md` stating the app's one-sentence purpose and current status. Run it locally only — do **not** deploy to Vercel unless explicitly asked (see §7).
7. **Keep each app's `CLAUDE.md` current.** It records: purpose, status (idea / prototype / active / parked), any deviations from this file, and how to run it. Update it when those change, not just at creation.
8. **Prototype ≠ sloppy.** Speed comes from the shared system (shadcn, layers, conventions), not from skipping it. The layering is what lets a throwaway idea graduate into a real app without a rewrite.

## 7. Deployment

**Local first — Vercel only on explicit request.** New apps run locally (`npm run dev -w apps/<name>`) and stay local. Never create a Vercel project or deploy as part of scaffolding, building a feature, or finishing a task — deploying to Vercel happens only when the user explicitly asks for it, and each deploy request covers that deploy only (it is not standing permission for future deploys).

When the user does ask, apps deploy to Vercel (account: `danielone`). Because this is an npm-workspaces monorepo, each app gets its own Vercel project configured as follows:

- **Project name**: `ideation-<app-name>` (e.g. `ideation-hello-world`) — never bare `<app-name>`, to avoid colliding with other projects on the account.
- **Root Directory**: `apps/<app-name>`, with *source files outside root directory* enabled (required so `tsconfig.base.json` at the workspace root resolves during the build). The CLI can't set this — use the dashboard or `PATCH /v9/projects/<id>` with `{"rootDirectory": "apps/<name>", "sourceFilesOutsideRootDirectory": true}`.
- **Deploy from the workspace root** (`ideation/`), never from inside the app: `npx vercel deploy --prod --yes`. The `.vercel/` link lives at the workspace root. If a second app needs its own project, switch to `vercel link --repo` (multi-project linking).
- Deploying the app directory in isolation **will fail** — the workspace root (base tsconfig, lockfile) won't be uploaded.

## 8. Quick reference — where does this code go?

| You're writing… | It goes in… |
|---|---|
| A page or route | `src/app/` |
| A shadcn primitive (button, dialog) | `src/components/ui/` (via CLI) |
| A composed feature component | `src/components/<feature>/` |
| A type, entity, or business rule | `src/domain/` |
| A fetch call to an external API | `src/infrastructure/` |
| A date formatter or `cn()` helper | `src/lib/` |
| Code two apps both need | `packages/*` |
| A one-off script | that app's `scripts/` dir |
