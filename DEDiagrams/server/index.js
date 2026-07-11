require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Liveblocks } = require('@liveblocks/node');
const db = require('./db.supabase');

// Single source of truth for valid component types.
// To add a component: update shared/component-types.json AND client/src/data/componentLibrary.js.
const { byCategory } = require('../shared/component-types.json');
const VALID_COMPONENT_TYPES = new Set(Object.values(byCategory).flat());
const MAX_PROMPT_LENGTH = 4000; // defense-in-depth cap — bounds token usage regardless of client-side limits
const COMPONENT_TYPE_LIST = Object.entries(byCategory)
  .map(([cat, types]) => `${cat.padEnd(16)}${types.join(', ')}`)
  .join('\n');

const app = express();
const PORT = process.env.PORT || 3001; // Render (and most PaaS hosts) assign the port via this env var
// Trailing slash stripped defensively — a CLIENT_URL/SERVER_URL entered with
// one (e.g. "https://dediagram.onrender.com/") would otherwise produce a
// double slash when a path is appended (e.g. the OAuth callbackURL below),
// which GitHub/Google reject as not matching the registered redirect_uri.
const stripTrailingSlash = (url) => url.replace(/\/+$/, '');
const CLIENT_URL = stripTrailingSlash(process.env.CLIENT_URL || 'http://localhost:3000');
const SERVER_URL = stripTrailingSlash(process.env.SERVER_URL || 'http://localhost:3001');

// Deployed behind a reverse proxy (Render/Railway/Fly/etc. all add one).
// Without this, req.ip resolves to the proxy's own IP for every request,
// collapsing the per-IP rate limiter below into one shared bucket for the
// whole site instead of one bucket per visitor. Override TRUST_PROXY if a
// CDN (e.g. Cloudflare) sits in front of the platform's own proxy, adding a
// second hop.
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Session + Passport ─────────────────────────────────────────────────────
// User identity lives in Supabase (db.supabase.js), not a local file — a
// local users.json doesn't survive a restart on hosts with an ephemeral
// filesystem (e.g. Render's free tier), which would otherwise silently
// create a fresh account for every returning user and orphan their diagrams.

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-before-deploying',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Maps a Supabase users row to the shape the rest of the app expects
// (req.user.name/.avatar/.username).
function toAppUser(row) {
  return {
    id: row.id,
    name: row.display_name || 'Unknown',
    username: row.email ? row.email.split('@')[0] : row.id,
    avatar: row.avatar_url || null,
  };
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const row = await db.getUserById(id);
    done(null, row ? toAppUser(row) : false);
  } catch (err) {
    done(err);
  }
});

// Finds a user by OAuth id; if not found, tries a fallback match by email
// and backfills the OAuth id onto that row (handles an existing user's first
// login after this migration, linking to their old account/diagrams instead
// of creating a duplicate); otherwise creates a fresh row.
async function findOrCreateOAuthUser({ oauthField, oauthId, email, displayName, avatarUrl }) {
  let row = await db.findUserByOAuthId(oauthField, oauthId);
  if (!row && email) {
    const byEmail = await db.findUserByOAuthId('email', email);
    if (byEmail) row = await db.linkOAuthId(byEmail.id, oauthField, oauthId);
  }
  if (!row) {
    row = await db.createUser({
      id: uuidv4(), email, displayName, avatarUrl,
      [oauthField === 'github_id' ? 'githubId' : 'googleId']: oauthId,
    });
  }
  return row;
}

if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/auth/github/callback`,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const row = await findOrCreateOAuthUser({
        oauthField: 'github_id', oauthId: String(profile.id),
        email: profile.emails?.[0]?.value, displayName: profile.displayName || profile.username,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
      done(null, toAppUser(row));
    } catch (err) {
      console.error('GitHub auth error:', err.message);
      done(err);
    }
  }));
} else {
  console.warn('⚠️  GITHUB_CLIENT_ID not set — GitHub OAuth will not work');
}

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/auth/google/callback`,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const row = await findOrCreateOAuthUser({
        oauthField: 'google_id', oauthId: String(profile.id),
        email: profile.emails?.[0]?.value, displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
      done(null, toAppUser(row));
    } catch (err) {
      console.error('Google auth error:', err.message);
      done(err);
    }
  }));
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID not set — Google OAuth will not work');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  console.warn('⚠️  LIVEBLOCKS_SECRET_KEY is not set — live collaboration will fail');
}

const aiRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily generation limit reached. Try again tomorrow.' },
});

// Global circuit breaker across ALL users combined — a backstop against
// runaway spend independent of the per-IP limiter above (which only caps one
// visitor at a time, not total site-wide cost). Resets on a rolling 24h
// window from the last reset, not calendar midnight; precision doesn't
// matter here, only having some ceiling does. In-memory by design: a server
// restart resetting the count early is an acceptable, harmless edge case.
const DAILY_AI_CALL_LIMIT = Number(process.env.DAILY_AI_CALL_LIMIT) || 200;
let dailyAiCallCount = 0;
let dailyAiResetAt = Date.now() + 24 * 60 * 60 * 1000;

const aiDailyCap = (req, res, next) => {
  const now = Date.now();
  if (now >= dailyAiResetAt) {
    dailyAiCallCount = 0;
    dailyAiResetAt = now + 24 * 60 * 60 * 1000;
  }
  if (dailyAiCallCount >= DAILY_AI_CALL_LIMIT) {
    return res.status(429).json({ error: 'AI generation has reached today\'s site-wide usage cap. Please try again tomorrow.' });
  }
  dailyAiCallCount++;
  next();
};

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY is not set — AI generation will fail');
}

// Pulls the first complete {...} block out of a string, ignoring any
// preamble text, markdown fences, or trailing commentary from the model.
function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

const ensureAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Sign in required' });
  next();
};

// ─── Diagrams CRUD ─────────────────────────────────────────────────────────

app.get('/api/diagrams', ensureAuthenticated, async (req, res) => {
  try {
    const diagrams = await db.listDiagrams(req.user.id);
    res.json(diagrams);
  } catch (err) {
    console.error('List diagrams error:', err.message);
    res.status(500).json({ error: 'Failed to list diagrams' });
  }
});

app.get('/api/diagrams/:id', ensureAuthenticated, async (req, res) => {
  try {
    const d = await db.getDiagram(req.params.id, req.user.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (err) {
    console.error('Get diagram error:', err.message);
    res.status(500).json({ error: 'Failed to load diagram' });
  }
});

app.post('/api/diagrams', ensureAuthenticated, async (req, res) => {
  const { name, description, nodes, edges, docCells, isTemplate } = req.body;
  if (!name || !nodes) return res.status(400).json({ error: 'name and nodes required' });
  try {
    const d = await db.createDiagram({ name, description, nodes, edges, docCells, isTemplate, ownerId: req.user.id });
    res.status(201).json(d);
  } catch (err) {
    console.error('Create diagram error:', err.message);
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

app.put('/api/diagrams/:id', ensureAuthenticated, async (req, res) => {
  try {
    const d = await db.updateDiagram(req.params.id, req.body, req.user.id);
    if (!d) return res.status(404).json({ error: 'Not found, or you do not have edit access' });
    res.json(d);
  } catch (err) {
    console.error('Update diagram error:', err.message);
    res.status(500).json({ error: 'Failed to update diagram' });
  }
});

app.delete('/api/diagrams/:id', ensureAuthenticated, async (req, res) => {
  try {
    const ok = await db.deleteDiagram(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Not found, or you are not the owner' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete diagram error:', err.message);
    res.status(500).json({ error: 'Failed to delete diagram' });
  }
});

// ─── Sharing / Members ──────────────────────────────────────────────────────

app.get('/api/users/search', ensureAuthenticated, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const users = await db.searchUsers(q, req.user.id);
    res.json(users);
  } catch (err) {
    console.error('User search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/diagrams/:id/members', ensureAuthenticated, async (req, res) => {
  try {
    const perm = await db.getUserPermission(req.params.id, req.user.id);
    if (!perm) return res.status(404).json({ error: 'Not found' });
    const members = await db.getDiagramMembers(req.params.id);
    res.json(members);
  } catch (err) {
    console.error('List members error:', err.message);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

app.post('/api/diagrams/:id/members', ensureAuthenticated, async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'userId and a role of editor or viewer are required' });
  }
  try {
    const perm = await db.getUserPermission(req.params.id, req.user.id);
    if (!perm || perm.role !== 'owner') return res.status(403).json({ error: 'Only the owner can add members' });
    const member = await db.setPermission({ diagramId: req.params.id, userId, role, invitedBy: req.user.id });
    res.status(201).json(member);
  } catch (err) {
    console.error('Add member error:', err.message);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.delete('/api/diagrams/:id/members/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const perm = await db.getUserPermission(req.params.id, req.user.id);
    if (!perm || perm.role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove members' });
    const ok = await db.removePermission(req.params.id, req.params.userId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err.message);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─── Liveblocks (live co-editing) ───────────────────────────────────────────

app.post('/api/liveblocks-auth', ensureAuthenticated, async (req, res) => {
  const { room } = req.body;
  if (!room) return res.status(400).json({ error: 'room is required' });
  try {
    const perm = await db.getUserPermission(room, req.user.id);
    if (!perm) return res.status(403).json({ error: 'You do not have access to this diagram' });

    const session = liveblocks.prepareSession(req.user.id, {
      userInfo: { name: req.user.name, avatar: req.user.avatar },
    });
    if (perm.role === 'viewer') {
      session.allow(room, ['room:read', 'room:presence:write']);
    } else {
      session.allow(room, ['room:write']);
    }
    const { body, status } = await session.authorize();
    res.status(status).send(body);
  } catch (err) {
    console.error('Liveblocks auth error:', err.message);
    res.status(500).json({ error: 'Failed to authorize collaboration session' });
  }
});

// ─── AI Generate ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert data engineering pipeline architect. Given a description of a data application, generate a precise pipeline diagram JSON.

STEP 0 — CHECK FOR THE SKIP_CLARIFICATION OVERRIDE, BEFORE ANYTHING ELSE:
If the user's message begins with the literal token "SKIP_CLARIFICATION", this overrides every other instruction below about asking questions. In that case you are FORBIDDEN from returning a needsClarification response, no matter how vague, short, or buzzword-laden the rest of the message is. You MUST instead go straight to building the full pipeline JSON, inventing a plausible subject and purpose yourself if the message truly gives you nothing (e.g. treat a bare "pipeline" as a generic batch ETL pipeline for business records into a warehouse). Note any such invented assumptions briefly in the "description" field. Do not skip this step or apply the buildability check below when this token is present.

If that token is NOT present, apply this buildability check before doing anything else:
A prompt is buildable only if you can point to a real, identifiable subject (an actual data source, event type, or business object — e.g. "order events", "sensor readings", "app logs") AND a stated purpose for it (what happens to the data / why it's being built — e.g. dashboards, ML training, replication, alerting).

A prompt is NOT buildable if it lacks either of those, even if it contains technical-sounding words. A list of buzzwords/technology terms with no stated subject ("ML real-time sync monitor analytics") is NOT buildable — it never says what is being monitored or synced. A single vague word ("pipeline", "something for data") is NOT buildable. Do not guess a subject or purpose out of thin air just because a prompt sounds technical.

If NOT buildable, respond with ONLY this JSON shape (nothing else):
{
  "needsClarification": true,
  "questions": [
    { "question": "Plain-language question about the missing piece (subject/domain and/or purpose). Never ask about specific tools or technologies.",
      "options": ["Plain-language option", "Another option", "...", "Not sure"] }
  ]
}
Ask 1-3 questions, only for what's actually missing (don't ask about purpose if it was already stated). Every question's options must be understandable to someone with zero data-engineering background — describe outcomes and data types in plain terms, never name specific tools (no "Kafka", "dbt", etc.). Always include "Not sure" as the last option.

If buildable (or if the SKIP_CLARIFICATION token was present per STEP 0), proceed to build the full pipeline diagram as described below.

AVAILABLE COMPONENT TYPES (use exact string values only):
${COMPONENT_TYPE_LIST}

EDGE TYPES: batch, streaming, api, cdc, event, sql

ARCHITECTURE RULES:
- Flow left-to-right: Sources → Ingestion → Processing → Storage → Serving
- Start positions at x=60. Increment x by 300 per stage.
- Multiple nodes in same stage: space y by 170. Center vertically around y=220.
- Always include orchestration (airflow/prefect/dagster) for any scheduled batch jobs
- For real-time: use kafka + flink/spark-streaming
- For batch ELT: use fivetran/airbyte → warehouse → dbt
- For CDC: use debezium → kafka → flink → warehouse
- For Lakehouse: land in s3/adls, Bronze→Silver→Gold via delta_lake
- If user mentions AWS: prefer kinesis, s3, redshift, aws_glue
- If user mentions GCP: prefer bigquery
- If user mentions Azure: prefer adls, azure_synapse
- For AI/ML enrichment pipelines: use anthropic or openai between processing and serving stages
- For containerized deployments: use docker to wrap processing or serving components
- Use descriptive notes explaining each component's specific role in THIS pipeline
- Edge labels should be action verbs: "CDC events", "batch sync", "streaming insert", "SQL transform", "LLM inference", "embed + store"

OUTPUT RULES:
- Return ONLY valid JSON. No markdown fences. No commentary. No trailing commas.
- IDs must be unique strings (e.g. "n1", "n2", "e1", "e2")

JSON FORMAT:
{
  "name": "Pipeline Name (max 40 chars)",
  "description": "One sentence describing the full architecture",
  "nodes": [
    {
      "id": "n1",
      "type": "component",
      "position": {"x": 60, "y": 220},
      "data": {
        "componentType": "postgresql",
        "label": "Orders Database",
        "notes": "Production OLTP — source of truth for order lifecycle events"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n1",
      "target": "n2",
      "type": "labeled",
      "data": {"label": "CDC events", "edgeType": "cdc"}
    }
  ]
}`;

app.post('/api/generate', aiRateLimit, aiDailyCap, async (req, res) => {
  const { prompt, skipClarification } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
  if (prompt.length > MAX_PROMPT_LENGTH) return res.status(400).json({ error: `prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });

  const userMessage = skipClarification ? `SKIP_CLARIFICATION\n${prompt}` : prompt;

  // SSE setup — flush headers immediately so the client sees the stream start
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  if (res.socket) res.socket.setNoDelay(true);
  res.flushHeaders();

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    let fullText = '';

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    stream.on('text', (text) => {
      fullText += text;
      send('delta', { text });
    });

    await stream.finalMessage();

    const jsonText = extractJSON(fullText);
    let pipeline;
    try {
      pipeline = JSON.parse(jsonText);
    } catch {
      console.error('Generate — bad model output:', fullText.slice(0, 500));
      send('error', { message: 'Model returned invalid JSON. Try rephrasing your prompt.' });
      return res.end();
    }

    if (pipeline.needsClarification) {
      const questions = Array.isArray(pipeline.questions) ? pipeline.questions.filter(q => q?.question && Array.isArray(q.options) && q.options.length) : [];
      if (questions.length === 0) {
        console.error('Generate — needsClarification with no valid questions:', fullText.slice(0, 500));
        send('error', { message: 'Model returned invalid JSON. Try rephrasing your prompt.' });
        return res.end();
      }
      send('clarify', { questions });
      return res.end();
    }

    if (Array.isArray(pipeline.nodes)) {
      pipeline.nodes = pipeline.nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          componentType: VALID_COMPONENT_TYPES.has(n.data?.componentType)
            ? n.data.componentType
            : 'rest_api',
        },
      }));
    }
    if (Array.isArray(pipeline.edges)) {
      pipeline.edges = pipeline.edges.map(e => ({ ...e, type: 'labeled' }));
    }

    send('done', { pipeline });
    res.end();
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    const detail = err.error?.error?.message || err.message || 'Generation failed';
    console.error(`Generate error [${status}]:`, detail);
    let message = detail;
    if (status === 401) message = 'Server API key is misconfigured — contact the site admin';
    if (status === 404) message = 'Model not found — the configured model may have been deprecated';
    if (status === 429) message = 'Rate limited by Anthropic — wait a moment and try again';
    send('error', { message });
    res.end();
  }
});

// ─── AI Edit ────────────────────────────────────────────────────────────────

const EDIT_SYSTEM_PROMPT = `You are an expert data engineering pipeline architect modifying an EXISTING diagram.

STEP 0 — CHECK FOR THE SKIP_CLARIFICATION OVERRIDE, BEFORE ANYTHING ELSE:
If the user's message begins with the literal token "SKIP_CLARIFICATION", this overrides every other instruction below about asking questions. You are FORBIDDEN from returning a needsClarification response in that case, no matter how vague the modification request is. Instead pick the most plausible concrete edit yourself (e.g. treat "make it better" as "add an orchestration/monitoring layer and tighten up notes"), apply it, and briefly note what you assumed in the "description" field.

If that token is NOT present, apply this actionability check before doing anything else:
A modification request is actionable only if you can tell (a) which part of the CURRENT DIAGRAM it targets (a specific component, stage, or the connections between two named components — not just "it"/"the pipeline" with nothing else) AND (b) what concrete change is wanted (add/remove/replace a specific kind of component, or a specific dimension to improve — speed, cost, reliability, data quality, observability). Vague requests like "make it better", "improve this", "optimize it", "clean it up" with no further detail are NOT actionable.

If NOT actionable, respond with ONLY this JSON shape (nothing else):
{
  "needsClarification": true,
  "questions": [
    { "question": "Plain-language question. Reference the ACTUAL components in the CURRENT DIAGRAM above by their labels (e.g. \\"Do you want to change how data gets into the Orders Database, or what happens after it leaves it?\\") so the user is picking real parts of their own diagram, not abstract categories.",
      "options": ["Plain-language option grounded in a real component/stage from the diagram", "Another such option", "...", "Not sure"] }
  ]
}
Ask 1-2 questions, only for what's actually missing. Options must be understandable with zero data-engineering background — describe outcomes in plain terms, never name specific tools/technologies not already present in the diagram. Always include "Not sure" as the last option.

If actionable (or if the SKIP_CLARIFICATION token was present per STEP 0), proceed to modify the diagram as described below.

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
- Return ONLY valid JSON. No markdown fences. No commentary. No trailing commas.

JSON FORMAT:
{
  "name": "Pipeline Name (max 40 chars)",
  "description": "One sentence describing the full architecture",
  "nodes": [
    {
      "id": "n1",
      "type": "component",
      "position": {"x": 60, "y": 220},
      "data": {
        "componentType": "postgresql",
        "label": "Orders Database",
        "notes": "Production OLTP — source of truth for order lifecycle events"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n1",
      "target": "n2",
      "type": "labeled",
      "data": {"label": "CDC events", "edgeType": "cdc"}
    }
  ]
}`;

app.post('/api/edit', aiRateLimit, aiDailyCap, async (req, res) => {
  const { prompt, currentDiagram, skipClarification } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
  if (prompt.length > MAX_PROMPT_LENGTH) return res.status(400).json({ error: `prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
  if (!currentDiagram?.nodes?.length) return res.status(400).json({ error: 'currentDiagram with nodes is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.socket) res.socket.setNoDelay(true);
  res.flushHeaders();

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // Trim node data to essentials to keep token count low
    const slimNodes = currentDiagram.nodes.map(({ id, type, position, data }) => ({
      id, type, position, data: { componentType: data.componentType, label: data.label, notes: data.notes },
    }));
    const slimEdges = currentDiagram.edges.map(({ id, source, target, type, data }) => ({
      id, source, target, type, data,
    }));

    const userMessage = `${skipClarification ? 'SKIP_CLARIFICATION\n' : ''}CURRENT DIAGRAM (modify this):
${JSON.stringify({ name: currentDiagram.name, nodes: slimNodes, edges: slimEdges }, null, 2)}

MODIFICATION REQUEST:
${prompt.trim()}`;

    let fullText = '';

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: EDIT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    stream.on('text', (text) => {
      fullText += text;
      send('delta', { text });
    });

    await stream.finalMessage();

    const jsonText = extractJSON(fullText);
    let pipeline;
    try {
      pipeline = JSON.parse(jsonText);
    } catch {
      console.error('Edit — bad model output:', fullText.slice(0, 500));
      send('error', { message: 'Model returned invalid JSON. Try rephrasing your edit instruction.' });
      return res.end();
    }

    if (pipeline.needsClarification) {
      const questions = Array.isArray(pipeline.questions) ? pipeline.questions.filter(q => q?.question && Array.isArray(q.options) && q.options.length) : [];
      if (questions.length === 0) {
        console.error('Edit — needsClarification with no valid questions:', fullText.slice(0, 500));
        send('error', { message: 'Model returned invalid JSON. Try rephrasing your edit instruction.' });
        return res.end();
      }
      send('clarify', { questions });
      return res.end();
    }

    if (Array.isArray(pipeline.nodes)) {
      pipeline.nodes = pipeline.nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          componentType: VALID_COMPONENT_TYPES.has(n.data?.componentType)
            ? n.data.componentType
            : 'rest_api',
        },
      }));
    }
    if (Array.isArray(pipeline.edges)) {
      pipeline.edges = pipeline.edges.map(e => ({ ...e, type: 'labeled' }));
    }

    send('done', { pipeline });
    res.end();
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    const detail = err.error?.error?.message || err.message || 'Edit failed';
    console.error(`Edit error [${status}]:`, detail);
    let message = detail;
    if (status === 401) message = 'Server API key is misconfigured — contact the site admin';
    if (status === 429) message = 'Rate limited by Anthropic — wait a moment and try again';
    send('error', { message });
    res.end();
  }
});

// ─── Auth Routes ────────────────────────────────────────────────────────────

app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: `${CLIENT_URL}/?error=auth_failed` }),
  (req, res) => res.redirect(`${CLIENT_URL}/projects`)
);

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?error=auth_failed` }),
  (req, res) => res.redirect(`${CLIENT_URL}/projects`)
);

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  const { id, name, username, avatar } = req.user;
  res.json({ user: { id, name, username, avatar } });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// ─── Serve the built client in production ──────────────────────────────────
// In dev, Vite's own dev server handles the client on a separate port; this
// only matters for a single-service deploy (one Node process serves both the
// API and the built SPA — see render.yaml).
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ────────────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`DE Diagrams server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`    Another process (possibly Vite) is occupying this port.`);
    console.error(`    Fix: kill the process on port ${PORT}, then restart.\n`);
    process.exit(1);
  }
  throw err;
});
