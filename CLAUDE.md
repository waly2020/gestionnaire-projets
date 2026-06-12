# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start dev server (apps/web on http://localhost:5175)
npm run dev

# Build all packages
npm run build

# Type-check without emitting
npm run typecheck

# Lint
npm run lint

# Format with Prettier (auto-sorts Tailwind classes)
npm run format
```

### Per-workspace
```bash
# Type-check apps/web only (fastest feedback loop)
cd apps/web && npx tsc --noEmit

# Build apps/web only via Turbo
turbo run build --filter web

# Dev with Turbo (preferred — respects task graph)
turbo run dev
```

There are no tests in this project.

## Architecture

**Turborepo monorepo** with two packages:
- `apps/web` — the React app (Vite 8, React 19, TypeScript strict)
- `packages/ui` — shared component library (`@workspace/ui`)

### Data layer (no backend)

All data lives in the browser:
- **localStorage** (`pm_projects`, `pm_library`) — project metadata, library items. Managed by `useProjects` and `useLibrary` hooks.
- **IndexedDB** (`pm_files` DB, `blobs` store) — binary file attachments. Managed by `useFiles.ts`.

The hooks are the single source of truth. Components never write to storage directly.

### View routing

`App.tsx` manages a simple `AppView` string state (`'dashboard' | 'project-detail' | 'library' | 'stats'`) and renders the corresponding top-level component. No router library is used.

### Key data models (`apps/web/src/types.ts`)

```
Project
  ├── isComposite?: boolean
  ├── subProjects?: SubProject[]     // each has its own type/stack
  ├── todoLists: TodoList[]
  │     └── subProjectId?: string    // undefined = global list; sp.id = scoped to component
  └── attachments?: Attachment[]     // metadata only; blob lives in IndexedDB
```

A **composite project** groups sub-projects (components) together. Todo lists can be assigned to a specific component (`subProjectId`) or left global (`subProjectId` undefined).

### Component conventions

- **Modal forms** use `key` prop incremented on open (e.g. `editKey`, `createKey`) to remount and reset form state — no `useEffect` form resets.
- **CreateProjectModal** uses `id="project-form"` on the `<form>` and `form="project-form"` on the submit button in a fixed bottom bar, so the button lives outside the scrollable area.
- **Composite card colors** stored on `SubProject.color`; applied as inline styles with hex alpha suffixes (e.g. `color + '18'` ≈ 9% opacity for background, `color + '28'` for border, `color + '22'` for header).

### `@workspace/ui` package

Radix UI primitives wrapped with Tailwind CSS v4 variants via `class-variance-authority`. Import pattern:
```ts
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
```

`cn()` is the project-wide utility for merging Tailwind classes (clsx + tailwind-merge).

### Tailwind

Uses **Tailwind CSS v4** via `@tailwindcss/vite`. Arbitrary values like `max-w-[1500px]` should be replaced with canonical classes (`max-w-375`) when VS Code's IntelliSense suggests them. Prettier auto-sorts class order on format.

## Deployment

Deployed on Netlify. Build command: `turbo run build --filter web`. Publish directory: `apps/web/dist`. The `tsc -b` in the build script validates all TypeScript before bundling — always run `cd apps/web && npx tsc --noEmit` before committing to catch JSX structural errors that the local dev server may not surface.
