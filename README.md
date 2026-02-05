# API Hover

API Hover: See API calls tied to UI interactions.

## What it does
- Hover elements to see linked API calls
- Correlates clicks, submits, and Enter key interactions with fetch/XHR
- Session-only tracking (no persistence)

## How it works
Main-world instrumentation captures fetch/XHR, a CSUI overlay renders hover tooltips, and a background tab store keeps correlation state across navigations.

## Repo layout
- `apps/extension`: Plasmo MV3 extension
- `apps/www`: Landing page
- `packages/core`: Types and correlation helpers

## Quick start
```
pnpm install
pnpm dev:extension
pnpm dev:www
```

## Testing
```
pnpm --filter @api-hover/core test
```

## Troubleshooting
GitHub CSP blocks the Plasmo HMR websocket. If you see CSP errors, use the production build instead of dev HMR.
