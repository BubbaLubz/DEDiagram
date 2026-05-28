# DEDiagram

A data engineering pipeline diagram builder with AI-assisted generation. Visually compose pipelines by dragging components onto a canvas, or describe your architecture in plain English and let Claude generate it for you.

## Features

- **AI Generate** — describe a pipeline in natural language; Claude streams back a fully-laid-out diagram
- **AI Edit** — modify an existing diagram with a plain-English instruction
- **36 built-in components** across 10 categories: Sources, Ingestion, Streaming, Processing, Orchestration, Storage, Warehouse, Serving/BI, Infrastructure, AI/LLM
- **Custom Box** — a free-form node you can name, describe, and assign an emoji icon to
- **Edge types** — Batch, Streaming, API, CDC, Event, SQL, each with distinct color coding
- **Inline edge editing** — double-click any connection label to rename it
- **Auto-layout** — Dagre-powered left-to-right layout with one click
- **Cost estimator panel** — rough monthly cloud cost estimates per component
- **Save / Load** — diagrams persisted server-side; load from the saved list at any time
- **Import / Export** — JSON round-trip and PNG export

## Getting Started

All commands run from the `DEDiagrams/` directory.

```bash
# Install dependencies (root + client + server)
npm run install:all

# Start both client and server in development mode
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:3000 |
| Backend (Express) | http://localhost:3001 |

Vite proxies all `/api/*` requests to the backend during development.

### Anthropic API Key

The AI Generate and AI Edit features require a Claude API key. Paste it into the Generate modal on first use — it is sent per-request and never stored server-side.

## Project Structure

```
DEDiagrams/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── nodes/       # ComponentNode (canvas node renderer)
│       │   ├── edges/       # LabeledEdge (double-click to edit)
│       │   ├── modals/      # SaveModal, GenerateModal
│       │   ├── DiagramCanvas.jsx
│       │   ├── LeftSidebar.jsx
│       │   ├── DetailPanel.jsx
│       │   ├── CostPanel.jsx
│       │   └── Toolbar.jsx
│       ├── context/
│       │   └── CanvasActionsContext.js  # autoLayout / fitView / exportImage
│       ├── data/
│       │   ├── componentLibrary.js      # All 36 components + categories
│       │   ├── costModels.js            # Monthly cost estimates
│       │   └── templates.js            # Starter diagrams
│       └── store/
│           ├── index.js                # Composes the three slices
│           ├── canvasSlice.js          # nodes, edges, selection
│           ├── uiSlice.js              # modal/panel open state
│           └── diagramSlice.js         # metadata + server CRUD
├── server/
│   ├── index.js             # Express API (diagrams CRUD + AI streaming)
│   └── data/diagrams.json   # Flat-file persistence (auto-created)
└── shared/
    └── component-types.json # Single source of truth for valid component type strings
```

## Architecture Notes

### Canvas controls
- **Left-click drag** — box-select multiple nodes
- **Right-click drag** — pan the canvas
- **Scroll** — zoom in/out

### State management
The Zustand store is split into three slices composed in `store/index.js`:
- `canvasSlice` — ReactFlow nodes/edges, selection, and all canvas mutations
- `uiSlice` — modal visibility, panel toggles, active sidebar tab
- `diagramSlice` — diagram name/id, dirty flag, saved list, and server calls

### Component registry
`shared/component-types.json` is the single source of truth for valid component type strings. Both the client (`componentLibrary.js`) and the server's AI prompt derive their type lists from this file. When adding a new component, update `componentLibrary.js` and `shared/component-types.json`.

### AI generation flow
1. `GenerateModal` POSTs `{ prompt, apiKey }` to `POST /api/generate`
2. Server opens a Claude streaming session and forwards tokens via SSE
3. On `done`, the full JSON is parsed, validated against the component registry, and loaded into the canvas

### Adding a component
1. Add an entry to `COMPONENTS` in `client/src/data/componentLibrary.js` (include a `lucideIcon` field from [lucide.dev](https://lucide.dev))
2. Add the type string to the correct category array in `shared/component-types.json`
3. Optionally add a cost model entry in `client/src/data/costModels.js`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS |
| Canvas | ReactFlow 11 |
| Layout | @dagrejs/dagre |
| Icons | lucide-react |
| State | Zustand 4 (sliced) |
| Backend | Express 4, Node.js |
| AI | Anthropic SDK (`claude-sonnet-4-6`), SSE streaming |
| Persistence | Flat JSON file (`server/data/diagrams.json`) |
