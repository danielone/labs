# ideation

A multi-application workspace for rapidly prototyping product ideas. Every idea becomes its own app, but all apps share one design system (shadcn/ui), one architecture, and one set of conventions — so components, patterns, and lessons transfer between projects, and a throwaway prototype can graduate into a real app without a rewrite.

> **How this repo is governed:** [CLAUDE.md](CLAUDE.md) is the rulebook. Claude Code reads it automatically at the start of every session in this directory and follows it when scaffolding, building, and reviewing code. This README is the human-facing summary; CLAUDE.md is the source of truth.

## Architecture at a glance

### Workspace layout

```
ideation/
├── CLAUDE.md            global rules (read by Claude Code every session)
├── package.json         npm workspaces root — one lockfile, install from here only
├── tsconfig.base.json   strict TS config every app extends
├── apps/                one directory per application
│   └── hello-world/     reference app — copy its patterns
└── packages/            code shared across apps (created lazily, when a 2nd app needs it)
```

### Inside every app: four layers

Each app is Next.js (App Router) + TypeScript (strict) + Tailwind + **shadcn/ui**, organized into four layers with imports flowing strictly downward:

```
src/
├── app/              routes, layouts, page composition
├── components/       presentation
│   ├── ui/           shadcn primitives (added via CLI only)
│   └── <feature>/    composed feature components
├── domain/           pure business logic — zero framework imports
└── infrastructure/   the outside world: API clients, storage, env (zod-validated)
```

```
app → components → domain
app → infrastructure → domain
```

`domain/` imports nothing from the other layers. Components never touch `infrastructure/` — data arrives as props. This is what keeps prototypes refactorable.

### Design system

All UI is [shadcn/ui](https://ui.shadcn.com) on Tailwind: primitives added via `npx shadcn@latest add <component>`, theming exclusively through CSS-variable tokens (never hardcoded colors), dark mode required (`next-themes`), `lucide-react` icons, `cn()` for class merging. No other component libraries.

## Starting a new app with Claude Code

Open Claude Code in this directory (`ideation/`) and just describe the app. Claude reads CLAUDE.md and handles the scaffolding conventions for you. For example:

```
Create a new app called recipe-box: a place to save and tag favorite recipes.
Start with a list page and an add-recipe form.
```

Claude will follow the recipe in CLAUDE.md §6:

1. Scaffold `apps/recipe-box` with `create-next-app` (TypeScript, Tailwind, App Router, `src/`)
2. Initialize shadcn/ui and add components via the CLI
3. Create the four layer directories and build the feature inside-out (domain → infrastructure → components → routes)
4. Add an app-level `CLAUDE.md` recording the app's purpose and status
5. Run it **locally only** — apps are never deployed to Vercel unless you explicitly ask

Useful follow-up prompts:

- `Run it locally` — starts the dev server (or run `npm run dev -w apps/recipe-box` yourself)
- `Deploy recipe-box to Vercel` — the only way a deploy happens; Claude sets up the monorepo-aware Vercel project per CLAUDE.md §7
- `Promote the <X> component to packages/ui` — when a second app needs a shared component

### Doing it by hand

```bash
# from ideation/ — always install from the workspace root
npm install

# run an existing app
npm run dev -w apps/hello-world

# checks (run per app or across the whole workspace)
npm run typecheck -w apps/hello-world
npm run lint -w apps/hello-world
npm run build -w apps/hello-world
```

## Apps

| App | Purpose | Status |
|---|---|---|
| [hello-world](apps/hello-world/) | Reference implementation of the workspace conventions | active · [live](https://ideation-hello-world.vercel.app) |

Add a row here when a new app is created (each app's own `CLAUDE.md` carries the details).
