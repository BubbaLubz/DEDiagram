import { useState } from 'react';
import { X, Cpu, Zap, Settings, ChevronRight, GitBranch } from 'lucide-react';
import { COMPONENTS, getCategory } from '../data/componentLibrary';
import useStore from '../store';
import { useTheme } from '../theme';

// SVG internal architecture diagrams keep their dark backgrounds —
// they read as technical "screens" inside the warm panel.
const InternalDiagram = ({ component }) => {
  const maps = {
    kafka: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        {['Topic: raw-events', 'Partition 0', 'Partition 1', 'Partition 2'].map((t, i) => (
          <g key={i}>
            <rect x={10 + i * 65} y="15" width="58" height="30" rx="4" fill="#2A2420" stroke="#3A3430"/>
            <text x={39 + i * 65} y="35" textAnchor="middle" fill="#9A8E85" fontSize="7">{t}</text>
          </g>
        ))}
        <text x="10" y="75" fill="#e8642a" fontSize="9" fontWeight="bold">Consumer Group: data-processors</text>
        {[0, 1, 2].map(i => (
          <g key={i}>
            <rect x={25 + i * 80} y="82" width="60" height="25" rx="4" fill="#2A2420" stroke="#e8642a44"/>
            <text x={55 + i * 80} y="99" textAnchor="middle" fill="#9A8E85" fontSize="7">Consumer {i + 1}</text>
          </g>
        ))}
        <text x="10" y="112" fill="#4A4440" fontSize="7">Offset tracking per partition → at-least-once delivery</text>
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        <rect x="5" y="10" width="70" height="30" rx="4" fill="#2A2420" stroke="#3A3430"/>
        <text x="40" y="30" textAnchor="middle" fill="#e25a1c" fontSize="8" fontWeight="bold">Driver</text>
        {['Stage 1', 'Stage 2', 'Stage 3'].map((s, i) => (
          <g key={i}>
            <rect x={90 + i * 60} y="10" width="55" height="30" rx="4" fill="#2A2420" stroke="#3A3430"/>
            <text x={117 + i * 60} y="30" textAnchor="middle" fill="#9A8E85" fontSize="7">{s}</text>
          </g>
        ))}
        {[0, 1, 2, 3].map(i => (
          <g key={i}>
            <rect x={5 + i * 68} y="60" width="60" height="25" rx="4" fill="#2A2420" stroke="#3A3430"/>
            <text x={35 + i * 68} y="77" textAnchor="middle" fill="#9A8E85" fontSize="7">Executor {i + 1}</text>
          </g>
        ))}
        <text x="10" y="112" fill="#4A4440" fontSize="7">Shuffle between stages moves data across executors</text>
      </svg>
    ),
    airflow: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        <text x="10" y="20" fill="#017cee" fontSize="9" fontWeight="bold">DAG: daily_pipeline</text>
        {['extract_pg', 'validate', 'transform', 'load_dw', 'notify'].map((t, i) => (
          <g key={i}>
            <rect x={5 + i * 53} y="28" width="50" height="28" rx="4" fill="#2A2420" stroke="#017cee44"/>
            <text x={30 + i * 53} y="45" textAnchor="middle" fill="#9A8E85" fontSize="6">{t}</text>
            {i < 4 && <path d={`M${55 + i * 53} 42 L${58 + i * 53} 42`} stroke="#017cee" strokeWidth="1.5" markerEnd="url(#a)"/>}
          </g>
        ))}
        <text x="10" y="72" fill="#9A8E85" fontSize="7">schedule_interval: 0 6 * * * (daily at 6am)</text>
        <rect x="5" y="80" width="60" height="18" rx="3" fill="#022c22" stroke="#10b981aa"/>
        <text x="35" y="93" textAnchor="middle" fill="#10b981" fontSize="6">✓ success</text>
        <rect x="70" y="80" width="60" height="18" rx="3" fill="#1c1207" stroke="#f59e0baa"/>
        <text x="100" y="93" textAnchor="middle" fill="#f59e0b" fontSize="6">⟳ running</text>
        <rect x="135" y="80" width="60" height="18" rx="3" fill="#2A2420" stroke="#3A3430"/>
        <text x="165" y="93" textAnchor="middle" fill="#5A5450" fontSize="6">waiting</text>
      </svg>
    ),
    snowflake: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        <text x="10" y="18" fill="#29b5e8" fontSize="9" fontWeight="bold">Virtual Warehouse (MEDIUM, 8 nodes)</text>
        {['micro-partition\n1-2000', 'micro-partition\n2001-4000', 'micro-partition\n4001-6000'].map((p, i) => (
          <g key={i}>
            <rect x={5 + i * 90} y="24" width="85" height="28" rx="4" fill="#0a2535" stroke="#29b5e844"/>
            <text x={47 + i * 90} y="39" textAnchor="middle" fill="#7dd3fc" fontSize="6">{p.split('\n')[0]}</text>
            <text x={47 + i * 90} y="48" textAnchor="middle" fill="#4a7fa0" fontSize="6">{p.split('\n')[1]}</text>
          </g>
        ))}
        <text x="5" y="72" fill="#5A5450" fontSize="7">Columnar micro-partitions (16MB compressed) → pruned by metadata</text>
        <text x="5" y="84" fill="#5A5450" fontSize="7">Result cache: 24h TTL for identical queries</text>
        <text x="5" y="96" fill="#5A5450" fontSize="7">Time Travel: 90 days of historical versions</text>
        <text x="5" y="108" fill="#5A5450" fontSize="7">Separation of storage (S3) from compute (VW)</text>
      </svg>
    ),
    dbt: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        <text x="10" y="18" fill="#ff694b" fontSize="9" fontWeight="bold">dbt DAG (dependency order)</text>
        {[
          { label: 'stg_orders', x: 5, y: 26 },
          { label: 'stg_users', x: 5, y: 56 },
          { label: 'int_orders', x: 95, y: 41 },
          { label: 'fct_revenue', x: 185, y: 26 },
          { label: 'dim_users', x: 185, y: 56 },
        ].map(({ label, x, y }) => (
          <g key={label}>
            <rect x={x} y={y} width="75" height="22" rx="4" fill="#2A2420" stroke="#ff694b44"/>
            <text x={x + 37} y={y + 14} textAnchor="middle" fill="#9A8E85" fontSize="6">{label}</text>
          </g>
        ))}
        <text x="5" y="95" fill="#5A5450" fontSize="7">Incremental model: INSERT new rows only, MERGE for upserts</text>
        <text x="5" y="107" fill="#5A5450" fontSize="7">Tests: unique(order_id), not_null, relationships, accepted_values</text>
      </svg>
    ),
    postgresql: (
      <svg viewBox="0 0 280 120" className="w-full">
        <rect width="280" height="120" rx="8" fill="#1A1714"/>
        <text x="10" y="18" fill="#336791" fontSize="9" fontWeight="bold">WAL (Write-Ahead Log) — CDC Flow</text>
        <rect x="5" y="24" width="70" height="28" rx="4" fill="#1a2f45" stroke="#33679144"/>
        <text x="40" y="42" textAnchor="middle" fill="#7dd3fc" fontSize="7">OLTP Writes</text>
        <path d="M78 38 L100 38" stroke="#336791" strokeWidth="1.5" markerEnd="url(#arrow)"/>
        <rect x="103" y="24" width="65" height="28" rx="4" fill="#1a2f45" stroke="#33679144"/>
        <text x="135" y="42" textAnchor="middle" fill="#7dd3fc" fontSize="7">WAL Segment</text>
        <path d="M171 38 L193 38" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2"/>
        <rect x="196" y="24" width="75" height="28" rx="4" fill="#1a2f45" stroke="#ef444444"/>
        <text x="233" y="42" textAnchor="middle" fill="#fca5a5" fontSize="7">Replication Slot</text>
        <text x="5" y="72" fill="#5A5450" fontSize="7">wal_level = logical → enables row-level CDC</text>
        <text x="5" y="84" fill="#5A5450" fontSize="7">Debezium reads from replication slot (LSN position)</text>
        <text x="5" y="96" fill="#5A5450" fontSize="7">Slot must be consumed → disk fills if consumer lags!</text>
      </svg>
    ),
  };

  return maps[component.type] || (
    <svg viewBox="0 0 280 80" className="w-full">
      <rect width="280" height="80" rx="8" fill="#1A1714"/>
      <text x="140" y="35" textAnchor="middle" fill="#4A4440" fontSize="11">{component.tagline}</text>
      <text x="140" y="52" textAnchor="middle" fill="#4A4440" fontSize="9">{component.description?.slice(0, 80)}...</text>
    </svg>
  );
};

const EMOJI_OPTIONS = [
  '🗄️','💾','🗃️','📦','🗂️','📁','💿','🏗️',
  '📊','📈','📉','🔢','🧮','📐','🔍','🎯',
  '⚙️','🔧','🔩','🔌','💡','⚡','🔄','🚀',
  '📡','🌐','🔗','📶','🛰️','🔭','🧩','🤖',
  '🧠','🧪','🔬','✨','🌩️','💫','🎲','🏆',
  '✅','⚠️','❌','🔔','📌','🏷️','🔑','🔒',
  '💻','🖥️','📝','📋','📄','🗒️','📃','🌟',
];

function CustomBoxEditor({ nodeId, initialLabel, initialNotes, initialIcon }) {
  const P = useTheme();
  const updateNodeData = useStore(s => s.updateNodeData);
  const [label, setLabel] = useState(initialLabel || '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [icon, setIcon] = useState(initialIcon || '🔲');
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleIconSelect = (emoji) => {
    setIcon(emoji);
    updateNodeData(nodeId, { iconEmoji: emoji });
    setPickerOpen(false);
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 13, color: P.text,
    background: P.input, border: `1px solid ${P.divider}`, borderRadius: 4,
    outline: 'none', transition: 'border-color 0.15s',
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Icon picker */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.muted, marginBottom: 8 }}>Icon</p>
        <button
          onClick={() => setPickerOpen(o => !o)}
          style={{
            width: 48, height: 48, borderRadius: 6, fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${pickerOpen ? P.amber : P.divider}`,
            background: P.surface, cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          {icon}
        </button>
        {pickerOpen && (
          <div style={{
            marginTop: 8, padding: 8, borderRadius: 4, border: `1px solid ${P.divider}`,
            background: '#F7F4EF', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2,
          }}>
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleIconSelect(emoji)}
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, borderRadius: 3, border: `1px solid ${icon === emoji ? P.amber : 'transparent'}`,
                  background: icon === emoji ? P.amber + '18' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.muted, marginBottom: 8 }}>Name</p>
        <input
          value={label}
          onChange={(e) => { setLabel(e.target.value); updateNodeData(nodeId, { label: e.target.value }); }}
          style={inputStyle}
          placeholder="Component name…"
          onFocus={e => { e.target.style.borderColor = P.amber; }}
          onBlur={e => { e.target.style.borderColor = P.divider; }}
        />
      </div>

      {/* Description */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.muted, marginBottom: 8 }}>Description</p>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); updateNodeData(nodeId, { notes: e.target.value }); }}
          rows={4}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
          placeholder="Describe this component…"
          onFocus={e => { e.target.style.borderColor = P.amber; }}
          onBlur={e => { e.target.style.borderColor = P.divider; }}
        />
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const P = useTheme();
  const { selectedNode, closeDetail, nodes, edges } = useStore();
  if (!selectedNode) return null;

  const component = COMPONENTS[selectedNode.data?.componentType] || {};
  const category = getCategory(component.category);

  const inboundEdges  = edges.filter(e => e.target === selectedNode.id);
  const outboundEdges = edges.filter(e => e.source === selectedNode.id);
  const getNodeLabel  = (id) => nodes.find(n => n.id === id)?.data?.label || id;

  const sectionLabel = (label) => (
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.muted, marginBottom: 8 }}>
      {label}
    </p>
  );

  return (
    <div style={{ width: 380, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: P.bg, borderLeft: `1px solid ${P.divider}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${P.divider}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            background: component.bg || P.surface,
            border: `1.5px solid ${(component.color || category.color) + '44'}`,
          }}>
            <span style={{ color: component.color || category.color }}>
              {component.type === 'custom_box'
                ? (selectedNode.data?.iconEmoji || '🔲')
                : (component.iconEmoji || '⚡')}
            </span>
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 4 }}>
              {selectedNode.data?.label || component.label}
            </h2>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 2,
              background: (category.color || P.amber) + '22',
              color: category.color || P.amber, fontWeight: 500,
            }}>
              {category.label}
            </span>
          </div>
        </div>
        <button
          onClick={closeDetail}
          style={{ padding: 6, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: P.faint, transition: 'color 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.color = P.text}
          onMouseLeave={e => e.currentTarget.style.color = P.faint}
        >
          <X size={15}/>
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {component.type === 'custom_box' ? (
          <CustomBoxEditor
            key={selectedNode.id}
            nodeId={selectedNode.id}
            initialLabel={selectedNode.data?.label}
            initialNotes={selectedNode.data?.notes}
            initialIcon={selectedNode.data?.iconEmoji}
          />
        ) : (
          <>
            {/* Tagline + Description */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: category.color || P.amber, marginBottom: 6 }}>
                {component.tagline}
              </p>
              <p style={{ fontSize: 13, color: P.muted, lineHeight: 1.65 }}>{component.description}</p>
              {selectedNode.data?.notes && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 4, background: P.card, border: `1px solid ${P.divider}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: P.muted, marginBottom: 4 }}>Pipeline Notes</p>
                  <p style={{ fontSize: 13, color: P.text, lineHeight: 1.6 }}>{selectedNode.data.notes}</p>
                </div>
              )}
            </div>

            {/* Internal architecture */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Cpu size={12} style={{ color: P.muted }}/>
                {sectionLabel('Internal Architecture')}
              </div>
              <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${P.divider}` }}>
                <InternalDiagram component={component}/>
              </div>
              {component.internalDesc && (
                <p style={{ fontSize: 12, color: P.muted, marginTop: 8, lineHeight: 1.6 }}>{component.internalDesc}</p>
              )}
            </div>

            {/* Capabilities */}
            {component.capabilities?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Zap size={12} style={{ color: P.muted }}/>
                  {sectionLabel('Key Capabilities')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {component.capabilities.map((cap, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: P.text }}>
                      <ChevronRight size={12} style={{ color: category.color || P.amber, flexShrink: 0, marginTop: 2 }}/>
                      <span style={{ lineHeight: 1.5 }}>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Config */}
            {component.config?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Settings size={12} style={{ color: P.muted }}/>
                  {sectionLabel('Key Config')}
                </div>
                <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${P.divider}` }}>
                  {component.config.map((cfg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px', fontFamily: 'monospace', fontSize: 12,
                        color: P.amber,
                        background: i % 2 === 0 ? P.surface : P.card,
                        borderBottom: i < component.config.length - 1 ? `1px solid ${P.divider}` : 'none',
                      }}
                    >
                      {cfg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Pipeline connections */}
        {(inboundEdges.length > 0 || outboundEdges.length > 0) && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <GitBranch size={12} style={{ color: P.muted }}/>
              {sectionLabel('Pipeline Connections')}
            </div>
            {inboundEdges.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: P.faint, marginBottom: 6 }}>Receives from:</p>
                {inboundEdges.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: P.text, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }}/>
                    <span style={{ fontWeight: 500 }}>{getNodeLabel(e.source)}</span>
                    <span style={{ color: P.faint }}>via</span>
                    <span style={{ padding: '1px 6px', borderRadius: 2, background: P.card, color: P.muted, border: `1px solid ${P.divider}` }}>
                      {e.data?.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {outboundEdges.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: P.faint, marginBottom: 6 }}>Sends to:</p>
                {outboundEdges.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: P.text, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}/>
                    <span style={{ fontWeight: 500 }}>{getNodeLabel(e.target)}</span>
                    <span style={{ color: P.faint }}>via</span>
                    <span style={{ padding: '1px 6px', borderRadius: 2, background: P.card, color: P.muted, border: `1px solid ${P.divider}` }}>
                      {e.data?.label}
                    </span>
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
