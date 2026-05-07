const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DIAGRAMS_FILE = path.join(DATA_DIR, 'diagrams.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DIAGRAMS_FILE)) fs.writeFileSync(DIAGRAMS_FILE, JSON.stringify([]));

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

const VALID_COMPONENT_TYPES = new Set([
  'postgresql','mysql','mongodb','rest_api','files_s3',
  'debezium','fivetran','airbyte','kinesis',
  'kafka','rabbitmq',
  'spark','flink','dbt','databricks','aws_glue',
  'airflow','prefect','dagster',
  's3','adls','delta_lake','iceberg','hdfs',
  'snowflake','bigquery','redshift','azure_synapse',
  'tableau','looker','power_bi','superset','redis',
  'docker','anthropic','openai',
]);

const SYSTEM_PROMPT = `You are an expert data engineering pipeline architect. Given a description of a data application, generate a precise pipeline diagram JSON.

AVAILABLE COMPONENT TYPES (use exact string values only):
Sources:        postgresql, mysql, mongodb, rest_api, files_s3
Ingestion/CDC:  debezium, fivetran, airbyte, kinesis
Streaming:      kafka, rabbitmq
Processing:     spark, flink, dbt, databricks, aws_glue
Orchestration:  airflow, prefect, dagster
Storage/Lakes:  s3, adls, delta_lake, iceberg, hdfs
Warehouses:     snowflake, bigquery, redshift, azure_synapse
Serving/BI:     tableau, looker, power_bi, superset, redis
Infrastructure: docker
AI/LLM:         anthropic, openai

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

// Quick key + model probe — call this to see exactly what error Anthropic returns
app.post('/api/test-key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey?.trim()) return res.status(400).json({ error: 'apiKey required' });
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'hi' }],
    });
    res.json({ ok: true, model: msg.model, usage: msg.usage });
  } catch (err) {
    res.status(err.status || 500).json({
      ok: false,
      status: err.status,
      error: err.error?.error?.message || err.message,
    });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt, apiKey } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
  if (!apiKey?.trim()) return res.status(400).json({ error: 'Anthropic API key is required' });

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
    const client = new Anthropic({ apiKey });
    let fullText = '';

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    stream.on('text', (text) => {
      fullText += text;
      send('delta', { text });
    });

    await stream.finalMessage();

    const jsonText = fullText.trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    let pipeline;
    try {
      pipeline = JSON.parse(jsonText);
    } catch {
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
    if (status === 401) message = 'Invalid API key — check your Anthropic key at console.anthropic.com';
    if (status === 404) message = 'Model not found — the configured model may have been deprecated';
    if (status === 429) message = 'Rate limited — wait a moment and try again';
    send('error', { message });
    res.end();
  }
});

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
