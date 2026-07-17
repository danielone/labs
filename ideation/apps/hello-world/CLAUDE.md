@AGENTS.md

# hello-world

**Purpose**: Reference implementation of the `ideation` workspace conventions (see [../../CLAUDE.md](../../CLAUDE.md)) — Next.js App Router + shadcn/ui + the four-layer architecture. Use it as the template when scaffolding new apps.

**Status**: active (workspace skeleton demo)

**Run it**: `npm run dev -w apps/hello-world` from the workspace root (`ideation/`). Install dependencies from the root only — never inside this directory.

**Layers in this app**:
- `src/domain/greeting.ts` — pure greeting data + cycle logic, no framework imports
- `src/infrastructure/build-info.ts` — reads Vercel env vars, validated with zod
- `src/components/hello/`, `src/components/theme/` — feature components composing `components/ui/` primitives
- `src/app/` — layout (ThemeProvider) and page wiring the layers together

**Deploy**: Vercel project `ideation-hello-world` (root directory `apps/hello-world`), production at https://ideation-hello-world.vercel.app. From the workspace root: `npx vercel deploy --prod --yes`.

**Deviations from workspace rules**: none.
