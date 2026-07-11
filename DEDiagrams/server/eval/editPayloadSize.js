#!/usr/bin/env node
// Quantifies the ONE real payload-reduction optimization that exists in
// /api/edit today: field-level slimming of node/edge objects before they're
// serialized into the model prompt (server/index.js "Trim node data to
// essentials to keep token count low").
//
// IMPORTANT — what this does NOT measure: /api/edit does not do diff-only
// editing. The client sends the full current diagram (server/index.js:492,
// client GenerateModal.jsx:106) and the model is instructed to return the
// COMPLETE updated diagram every time (EDIT_SYSTEM_PROMPT). So there is no
// "diff-relevant topology instead of full regeneration" mechanism to
// benchmark — only the field-level trim.
//
// "Full" node/edge shape is a documented-behavior estimate of what a live
// ReactFlow v11 node/edge carries once rendered/dragged once (width, height,
// selected, dragging, positionAbsolute; edges: selected + the app's
// defaultEdgeOptions markerEnd from DiagramCanvas.jsx) — not captured from a
// live browser session, since no browser-automation tooling is set up in
// this repo. Flagged clearly so this number isn't overstated as measured
// production telemetry.
//
// Token counts ARE real: uses the live Anthropic API's messages.countTokens
// (no completion generated, negligible/no cost) against the actual
// EDIT_SYSTEM_PROMPT from server/lib/generatePrompt-equivalent EDIT prompt.
//
// Usage: node server/eval/editPayloadSize.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { COMPONENT_TYPE_LIST } = require('../lib/generatePrompt');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set — aborting.');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Same EDIT_SYSTEM_PROMPT as server/index.js (kept in sync manually — see
// note at top of this file if that prompt changes).
const EDIT_SYSTEM_PROMPT = `You are an expert data engineering pipeline architect modifying an EXISTING diagram.

AVAILABLE COMPONENT TYPES (use exact string values only):
${COMPONENT_TYPE_LIST}

EDGE TYPES: batch, streaming, api, cdc, event, sql

MODIFICATION RULES:
- Return the COMPLETE updated diagram JSON — all nodes and edges, not just the changes
- Preserve existing node IDs for nodes that are unchanged or only have data edits
- Use new unique IDs (e.g. "n10", "n11") for newly added nodes
- When removing a node, also remove all edges connected to it
- When adding nodes, position them logically relative to existing nodes (x increments of 300 per stage, y spacing of 170)
- Maintain left-to-right flow: Sources → Ingestion → Processing → Storage → Serving
- Edge labels should be action verbs: "CDC events", "batch sync", "streaming insert", "SQL transform"

OUTPUT RULES:
- Return ONLY valid JSON. No markdown fences. No commentary. No trailing commas.`;

// Real sample diagram, taken verbatim from client/src/data/templates.js
// ("Modern Data Stack" — 9 nodes, 9 edges) so this isn't a cherry-picked toy.
const SLIM_NODES = [
  { id: 'mds-pg', type: 'component', position: { x: 60, y: 80 }, data: { componentType: 'postgresql', label: 'PostgreSQL', notes: 'Production OLTP database (orders, users, products)' } },
  { id: 'mds-my', type: 'component', position: { x: 60, y: 240 }, data: { componentType: 'mysql', label: 'MySQL', notes: 'Legacy CRM database' } },
  { id: 'mds-api', type: 'component', position: { x: 60, y: 400 }, data: { componentType: 'rest_api', label: 'Stripe API', notes: 'Payment events & transactions' } },
  { id: 'mds-ft', type: 'component', position: { x: 340, y: 240 }, data: { componentType: 'fivetran', label: 'Fivetran', notes: 'Managed ELT — handles schema drift, incremental sync' } },
  { id: 'mds-sf', type: 'component', position: { x: 620, y: 240 }, data: { componentType: 'snowflake', label: 'Snowflake', notes: 'Cloud DWH — raw + transformed layers' } },
  { id: 'mds-dbt', type: 'component', position: { x: 900, y: 160 }, data: { componentType: 'dbt', label: 'dbt Core', notes: 'SQL models: staging → intermediate → marts' } },
  { id: 'mds-af', type: 'component', position: { x: 900, y: 360 }, data: { componentType: 'airflow', label: 'Airflow', notes: 'Orchestrates dbt runs + Fivetran sync triggers' } },
  { id: 'mds-lk', type: 'component', position: { x: 1180, y: 120 }, data: { componentType: 'looker', label: 'Looker', notes: 'Semantic layer + business dashboards' } },
  { id: 'mds-tb', type: 'component', position: { x: 1180, y: 320 }, data: { componentType: 'tableau', label: 'Tableau', notes: 'Executive and operational reporting' } },
];
const SLIM_EDGES = [
  { id: 'mds-e1', source: 'mds-pg', target: 'mds-ft', type: 'labeled', data: { label: 'batch sync', edgeType: 'batch' } },
  { id: 'mds-e2', source: 'mds-my', target: 'mds-ft', type: 'labeled', data: { label: 'batch sync', edgeType: 'batch' } },
  { id: 'mds-e3', source: 'mds-api', target: 'mds-ft', type: 'labeled', data: { label: 'API pull', edgeType: 'api' } },
  { id: 'mds-e4', source: 'mds-ft', target: 'mds-sf', type: 'labeled', data: { label: 'ELT load', edgeType: 'batch' } },
  { id: 'mds-e5', source: 'mds-sf', target: 'mds-dbt', type: 'labeled', data: { label: 'SQL transform', edgeType: 'sql' } },
  { id: 'mds-e6', source: 'mds-af', target: 'mds-dbt', type: 'labeled', data: { label: 'triggers', edgeType: 'api' } },
  { id: 'mds-e7', source: 'mds-dbt', target: 'mds-sf', type: 'labeled', data: { label: 'writes marts', edgeType: 'sql' } },
  { id: 'mds-e8', source: 'mds-sf', target: 'mds-lk', type: 'labeled', data: { label: 'query', edgeType: 'sql' } },
  { id: 'mds-e9', source: 'mds-sf', target: 'mds-tb', type: 'labeled', data: { label: 'query', edgeType: 'sql' } },
];

// Documented ReactFlow v11 runtime fields a node/edge picks up after one
// render + one drag interaction — NOT captured from a live browser session.
function toFullNode(n) {
  return {
    ...n,
    width: 180,
    height: 68,
    selected: false,
    dragging: false,
    positionAbsolute: { ...n.position },
  };
}
function toFullEdge(e) {
  return {
    ...e,
    selected: false,
    markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: '#8A8275' },
  };
}

// Mirrors server/index.js's exact slimming map (lines ~510-515).
function toSlimNode(n) {
  return { id: n.id, type: n.type, position: n.position, data: { componentType: n.data.componentType, label: n.data.label, notes: n.data.notes } };
}
function toSlimEdge(e) {
  return { id: e.id, source: e.source, target: e.target, type: e.type, data: e.data };
}

function buildUserMessage(nodes, edges) {
  return `CURRENT DIAGRAM (modify this):
${JSON.stringify({ name: 'Modern Data Stack', nodes, edges }, null, 2)}

MODIFICATION REQUEST:
Add a monitoring layer that alerts on Fivetran sync failures.`;
}

async function main() {
  const fullNodes = SLIM_NODES.map(toFullNode);
  const fullEdges = SLIM_EDGES.map(toFullEdge);
  const slimNodes = SLIM_NODES.map(toSlimNode);
  const slimEdges = SLIM_EDGES.map(toSlimEdge);

  const fullMessage = buildUserMessage(fullNodes, fullEdges);
  const slimMessage = buildUserMessage(slimNodes, slimEdges);

  const fullDiagramJSON = JSON.stringify({ nodes: fullNodes, edges: fullEdges });
  const slimDiagramJSON = JSON.stringify({ nodes: slimNodes, edges: slimEdges });

  console.log('=== Payload byte size (diagram JSON only, minified) ===');
  console.log(`Full (raw ReactFlow shape): ${fullDiagramJSON.length} bytes`);
  console.log(`Slim (as actually sent):    ${slimDiagramJSON.length} bytes`);
  console.log(`Reduction: ${(100 * (1 - slimDiagramJSON.length / fullDiagramJSON.length)).toFixed(1)}%`);

  console.log('\nCounting tokens via live Anthropic API (messages.countTokens — no completion generated)...');
  const [fullCount, slimCount] = await Promise.all([
    anthropic.messages.countTokens({
      model: 'claude-sonnet-4-6',
      system: EDIT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: fullMessage }],
    }),
    anthropic.messages.countTokens({
      model: 'claude-sonnet-4-6',
      system: EDIT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: slimMessage }],
    }),
  ]);

  console.log('\n=== Total request input tokens (system + user message) ===');
  console.log(`Full: ${fullCount.input_tokens} tokens`);
  console.log(`Slim: ${slimCount.input_tokens} tokens`);
  console.log(`Reduction: ${(100 * (1 - slimCount.input_tokens / fullCount.input_tokens)).toFixed(1)}%`);
}

main().catch((err) => {
  console.error('Measurement failed:', err);
  process.exit(1);
});
