// Rough monthly cloud cost estimates per component type.
// Based on public list pricing as of 2024. Real costs vary by region, negotiated rates,
// reserved instances, data egress, and tier. Use as ballpark only.

// params: { monthlyIngestGB, eventsPerSec, storageGB, biUsers, computeHrsPerDay }

export const COST_MODELS = {
  // ─── Sources (managed hosting estimates) ────────────────────────────────
  postgresql: ({ storageGB, computeHrsPerDay }) => {
    const computeCost = Math.max(1, computeHrsPerDay / 24) * 100; // RDS r6g.large baseline
    const storageCost = storageGB * 0.115;
    return {
      monthly: computeCost + storageCost,
      service: 'AWS RDS PostgreSQL',
      breakdown: [
        { label: 'Compute (r6g.large)', amount: computeCost },
        { label: `Storage (${storageGB} GB × $0.115)`, amount: storageCost },
      ],
      confidence: 'medium',
      note: 'RDS r6g.large on-demand. Reserved 1yr saves ~40%.',
    };
  },

  mysql: ({ storageGB, computeHrsPerDay }) => {
    const computeCost = Math.max(1, computeHrsPerDay / 24) * 110;
    const storageCost = storageGB * 0.115;
    return {
      monthly: computeCost + storageCost,
      service: 'AWS RDS MySQL',
      breakdown: [
        { label: 'Compute (db.r6g.large)', amount: computeCost },
        { label: `Storage (${storageGB} GB)`, amount: storageCost },
      ],
      confidence: 'medium',
      note: 'Multi-AZ would double compute cost.',
    };
  },

  mongodb: ({ storageGB }) => {
    const base = 57; // Atlas M10
    const storage = storageGB * 0.25;
    return {
      monthly: base + storage,
      service: 'MongoDB Atlas M10',
      breakdown: [
        { label: 'Cluster (M10 shared)', amount: base },
        { label: `Storage (${storageGB} GB)`, amount: storage },
      ],
      confidence: 'medium',
      note: 'M10 suitable up to ~50GB. M30 for production workloads.',
    };
  },

  rest_api: ({ monthlyIngestGB }) => {
    const callsCost = Math.max(1, monthlyIngestGB * 1000) / 1000000 * 3.5; // API GW per million calls
    const total = Math.max(20, callsCost);
    return {
      monthly: total,
      service: 'AWS API Gateway + Lambda',
      breakdown: [
        { label: 'API Gateway calls', amount: callsCost },
        { label: 'Lambda / infra', amount: 20 },
      ],
      confidence: 'low',
      note: 'Highly variable. Depends on call volume and caching.',
    };
  },

  files_s3: ({ storageGB, monthlyIngestGB }) => {
    const storage = storageGB * 0.023;
    const requests = (monthlyIngestGB * 1000) * 0.000005; // PUT requests
    return {
      monthly: storage + requests,
      service: 'AWS S3 Standard',
      breakdown: [
        { label: `Storage (${storageGB} GB × $0.023)`, amount: storage },
        { label: 'PUT/GET requests', amount: requests },
      ],
      confidence: 'high',
      note: 'Enable Intelligent-Tiering for cold data savings.',
    };
  },

  // ─── Ingestion ────────────────────────────────────────────────────────────
  debezium: () => ({
    monthly: 120,
    service: 'Debezium (self-hosted on EC2)',
    breakdown: [
      { label: 'EC2 t3.medium (Kafka Connect)', amount: 30 },
      { label: 'EC2 t3.medium × 2 redundancy', amount: 60 },
      { label: 'Ops/monitoring overhead', amount: 30 },
    ],
    confidence: 'low',
    note: 'Confluent Cloud managed Debezium starts at $0/GB + connector fee.',
  }),

  fivetran: ({ monthlyIngestGB }) => {
    const estimatedMARs = monthlyIngestGB * 8000; // ~8k rows per GB average
    const marCost = Math.max(0, estimatedMARs - 500000) * 0.001;
    const base = 100; // platform fee estimate
    return {
      monthly: base + marCost,
      service: 'Fivetran Starter/Standard',
      breakdown: [
        { label: 'Platform base fee', amount: base },
        { label: `MAR overage (~${(estimatedMARs / 1e6).toFixed(1)}M rows)`, amount: marCost },
      ],
      confidence: 'low',
      note: 'Fivetran pricing is complex. Enterprise plans often $500-5k+/mo. Get a quote.',
    };
  },

  airbyte: () => ({
    monthly: 200,
    service: 'Airbyte Cloud',
    breakdown: [
      { label: 'Airbyte Cloud base', amount: 150 },
      { label: 'Connection credit usage', amount: 50 },
    ],
    confidence: 'low',
    note: 'Self-hosted is free (pay only for infra ~$100/mo). Cloud metered by credits.',
  }),

  kinesis: ({ eventsPerSec, monthlyIngestGB }) => {
    const shards = Math.max(1, Math.ceil(eventsPerSec / 1000));
    const shardCost = shards * 0.015 * 730;
    const putCost = (eventsPerSec * 86400 * 30 / 1_000_000) * 0.014;
    const firehoseCost = monthlyIngestGB * 0.029;
    return {
      monthly: shardCost + putCost + firehoseCost,
      service: 'AWS Kinesis Data Streams + Firehose',
      breakdown: [
        { label: `${shards} shards × $0.015/hr`, amount: shardCost },
        { label: 'PUT records', amount: putCost },
        { label: `Firehose delivery (${monthlyIngestGB} GB)`, amount: firehoseCost },
      ],
      confidence: 'high',
      note: 'Enhanced fan-out adds $0.015/shard-hr per consumer.',
    };
  },

  // ─── Streaming ────────────────────────────────────────────────────────────
  kafka: ({ eventsPerSec, monthlyIngestGB, storageGB }) => {
    const partitions = Math.max(6, Math.ceil(eventsPerSec / 5000) * 10);
    const partitionCost = partitions * 0.005 * 730;
    const storageCost = Math.min(storageGB, monthlyIngestGB * 7) * 0.10; // 7-day retention
    const networkCost = monthlyIngestGB * 0.08;
    return {
      monthly: partitionCost + storageCost + networkCost,
      service: 'Confluent Cloud (Dedicated)',
      breakdown: [
        { label: `${partitions} partitions × $0.005/hr`, amount: partitionCost },
        { label: 'Storage (7-day retention)', amount: storageCost },
        { label: 'Network ingress', amount: networkCost },
      ],
      confidence: 'medium',
      note: 'MSK (AWS managed Kafka) is typically 20-30% cheaper. Self-hosted is infra cost only.',
    };
  },

  rabbitmq: () => ({
    monthly: 90,
    service: 'CloudAMQP Big Bunny',
    breakdown: [
      { label: 'Big Bunny plan', amount: 80 },
      { label: 'Message storage', amount: 10 },
    ],
    confidence: 'high',
    note: 'LavinMQ / RabbitMQ Cloud. Self-hosted on t3.small: ~$18/mo.',
  }),

  // ─── Processing ───────────────────────────────────────────────────────────
  spark: ({ computeHrsPerDay, monthlyIngestGB }) => {
    const workers = Math.max(2, Math.ceil(monthlyIngestGB / 100));
    const workerCost = workers * computeHrsPerDay * 30 * 0.50; // m5.xlarge EMR pricing
    const emrFee = workers * computeHrsPerDay * 30 * 0.05;
    return {
      monthly: workerCost + emrFee,
      service: 'AWS EMR (Spark)',
      breakdown: [
        { label: `${workers} × m5.xlarge EC2 (${computeHrsPerDay}h/day)`, amount: workerCost },
        { label: 'EMR service fee', amount: emrFee },
      ],
      confidence: 'medium',
      note: 'Spot instances can cut 70%. Databricks Runtime adds convenience but costs more.',
    };
  },

  flink: ({ eventsPerSec, computeHrsPerDay }) => {
    const kpus = Math.max(2, Math.ceil(eventsPerSec / 5000) * 2);
    const kdaCost = kpus * 0.11 * computeHrsPerDay * 30;
    return {
      monthly: kdaCost,
      service: 'AWS Kinesis Data Analytics (Flink)',
      breakdown: [
        { label: `${kpus} KPUs × $0.11/hr (${computeHrsPerDay}h/day)`, amount: kdaCost },
      ],
      confidence: 'medium',
      note: 'Confluent Cloud Flink is ~$0.05/CFU-hr with simpler ops. Self-hosted: EC2 cost.',
    };
  },

  dbt: ({ computeHrsPerDay }) => {
    const seats = Math.max(1, Math.ceil(computeHrsPerDay / 8));
    const cost = seats * 100;
    return {
      monthly: cost,
      service: 'dbt Cloud Team',
      breakdown: [{ label: `${seats} developer seat(s) × $100/mo`, amount: cost }],
      confidence: 'high',
      note: 'dbt Core is free (OSS). dbt Cloud adds CI/CD, IDE, and scheduling. Compute cost paid to warehouse.',
    };
  },

  databricks: ({ computeHrsPerDay, monthlyIngestGB }) => {
    const workers = Math.max(2, Math.ceil(monthlyIngestGB / 50));
    const dbus = workers * 2; // i3.xlarge = 2 DBU/hr
    const jobsCost = dbus * computeHrsPerDay * 30 * 0.15;
    const ec2Cost = workers * computeHrsPerDay * 30 * 0.25;
    return {
      monthly: jobsCost + ec2Cost,
      service: 'Databricks (AWS, Jobs Compute)',
      breakdown: [
        { label: `${dbus} DBUs/hr × $0.15 (${computeHrsPerDay}h/day)`, amount: jobsCost },
        { label: `${workers} × i3.xlarge EC2`, amount: ec2Cost },
      ],
      confidence: 'medium',
      note: 'Photon engine (Delta Live Tables) costs more per DBU. Serverless compute available.',
    };
  },

  aws_glue: ({ computeHrsPerDay, monthlyIngestGB }) => {
    const dpus = Math.max(2, Math.ceil(monthlyIngestGB / 50));
    const cost = dpus * 0.44 * computeHrsPerDay * 30;
    return {
      monthly: cost,
      service: 'AWS Glue (ETL Jobs)',
      breakdown: [{ label: `${dpus} DPUs × $0.44/hr (${computeHrsPerDay}h/day)`, amount: cost }],
      confidence: 'high',
      note: 'Glue Crawlers: $1.00/DPU-hr. Glue Studio adds visual authoring.',
    };
  },

  // ─── Orchestration ────────────────────────────────────────────────────────
  airflow: () => ({
    monthly: 290,
    service: 'AWS MWAA (Managed Airflow) Small',
    breakdown: [
      { label: 'Scheduler (mw1.small)', amount: 180 },
      { label: 'Worker instances (2×)', amount: 90 },
      { label: 'Meta DB (Aurora Serverless)', amount: 20 },
    ],
    confidence: 'high',
    note: 'MWAA Large: ~$700/mo. Self-hosted on EKS: $100-200/mo infra.',
  }),

  prefect: () => ({
    monthly: 200,
    service: 'Prefect Cloud Pro',
    breakdown: [
      { label: 'Prefect Cloud Pro', amount: 200 },
    ],
    confidence: 'high',
    note: 'Prefect self-hosted (open source) is free. Workers run on your infra.',
  }),

  dagster: () => ({
    monthly: 250,
    service: 'Dagster Cloud Serverless',
    breakdown: [
      { label: 'Dagster Cloud base + credits', amount: 250 },
    ],
    confidence: 'medium',
    note: 'Dagster Open Source self-hosted is free. Hybrid deployments available.',
  }),

  // ─── Storage ──────────────────────────────────────────────────────────────
  s3: ({ storageGB, monthlyIngestGB }) => {
    const storage = storageGB * 0.023;
    const requests = (monthlyIngestGB * 1000 * 0.000005) + (storageGB * 0.0001);
    const egress = storageGB * 0.02 * 0.09; // assume 2% egress
    return {
      monthly: storage + requests + egress,
      service: 'AWS S3 Standard',
      breakdown: [
        { label: `Storage (${storageGB} GB × $0.023)`, amount: storage },
        { label: 'Requests (PUT/GET)', amount: requests },
        { label: 'Data transfer out', amount: egress },
      ],
      confidence: 'high',
      note: 'Intelligent-Tiering saves 40%+ for infrequently accessed data.',
    };
  },

  adls: ({ storageGB, monthlyIngestGB }) => {
    const storage = storageGB * 0.018;
    const transactions = (monthlyIngestGB * 1000) * 0.00000004;
    return {
      monthly: storage + transactions,
      service: 'Azure Data Lake Gen2 (LRS)',
      breakdown: [
        { label: `Storage (${storageGB} GB × $0.018)`, amount: storage },
        { label: 'Write/read transactions', amount: transactions },
      ],
      confidence: 'high',
      note: 'GRS replication doubles storage cost. Reserved capacity saves 20-38%.',
    };
  },

  delta_lake: ({ storageGB }) => {
    const storage = storageGB * 0.023; // runs on S3
    return {
      monthly: storage,
      service: 'Delta Lake (OSS on S3)',
      breakdown: [
        { label: `S3 storage (${storageGB} GB × $0.023)`, amount: storage },
        { label: 'Delta Lake license', amount: 0 },
      ],
      confidence: 'high',
      note: 'Delta Lake is open source (free). Only pay for underlying object storage.',
    };
  },

  iceberg: ({ storageGB }) => ({
    monthly: storageGB * 0.023,
    service: 'Apache Iceberg (OSS on S3)',
    breakdown: [
      { label: `S3 storage (${storageGB} GB × $0.023)`, amount: storageGB * 0.023 },
      { label: 'Iceberg license', amount: 0 },
    ],
    confidence: 'high',
    note: 'Open source. Cost is purely underlying object storage.',
  }),

  hdfs: ({ storageGB }) => {
    const cost = (storageGB / 1000) * 50 * 3; // 3x replication, $50/TB/mo on EC2 d3
    return {
      monthly: cost,
      service: 'HDFS on EC2 (d3.xlarge)',
      breakdown: [
        { label: `${Math.ceil(storageGB / 2000)} × d3.xlarge (2TB each)`, amount: cost },
      ],
      confidence: 'low',
      note: 'HDFS typically on-prem. Cloud HDFS on EC2 d3 instances at ~$50/TB effective.',
    };
  },

  // ─── Warehouses ───────────────────────────────────────────────────────────
  snowflake: ({ storageGB, computeHrsPerDay }) => {
    const computeCredits = 4 * computeHrsPerDay * 30; // Medium warehouse = 4 credits/hr
    const computeCost = computeCredits * 2.80;
    const storageCost = storageGB * 0.023;
    return {
      monthly: computeCost + storageCost,
      service: 'Snowflake (AWS, Medium Warehouse)',
      breakdown: [
        { label: `Medium WH: ${computeCredits.toFixed(0)} credits × $2.80`, amount: computeCost },
        { label: `Storage (${storageGB} GB × $0.023)`, amount: storageCost },
      ],
      confidence: 'medium',
      note: 'Auto-suspend saves ~60% compute. Use X-Small for dev. Enterprise pricing negotiated.',
    };
  },

  bigquery: ({ storageGB, monthlyIngestGB }) => {
    const activeStorage = storageGB * 0.02;
    const scanTB = (storageGB * 0.1) / 1000; // estimate 10% of storage scanned per month
    const queryCost = scanTB * 5;
    const streamingInserts = monthlyIngestGB * 0.01 * (1 / 0.2); // streaming: $0.01/200MB
    return {
      monthly: activeStorage + queryCost + streamingInserts,
      service: 'Google BigQuery',
      breakdown: [
        { label: `Active storage (${storageGB} GB)`, amount: activeStorage },
        { label: `Query scan (~${scanTB.toFixed(1)} TB)`, amount: queryCost },
        { label: `Streaming inserts (${monthlyIngestGB} GB)`, amount: streamingInserts },
      ],
      confidence: 'medium',
      note: 'BigQuery Editions (slots) can be cheaper at scale. Storage auto-discounts at 90 days.',
    };
  },

  redshift: ({ storageGB, computeHrsPerDay }) => {
    const nodes = Math.max(1, Math.ceil(storageGB / 16000)); // ra3.4xlarge = 16TB managed
    const computeCost = nodes * 0.99 * computeHrsPerDay * 30;
    return {
      monthly: computeCost,
      service: `AWS Redshift (${nodes}× ra3.4xlarge)`,
      breakdown: [
        { label: `${nodes} ra3.4xlarge × $0.99/hr (${computeHrsPerDay}h/day)`, amount: computeCost },
      ],
      confidence: 'medium',
      note: 'Reserved 1yr saves ~40%. Serverless Redshift available for variable workloads.',
    };
  },

  azure_synapse: ({ computeHrsPerDay }) => {
    const cost = 100 * computeHrsPerDay * 30 * 0.0013; // DWU100 = $0.13/hr ≈ $0.0013*100
    return {
      monthly: Math.max(100, cost),
      service: 'Azure Synapse Analytics (DWU100)',
      breakdown: [{ label: `Dedicated SQL Pool (${computeHrsPerDay}h/day)`, amount: Math.max(100, cost) }],
      confidence: 'medium',
      note: 'Pause the pool when idle. Serverless SQL billed per TB scanned ($5/TB).',
    };
  },

  // ─── Serving / BI ─────────────────────────────────────────────────────────
  tableau: ({ biUsers }) => {
    const creators = Math.max(1, Math.ceil(biUsers * 0.2));
    const viewers = Math.max(0, biUsers - creators);
    const cost = (creators * 75) + (viewers * 15);
    return {
      monthly: cost,
      service: 'Tableau Cloud',
      breakdown: [
        { label: `${creators} Creator × $75`, amount: creators * 75 },
        { label: `${viewers} Viewer × $15`, amount: viewers * 15 },
      ],
      confidence: 'high',
      note: 'Tableau Server (on-prem) has different pricing. Explorer $42/seat.',
    };
  },

  looker: ({ biUsers }) => {
    const cost = biUsers * 50;
    return {
      monthly: Math.max(300, cost),
      service: 'Looker (Google Cloud)',
      breakdown: [{ label: `~${biUsers} users × $50 avg`, amount: Math.max(300, cost) }],
      confidence: 'low',
      note: 'Looker pricing is negotiated enterprise contracts. $300/mo is absolute minimum.',
    };
  },

  power_bi: ({ biUsers }) => {
    const proCost = biUsers * 10;
    return {
      monthly: proCost,
      service: 'Power BI Pro',
      breakdown: [{ label: `${biUsers} users × $10/mo`, amount: proCost }],
      confidence: 'high',
      note: 'Power BI Premium Per Capacity: $5,000/mo flat for unlimited users.',
    };
  },

  superset: () => ({
    monthly: 80,
    service: 'Apache Superset (self-hosted)',
    breakdown: [
      { label: 'EC2 t3.large (web + worker)', amount: 60 },
      { label: 'RDS t3.micro (metadata)', amount: 20 },
    ],
    confidence: 'medium',
    note: 'Open source. Preset.io (managed) starts at $100/mo.',
  }),

  redis: () => ({
    monthly: 115,
    service: 'AWS ElastiCache (Redis, cache.r6g.large)',
    breakdown: [
      { label: 'cache.r6g.large × 730hr', amount: 112 },
      { label: 'Backup storage', amount: 3 },
    ],
    confidence: 'high',
    note: 'Reserved 1yr saves ~40%. Serverless ElastiCache available for spiky workloads.',
  }),
};

export function estimatePipelineCost(nodes, params) {
  const results = [];
  let total = 0;

  for (const node of nodes) {
    const compType = node.data?.componentType;
    if (!compType || !COST_MODELS[compType]) continue;

    // Avoid double-counting duplicate component types (e.g. two Kafka nodes)
    if (results.some(r => r.componentType === compType)) continue;

    const result = COST_MODELS[compType](params);
    results.push({
      componentType: compType,
      label: node.data?.label || compType,
      ...result,
    });
    total += result.monthly;
  }

  return { items: results, total };
}

export const DEFAULT_PARAMS = {
  monthlyIngestGB: 500,
  eventsPerSec: 2000,
  storageGB: 2000,
  biUsers: 25,
  computeHrsPerDay: 8,
};

export const PARAM_CONFIGS = [
  { key: 'monthlyIngestGB', label: 'Monthly Data Ingested', unit: 'GB', min: 1, max: 100000, step: 100, description: 'Raw data ingested from all sources per month' },
  { key: 'eventsPerSec', label: 'Events per Second', unit: 'eps', min: 0, max: 100000, step: 100, description: 'Peak events/messages flowing through streaming layer' },
  { key: 'storageGB', label: 'Total Storage', unit: 'GB', min: 10, max: 500000, step: 500, description: 'Total data stored in lakes and warehouses' },
  { key: 'biUsers', label: 'BI / Dashboard Users', unit: 'users', min: 1, max: 1000, step: 5, description: 'Users who access BI dashboards regularly' },
  { key: 'computeHrsPerDay', label: 'Compute Hours / Day', unit: 'hrs', min: 1, max: 24, step: 1, description: 'Hours per day compute clusters are actively running' },
];
