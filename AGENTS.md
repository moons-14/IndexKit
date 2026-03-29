# Repository Guidelines

## Project Structure & Module Organization

This repository is a `pnpm` workspace managed with Turborepo.

- `apps/`: application entry points. Add user-facing services here when they are introduced.
- `packages/`: shared packages used by apps.
- `packages/loader/`: current package for file scanning and loader logic.
- `packages/loader/src/`: TypeScript source files.
- `packages/loader/dist/`: generated build output from `tsc`.
- `tsconfig.base.json`: shared TypeScript compiler settings for workspace packages.

Keep package code in `src/` and avoid editing generated files in `dist/`.

## Build, Test, and Development Commands

Run commands from the repository root unless a package-specific command is noted.

- `pnpm install`: install workspace dependencies.
- `pnpm build`: run all package builds through Turbo.
- `pnpm check-types`: run TypeScript checks across the workspace.
- `pnpm lint`: run Biome checks in all packages.
- `pnpm format`: apply Biome formatting.
- `pnpm cspell`: run spell checking.
- `pnpm --filter @indexkit/loader build`: build only the loader package.
- `pnpm --filter @indexkit/loader check-types`: type-check only the loader package.

## Coding Style & Naming Conventions

Use TypeScript with ESM modules and strict compiler settings. Formatting is enforced by Biome with 2-space indentation. Prefer:

- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and classes
- short, descriptive package names under `@indexkit/*`
- one main export surface per package in `src/index.ts`

## Testing Guidelines

There is no test runner configured yet. Until one is added, every code change should at minimum pass `pnpm build`, `pnpm check-types`, and `pnpm lint`.

When tests are introduced, place them beside the source as `*.test.ts` or under a package-local `tests/` directory, and make sure Turbo can run them workspace-wide.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit messages such as `loader`, `gitignore`, and `Add full-stack app: Hono API + Next.js web frontend`. Follow that pattern: concise subject lines describing one logical change.

Pull requests should include a brief summary, impacted paths, verification commands you ran, and screenshots only for visible UI changes. Link related issues when applicable.
