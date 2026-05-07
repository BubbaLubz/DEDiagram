import { X, Cpu, Zap, Settings, ChevronRight, GitBranch } from 'lucide-react';
import { COMPONENTS, getCategory } from '../data/componentLibrary';
import useStore from '../store';

const InternalDiagram = ({ component }) => {
  const maps = {
    kafka: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        {['Topic: raw-events', 'Partition 0', 'Partition 1', 'Partition 2'].map((t, i) => (
          <g key={i}>
            <rect x={10 + i * 65} y="15" width="58" height="30" rx="4" fill="#1c2333" stroke="#30363d"/>
            <text x={39 + i * 65} y="35" textAnchor="middle" fill="#94a3b8" fontSize="7">{t}</text>
          </g>
        ))}
        <text x="10" y="75" fill="#e8642a" fontSize="9" fontWeight="bold">Consumer Group: data-processors</text>
        {[0, 1, 2].map(i => (
          <g key={i}>
            <rect x={25 + i * 80} y="82" width="60" height="25" rx="4" fill="#1c2333" stroke="#e8642a44"/>
            <text x={55 + i * 80} y="99" textAnchor="middle" fill="#94a3b8" fontSize="7">Consumer {i + 1}</text>
          </g>
        ))}
        <text x="10" y="112" fill="#374151" fontSize="7">Offset tracking per partition → at-least-once delivery</text>
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        <rect x="5" y="10" width="70" height="30" rx="4" fill="#1c2333" stroke="#30363d"/>
        <text x="40" y="30" textAnchor="middle" fill="#e25a1c" fontSize="8" fontWeight="bold">Driver</text>
        {['Stage 1', 'Stage 2', 'Stage 3'].map((s, i) => (
          <g key={i}>
            <rect x={90 + i * 60} y="10" width="55" height="30" rx="4" fill="#1c2333" stroke="#30363d"/>
            <text x={117 + i * 60} y="30" textAnchor="middle" fill="#94a3b8" fontSize="7">{s}</text>
          </g>
        ))}
        {[0, 1, 2, 3].map(i => (
          <g key={i}>
            <rect x={5 + i * 68} y="60" width="60" height="25" rx="4" fill="#1c2333" stroke="#30363d"/>
            <text x={35 + i * 68} y="77" textAnchor="middle" fill="#a3a3a3" fontSize="7">Executor {i + 1}</text>
          </g>
        ))}
        <text x="10" y="112" fill="#374151" fontSize="7">Shuffle between stages moves data across executors</text>
      </svg>
    ),
    airflow: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        <text x="10" y="20" fill="#017cee" fontSize="9" fontWeight="bold">DAG: daily_pipeline</text>
        {['extract_pg', 'validate', 'transform', 'load_dw', 'notify'].map((t, i) => (
          <g key={i}>
            <rect x={5 + i * 53} y="28" width="50" height="28" rx="4" fill="#1c2333" stroke="#017cee44"/>
            <text x={30 + i * 53} y="45" textAnchor="middle" fill="#94a3b8" fontSize="6">{t}</text>
            {i < 4 && <path d={`M${55 + i * 53} 42 L${58 + i * 53} 42`} stroke="#017cee" strokeWidth="1.5" markerEnd="url(#a)"/>}
          </g>
        ))}
        <text x="10" y="72" fill="#94a3b8" fontSize="7">schedule_interval: 0 6 * * * (daily at 6am)</text>
        <rect x="5" y="80" width="60" height="18" rx="3" fill="#022c22" stroke="#10b981aa"/>
        <text x="35" y="93" textAnchor="middle" fill="#10b981" fontSize="6">✓ success</text>
        <rect x="70" y="80" width="60" height="18" rx="3" fill="#1c1207" stroke="#f59e0baa"/>
        <text x="100" y="93" textAnchor="middle" fill="#f59e0b" fontSize="6">⟳ running</text>
        <rect x="135" y="80" width="60" height="18" rx="3" fill="#1c2333" stroke="#30363d"/>
        <text x="165" y="93" textAnchor="middle" fill="#64748b" fontSize="6">waiting</text>
      </svg>
    ),
    snowflake: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        <text x="10" y="18" fill="#29b5e8" fontSize="9" fontWeight="bold">Virtual Warehouse (MEDIUM, 8 nodes)</text>
        {['micro-partition\n1-2000', 'micro-partition\n2001-4000', 'micro-partition\n4001-6000'].map((p, i) => (
          <g key={i}>
            <rect x={5 + i * 90} y="24" width="85" height="28" rx="4" fill="#0a2535" stroke="#29b5e844"/>
            <text x={47 + i * 90} y="39" textAnchor="middle" fill="#7dd3fc" fontSize="6">{p.split('\n')[0]}</text>
            <text x={47 + i * 90} y="48" textAnchor="middle" fill="#4a7fa0" fontSize="6">{p.split('\n')[1]}</text>
          </g>
        ))}
        <text x="5" y="72" fill="#64748b" fontSize="7">Columnar micro-partitions (16MB compressed) → pruned by metadata</text>
        <text x="5" y="84" fill="#64748b" fontSize="7">Result cache: 24h TTL for identical queries</text>
        <text x="5" y="96" fill="#64748b" fontSize="7">Time Travel: 90 days of historical versions</text>
        <text x="5" y="108" fill="#64748b" fontSize="7">Separation of storage (S3) from compute (VW)</text>
      </svg>
    ),
    dbt: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        <text x="10" y="18" fill="#ff694b" fontSize="9" fontWeight="bold">dbt DAG (dependency order)</text>
        {[
          { label: 'stg_orders', x: 5, y: 26 },
          { label: 'stg_users', x: 5, y: 56 },
          { label: 'int_orders', x: 95, y: 41 },
          { label: 'fct_revenue', x: 185, y: 26 },
          { label: 'dim_users', x: 185, y: 56 },
        ].map(({ label, x, y }) => (
          <g key={label}>
            <rect x={x} y={y} width="75" height="22" rx="4" fill="#1c2333" stroke="#ff694b44"/>
            <text x={x + 37} y={y + 14} textAnchor="middle" fill="#94a3b8" fontSize="6">{label}</text>
          </g>
        ))}
        <text x="5" y="95" fill="#64748b" fontSize="7">Incremental model: INSERT new rows only, MERGE for upserts</text>
        <text x="5" y="107" fill="#64748b" fontSize="7">Tests: unique(order_id), not_null, relationships, accepted_values</text>
      </svg>
    ),
    postgresql: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#0d1117"/>
        <text x="10" y="18" fill="#336791" fontSize="9" fontWeight="bold">WAL (Write-Ahead Log) — CDC Flow</text>
        <rect x="5" y="24" width="70" height="28" rx="4" fill="#1a2f45" stroke="#33679144"/>
        <text x="40" y="42" textAnchor="middle" fill="#7dd3fc" fontSize="7">OLTP Writes</text>
        <path d="M78 38 L100 38" stroke="#336791" strokeWidth="1.5" markerEnd="url(#arrow)"/>
        <rect x="103" y="24" width="65" height="28" rx="4" fill="#1a2f45" stroke="#33679144"/>
        <text x="135" y="42" textAnchor="middle" fill="#7dd3fc" fontSize="7">WAL Segment</text>
        <path d="M171 38 L193 38" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2"/>
        <rect x="196" y="24" width="75" height="28" rx="4" fill="#1a2f45" stroke="#ef444444"/>
        <text x="233" y="42" textAnchor="middle" fill="#fca5a5" fontSize="7">Replication Slot</text>
        <text x="5" y="72" fill="#64748b" fontSize="7">wal_level = logical → enables row-level CDC</text>
        <text x="5" y="84" fill="#64748b" fontSize="7">Debezium reads from replication slot (LSN position)</text>
        <text x="5" y="96" fill="#64748b" fontSize="7">Slot must be consumed → disk fills if consumer lags!</text>
      </svg>
    ),
  };

  return maps[component.type] || (
    <svg viewBox="0 0 280 80" className="w-full">
      <rect width="280" height="80" rx="8" fill="#0d1117"/>
      <text x="140" y="35" textAnchor="middle" fill="#374151" fontSize="11">{component.tagline}</text>
      <text x="140" y="52" textAnchor="middle" fill="#374151" fontSize="9">{component.description?.slice(0, 80)}...</text>
    </svg>
  );
};

export default function DetailPanel() {
  const { selectedNode, closeDetail, nodes, edges } = useStore();
  if (!selectedNode) return null;

  const component = COMPONENTS[selectedNode.data?.componentType] || {};
  const category = getCategory(component.category);

  const inboundEdges = edges.filter(e => e.target === selectedNode.id);
  const outboundEdges = edges.filter(e => e.source === selectedNode.id);

  const getNodeLabel = (id) => nodes.find(n => n.id === id)?.data?.label || id;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#161b22', borderLeft: '1px solid #30363d', width: 380 }}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: component.bg || '#1c2333', border: `2px solid ${component.color || category.color}44` }}
          >
            <span style={{ color: component.color || category.color }}>{component.iconEmoji || '⚡'}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{selectedNode.data?.label || component.label}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: category.color + '22', color: category.color }}>
              {category.label}
            </span>
          </div>
        </div>
        <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
          <X size={16}/>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Tagline + Description */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: category.color }}>{component.tagline}</p>
          <p className="text-sm text-slate-300 leading-relaxed">{component.description}</p>
          {selectedNode.data?.notes && (
            <div className="mt-2 p-3 rounded-lg border border-slate-600 bg-slate-800/50">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Pipeline Notes</p>
              <p className="text-sm text-slate-200">{selectedNode.data.notes}</p>
            </div>
          )}
        </div>

        {/* Internal architecture visualization */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={13} className="text-slate-400"/>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Internal Architecture</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-700">
            <InternalDiagram component={component} />
          </div>
          {component.internalDesc && (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{component.internalDesc}</p>
          )}
        </div>

        {/* Capabilities */}
        {component.capabilities?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} className="text-slate-400"/>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Capabilities</span>
            </div>
            <div className="space-y-1">
              {component.capabilities.map((cap, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <ChevronRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: category.color }}/>
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Config */}
        {component.config?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings size={13} className="text-slate-400"/>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Config</span>
            </div>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              {component.config.map((cfg, i) => (
                <div key={i} className={`px-3 py-1.5 font-mono text-xs text-emerald-300 ${i < component.config.length - 1 ? 'border-b border-slate-700' : ''}`}
                  style={{ background: i % 2 === 0 ? '#0d1117' : '#111827' }}>
                  {cfg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline connections */}
        {(inboundEdges.length > 0 || outboundEdges.length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={13} className="text-slate-400"/>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Connections</span>
            </div>
            {inboundEdges.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-slate-500 mb-1">Receives from:</p>
                {inboundEdges.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-slate-300 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"/>
                    <span className="font-medium">{getNodeLabel(e.source)}</span>
                    <span className="text-slate-500">via</span>
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1c2333', color: '#94a3b8' }}>{e.data?.label}</span>
                  </div>
                ))}
              </div>
            )}
            {outboundEdges.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Sends to:</p>
                {outboundEdges.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-slate-300 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
                    <span className="font-medium">{getNodeLabel(e.target)}</span>
                    <span className="text-slate-500">via</span>
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1c2333', color: '#94a3b8' }}>{e.data?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
