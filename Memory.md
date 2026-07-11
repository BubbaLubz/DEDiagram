# Memory: AI-Generation Metrics & Guardrails

Session notes on quantifying claims about DEDiagram's AI generation/edit pipeline. Covers what was measured, how, and the corrections made along the way so future sessions don't re-derive or re-assert stale numbers.

## Eval scripts (in `DEDiagrams/server/eval/`)

- **`ambiguousPrompts.js`** — Tests how `/api/generate` handles 20 curated ambiguous/underspecified prompts (e.g. `"pipeline"`, `"ML real-time sync monitor analytics"`, `"kafka spark s3"`). For each prompt, calls the live Anthropic API twice: once without `SKIP_CLARIFICATION` (should ask clarifying questions) and once with it (should build a sensible pipeline anyway). Run with `node server/eval/ambiguousPrompts.js` (makes 40 real API calls, real cost).
- **`editPayloadSize.js`** — Measures the token/byte savings from `/api/edit`'s field-level slimming of node/edge objects before serializing them into the prompt. Uses Anthropic's `messages.countTokens` (no completion generated, negligible cost) against a real 9-node/9-edge template from `client/src/data/templates.js`.
- **`server/lib/generatePrompt.js`** — extracted from `server/index.js` as the single source of truth for `SYSTEM_PROMPT`/`extractJSON`, so eval scripts exercise the actual production prompt instead of a duplicated copy that could drift.

## Results (as of 2026-07-11)

| Metric | Result | Method |
|---|---|---|
| Ambiguity-detection rate | 100% (20/20) | No-skip calls correctly returned `needsClarification` every time |
| Sensible-default rate | 95% (19/20) | Skip-clarification calls built a valid, schema-compliant pipeline; 1 failure used `componentType: "grafana"`, which isn't in `shared/component-types.json` |
| Edit payload size reduction | ~40% bytes / ~34% input tokens | Slim node/edge fields vs. simulated full ReactFlow v11 runtime shape, on the "Modern Data Stack" template |

## Important corrections / caveats

- **The "grafana" eval failure isn't a real production failure.** `/api/generate` and `/api/edit` both sanitize `componentType` against `VALID_COMPONENT_TYPES` and silently fall back to `rest_api` for anything unrecognized (`server/index.js` ~line 400 and ~565). The eval script calls the Anthropic API directly and does NOT replicate this sanitization step, so it scores raw model output against a stricter bar than what a user actually sees. It's still a meaningful signal (model hallucinated outside its vocabulary), just not a "the app broke" event.
- **There is no diff-based edit mode.** An earlier draft bullet claimed `/api/edit` "serializes only diff-relevant canvas topology instead of full regeneration." That's not what the code does: the client sends the *entire* current diagram every time, and `EDIT_SYSTEM_PROMPT` explicitly instructs the model to "Return the COMPLETE updated diagram JSON — all nodes and edges, not just the changes." The only real optimization is **field-level slimming** (dropping ReactFlow runtime-only fields like `width`, `height`, `selected`, `dragging`, `positionAbsolute`, edge `markerEnd`) — not diff-based editing. The accurate bullet: *"Cut `/api/edit` request payload by ~40% (~34% fewer input tokens) by serializing only essential node/edge fields instead of full ReactFlow node objects."*
- **The "full ReactFlow shape" baseline in `editPayloadSize.js` is a reasoned estimate**, not captured from a live browser session — there's no browser-automation tooling (Playwright/Puppeteer) in this repo. It's based on documented ReactFlow v11 behavior (fields a node/edge picks up after one render + one drag). The token counts themselves are exact (real Anthropic tokenizer), but the "full" side of the comparison is a reconstruction, flagged as such.

## Guardrails on `/api/generate` and `/api/edit` (server/index.js)

1. Input validation: non-empty prompt, `MAX_PROMPT_LENGTH = 4000` chars.
2. Rate limiting: 10 requests/IP/24h (`aiRateLimit`).
3. Site-wide circuit breaker: 200 AI calls/day total (`aiDailyCap`, configurable via `DAILY_AI_CALL_LIMIT`).
4. Semantic buildability/actionability check baked into the system prompts — model must identify a real subject + purpose (generate) or a real target + concrete change (edit) before building, else must return `needsClarification`.
5. `SKIP_CLARIFICATION` token — explicit override to force a best-effort build instead of an ask-loop.
6. `extractJSON()` — tolerant JSON extraction from raw model text (strips preamble/markdown fences).
7. `JSON.parse` wrapped in try/catch — malformed output returns a graceful SSE error, not a crash.
8. `needsClarification` shape validation before forwarding to the client.
9. Component-type whitelist enforcement — invalid `componentType` silently coerced to `rest_api`.
10. Edge-type normalization — all edges forced to `type: 'labeled'`.
11. API-error mapping — Anthropic errors translated to user-facing messages (401/404/429) without leaking internals.
