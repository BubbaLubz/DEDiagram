require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Single source of truth for valid component types.
// To add a component: update shared/component-types.json AND client/src/data/componentLibrary.js.
const { byCategory } = require('../shared/component-types.json');
const VALID_COMPONENT_TYPES = new Set(Object.values(byCategory).flat());
const COMPONENT_TYPE_LIST = Object.entries(byCategory)
  .map(([cat, types]) => `${cat.padEnd(16)}${types.join(', ')}`)
  .join('\n');

const app = express();
const PORT = 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const DATA_DIR = path.join(__dirname, 'data');
const DIAGRAMS_FILE = path.join(DATA_DIR, 'diagrams.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Users (flat JSON, swap for a real DB later) ────────────────────────────

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
const readUsers = () => { try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; } };
const writeUsers = (u) => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));

// ─── Session + Passport ─────────────────────────────────────────────────────

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

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = readUsers().find(u => u.id === id);
  done(null, user || false);
});

if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:3001'}/auth/github/callback`,
  }, (_accessToken, _refreshToken, profile, done) => {
    const users = readUsers();
    let user = users.find(u => u.githubId === profile.id);
    if (!user) {
      user = {
        id: uuidv4(),
        githubId: profile.id,
        name: profile.displayName || profile.username,
        username: profile.username,
        avatar: profile.photos?.[0]?.value || null,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      writeUsers(users);
    }
    return done(null, user);
  }));
} else {
  console.warn('⚠️  GITHUB_CLIENT_ID not set — GitHub OAuth will not work');
}

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:3001'}/auth/google/callback`,
  }, (_accessToken, _refreshToken, profile, done) => {
    const users = readUsers();
    let user = users.find(u => u.googleId === profile.id);
    if (!user) {
      user = {
        id: uuidv4(),
        googleId: profile.id,
        name: profile.displayName,
        username: profile.emails?.[0]?.value?.split('@')[0] || profile.id,
        avatar: profile.photos?.[0]?.value || null,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      writeUsers(users);
    }
    return done(null, user);
  }));
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID not set — Google OAuth will not work');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const aiRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily generation limit reached. Try again tomorrow.' },
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY is not set — AI generation will fail');
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DIAGRAMS_FILE)) fs.writeFileSync(DIAGRAMS_FILE, JSON.stringify([]));

// Pulls the first complete {...} block out of a string, ignoring any
// preamble text, markdown fences, or trailing commentary from the model.
function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

const readDiagrams = () => {
  try { return JSON.parse(fs.readFileSync(DIAGRAMS_FILE, 'utf8')); }
  catch { return []; }
};
const writeDiagrams = (d) => fs.writeFileSync(DIAGRAMS_FILE, JSON.stringify(d, null, 2));

// ─── Diagrams CRUD ─────────────────────────────────────────────────────────

app.get('/api/diagrams', (req, res) => {
  const diagrams = readDiagrams();
  res.json(diagrams.map(({ id, name, description, isTemplate, updatedAt, createdAt }) => ({
    id, name, description, isTemplate, updatedAt, createdAt,
  })));
});

app.get('/api/diagrams/:id', (req, res) => {
  const d = readDiagrams().find(d => d.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});

app.post('/api/diagrams', (req, res) => {
  const { name, description, nodes, edges, isTemplate } = req.body;
  if (!name || !nodes) return res.status(400).json({ error: 'name and nodes required' });
  const diagrams = readDiagrams();
  const d = { id: uuidv4(), name, description: description || '', nodes, edges: edges || [],
    isTemplate: isTemplate || false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  diagrams.push(d);
  writeDiagrams(diagrams);
  res.status(201).json(d);
});

app.put('/api/diagrams/:id', (req, res) => {
  const diagrams = readDiagrams();
  const idx = diagrams.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  diagrams[idx] = { ...diagrams[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeDiagrams(diagrams);
  res.json(diagrams[idx]);
});

app.delete('/api/diagrams/:id', (req, res) => {
  const diagrams = readDiagrams();
  const filtered = diagrams.filter(d => d.id !== req.params.id);
  if (filtered.length === diagrams.length) return res.status(404).json({ error: 'Not found' });
  writeDiagrams(filtered);
  res.json({ success: true });
});

// ─── AI Generate ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert data engineering pipeline architect. Given a description of a data application, generate a precise pipeline diagram JSON.

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

app.post('/api/generate', aiRateLimit, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });

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
      messages: [{ role: 'user', content: prompt }],
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

app.post('/api/edit', aiRateLimit, async (req, res) => {
  const { prompt, currentDiagram } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
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

    const userMessage = `CURRENT DIAGRAM (modify this):
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
  (req, res) => res.redirect(`${CLIENT_URL}/app`)
);

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?error=auth_failed` }),
  (req, res) => res.redirect(`${CLIENT_URL}/app`)
);

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  const { id, name, username, avatar } = req.user;
  res.json({ user: { id, name, username, avatar } });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

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
