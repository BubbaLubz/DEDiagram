# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DEDiagram** is a data engineering pipeline diagram generator with AI assistance. Users can visually build data pipeline architectures or describe them in natural language and have Claude generate them automatically.

The code lives inside the `DEDiagrams/` subdirectory (not the repo root).

## Commands

All commands should be run from `DEDiagrams/`:

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Run both client and server in development mode
npm run dev

# Run individually
npm run dev:client   # Vite on port 3000
npm run dev:server   # Express on port 3001 (nodemon)

# Build client for production
npm run build

# Run in production mode
npm run start
```

The Anthropic API key must be set as `ANTHROPIC_API_KEY` in the environment, or it can be submitted per-request via the `POST /api/generate` endpoint's `apiKey` field.

## Architecture

### Monorepo Structure

```
DEDiagrams/
├── client/          # React + Vite frontend (port 3000)
└── server/          # Express backend (port 3001)
```

Vite proxies all `/api/*` requests to the backend during development.

### Frontend (`client/src/`)

- **State:** Single Zustand store (`store/index.js`) — holds canvas nodes/edges, UI state, saved diagrams, and all actions including server sync.
- **Canvas:** ReactFlow (`DiagramCanvas.jsx`) with custom node (`ComponentNode.jsx`) and edge (`LabeledEdge.jsx`) types.
- **Layout:** Dagre (`@dagrejs/dagre`) handles auto-layout; exposed via `window.__deAutoLayout` / `window.__deFitView`.
- **Data files:** `componentLibrary.js` defines all supported DE components with visual/metadata properties; `costModels.js` has pricing data; `templates.js` has pre-built diagrams.

### Backend (`server/index.js`)

Single-file Express server. Key responsibilities:
- **CRUD API** for diagrams, persisted to `server/data/diagrams.json` (flat JSON file, no database).
- **`POST /api/generate`** — streams AI-generated diagram JSON via Server-Sent Events (SSE) using Claude claude-sonnet-4-6.
- **`POST /api/test-key`** — validates an Anthropic API key.

### AI Generation Flow

1. `GenerateModal.jsx` collects user prompt + optional API key.
2. Client POSTs to `/api/generate` and reads the SSE stream.
3. Server sends Claude a large system prompt defining the 30+ allowed component types and pipeline layout rules (left-to-right: Sources → Ingestion → Processing → Storage → Serving, x-increment of 300, y-spacing of 170).
4. Claude returns JSON with `nodes` and `edges`; server streams partial JSON then a final `complete` event.
5. Client parses the JSON and loads it into the Zustand store.

### Component Types

Components are defined in `client/src/data/componentLibrary.js` **and** must be listed in the server's system prompt inside `server/index.js`. When adding a new component type, update both files.

### Styling

Custom dark theme defined in `tailwind.config.js`: `canvas` (#0d1117), `surface` (#161b22), `panel` (#1c2333), `border` (#30363d), `accent` (#58a6ff). Use these tokens instead of arbitrary colors.