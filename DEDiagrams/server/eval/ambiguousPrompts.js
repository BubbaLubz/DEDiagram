#!/usr/bin/env node
// Eval harness for /api/generate's handling of ambiguous/underspecified prompts.
// Calls the Anthropic API directly with the exact production SYSTEM_PROMPT
// (server/lib/generatePrompt.js) — no Express server needs to be running.
//
// Measures two things per curated ambiguous prompt:
//   1. detects-ambiguity: without SKIP_CLARIFICATION, does the model correctly
//      ask clarifying questions instead of silently guessing?
//   2. sensible-default: with SKIP_CLARIFICATION (the path taken when a user
//      proceeds anyway), does the model still produce a valid, coherent
//      pipeline using only real component types?
//
// Usage: node server/eval/ambiguousPrompts.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { byCategory } = require('../../shared/component-types.json');
const { SYSTEM_PROMPT, extractJSON } = require('../lib/generatePrompt');

const VALID_COMPONENT_TYPES = new Set(Object.values(byCategory).flat());

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set — aborting.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Each prompt is missing a real subject, a stated purpose, or both — per the
// buildability check defined in SYSTEM_PROMPT.
const AMBIGUOUS_PROMPTS = [
  'pipeline',
  'something for data',
  'build me a system',
  'data thing',
  'ML real-time sync monitor analytics',
  'I need something for dashboards',
  'I have orders data',
  'set up some infrastructure',
  'analytics platform',
  'make it scalable and fast',
  'kafka spark s3',
  'a modern data stack',
  'help me process events',
  'I want to use AI',
  'streaming architecture',
  'data warehouse',
  'automate my reports',
  'something with dbt and airflow',
  'a system for my startup',
  'real-time monitoring',
];

async function callGenerate(prompt, { skipClarification }) {
  const userMessage = skipClarification ? `SKIP_CLARIFICATION\n${prompt}` : prompt;
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });
  const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const jsonText = extractJSON(text);
  if (!jsonText) return { error: 'no-json', raw: text.slice(0, 300) };
  try {
    return { pipeline: JSON.parse(jsonText) };
  } catch {
    return { error: 'bad-json', raw: text.slice(0, 300) };
  }
}

// A "sensible default" means: valid JSON, actually built (not still asking
// questions despite the override), a non-trivial graph, every component type
// recognized, and every edge references nodes that exist.
function scoreSensibleDefault(result) {
  if (result.error) return { pass: false, reason: result.error };
  const p = result.pipeline;
  if (p.needsClarification) return { pass: false, reason: 'still asked for clarification despite SKIP_CLARIFICATION' };
  if (!p.name || !p.description) return { pass: false, reason: 'missing name/description' };
  if (!Array.isArray(p.nodes) || p.nodes.length < 2) return { pass: false, reason: 'fewer than 2 nodes' };
  if (!Array.isArray(p.edges) || p.edges.length < 1) return { pass: false, reason: 'no edges' };
  const badType = p.nodes.find((n) => !VALID_COMPONENT_TYPES.has(n.data?.componentType));
  if (badType) return { pass: false, reason: `invalid componentType: ${badType.data?.componentType}` };
  const nodeIds = new Set(p.nodes.map((n) => n.id));
  const badEdge = p.edges.find((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  if (badEdge) return { pass: false, reason: `edge references missing node: ${badEdge.id}` };
  return { pass: true };
}

// Correct behavior without the override: recognize the prompt as ambiguous
// and ask, rather than silently guessing.
function scoreDetectsAmbiguity(result) {
  if (result.error) return { pass: false, reason: result.error };
  const p = result.pipeline;
  if (p.needsClarification === true && Array.isArray(p.questions) && p.questions.length > 0) return { pass: true };
  return { pass: false, reason: 'built a pipeline instead of asking for clarification' };
}

async function main() {
  const results = { defaulting: [], detection: [] };

  console.log(`Running ${AMBIGUOUS_PROMPTS.length} ambiguous prompts x 2 modes (${AMBIGUOUS_PROMPTS.length * 2} API calls)...\n`);

  for (const prompt of AMBIGUOUS_PROMPTS) {
    const [skipResult, noSkipResult] = await Promise.all([
      callGenerate(prompt, { skipClarification: true }),
      callGenerate(prompt, { skipClarification: false }),
    ]);
    const defaultScore = scoreSensibleDefault(skipResult);
    const detectScore = scoreDetectsAmbiguity(noSkipResult);
    results.defaulting.push({ prompt, ...defaultScore });
    results.detection.push({ prompt, ...detectScore });
    console.log(`- "${prompt}"`);
    console.log(`    default-build:     ${defaultScore.pass ? 'PASS' : `FAIL (${defaultScore.reason})`}`);
    console.log(`    detects-ambiguity: ${detectScore.pass ? 'PASS' : `FAIL (${detectScore.reason})`}`);
  }

  const pct = (arr) => ((100 * arr.filter((r) => r.pass).length) / arr.length).toFixed(1);

  console.log('\n=== SUMMARY ===');
  console.log(
    `Sensible-default rate (SKIP_CLARIFICATION path): ${pct(results.defaulting)}% (${results.defaulting.filter((r) => r.pass).length}/${results.defaulting.length})`
  );
  console.log(
    `Ambiguity-detection rate (no skip):              ${pct(results.detection)}% (${results.detection.filter((r) => r.pass).length}/${results.detection.length})`
  );

  const failures = [...results.defaulting, ...results.detection].filter((r) => !r.pass);
  if (failures.length) {
    console.log('\n=== FAILURES ===');
    for (const f of failures) console.log(`- "${f.prompt}": ${f.reason}`);
  }
}

main().catch((err) => {
  console.error('Eval run failed:', err);
  process.exit(1);
});
