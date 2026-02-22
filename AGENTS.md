# AGENTS Guide

This file is a quick operating guide for humans and coding agents working in this repository.

## Monorepo Basics

- Package manager: `pnpm` only
- Task runner: Turborepo (`turbo`)
- Workspace file: `pnpm-workspace.yaml`
- Main apps:
  - `apps/extension` (Plasmo browser extension)
  - `apps/www` (Next.js landing site)
- Main packages:
  - `packages/core`
  - `packages/shared`
  - `packages/ui`

## Root Commands

Run these from `/Users/ameya/Code/oss/api-hover`.

- `pnpm dev` - run all package `dev` tasks via turbo
- `pnpm build` - run all package `build` tasks via turbo
- `pnpm lint` - run all package `lint` tasks via turbo
- `pnpm check-types` - run all package `check-types` tasks via turbo
- `pnpm test` - run all package `test` tasks via turbo
- `pnpm format` - run prettier on `**/*.{ts,tsx,md}`
- `pnpm format:check` - check prettier formatting for `**/*.{ts,tsx,md}`
- `pnpm clean` - clean turbo cache and remove root `node_modules`

Targeted app scripts from root:

- `pnpm dev:extension`
- `pnpm build:extension`
- `pnpm dev:www`
- `pnpm build:www`

## Shared and UI Packages

`packages/shared` and `packages/ui` currently use placeholder scripts for build, dev, lint, and format.

## Build and Runtime Notes

- Root `package.json` sets `node >= 18`.
- `apps/www` uses Next.js 16, which requires Node `>= 20.9.0` for `next build`.
- If local web builds fail with Node version errors, switch Node before running `pnpm --filter www build`.

## Vercel and Turbo Notes

- Turbo build outputs include `.next/**` and exclude `.next/cache/**`.
- This is required so cached web builds still include `.next/routes-manifest.json`.

## Recommended Verification Flow

For extension-only changes:

1. `pnpm --filter @api-hover/extension format`
2. `pnpm --filter @api-hover/extension check`
3. `pnpm --filter @api-hover/extension build`

For web-only changes:

1. `pnpm --filter www format`
2. `pnpm --filter www lint`
3. `pnpm --filter www build`

For cross-package changes:

1. `pnpm format`
2. `pnpm check-types`
3. `pnpm build`

## Files and Artifacts to Ignore in Reviews

- `.next/`
- `build/`
- `.plasmo/`
- `.turbo/`
- `*.tsbuildinfo`

## Commit Style

Use conventional commit messages when possible:

- `feat(scope): ...`
- `fix(scope): ...`
- `chore(scope): ...`
- `docs(scope): ...`

Keep commits atomic and scoped to one logical change.
