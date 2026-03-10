# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IndexKit is a fast, modern local reading server and reader supporting CBZ, CBR, PDF, EPUB, and image directories. It is a pnpm monorepo using Turbo for task orchestration.

## Commands

```bash
pnpm dev          # Start development servers (persistent, no cache)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format code
pnpm check-types  # TypeScript type checking
pnpm cspell       # Spell checking
```

## Architecture

This is a **pnpm + Turbo monorepo** with two workspace directories:
- `apps/*` — application packages (e.g., the reading server/UI)
- `packages/*` — shared libraries

New packages should be placed in `apps/` or `packages/` and will be automatically picked up by the workspace.

## Tooling

- **Biome** — linting and formatting (2-space indent, React/Next.js rules, VCS-aware)
- **TypeScript 5.9+** — strict typing; run `pnpm check-types` to validate
- **cSpell** — spell checking; add project-specific words to `cspell.json` if needed
- **Turbo** — caches `build` output; `dev` runs persistently without cache

## Requirements

- Node.js ≥ 22.20.0
- pnpm ≥ 10.24.0
- Use catalog versions from `pnpm-workspace.yaml` when adding shared dev dependencies
