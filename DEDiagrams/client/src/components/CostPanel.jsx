import { useState, useMemo } from 'react';
import { X, DollarSign, Info, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { estimatePipelineCost, DEFAULT_PARAMS, PARAM_CONFIGS } from '../data/costModels';
import useStore from '../store';
import { useTheme } from '../theme';

function fmtUSD(n) {
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000)  return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(0)}`;
}

function costColor(monthly) {
  if (monthly < 100)  return '#5C7A4A';
  if (monthly < 500)  return '#C99A3E';
  if (monthly < 2000) return '#BC5A34';
  return '#A23A2E';
}

function costBg(monthly) {
  if (monthly < 100)  return '#E3E8DA';
  if (monthly < 500)  return '#EFE4C8';
  if (monthly < 2000) return '#EEDCCD';
  return '#EBD6D2';
}

function CostBar({ monthly, maxMonthly }) {
  const P = useTheme();
  const pct = maxMonthly > 0 ? Math.min(100, (monthly / maxMonthly) * 100) : 0;
  return (
    <div style={{ width: '100%', height: 3, background: P.divider, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%', width: '100%', borderRadius: 2,
        transformOrigin: 'left', transform: `scaleX(${pct / 100})`,
        transition: 'transform 0.5s', background: costColor(monthly),
      }}/>
    </div>
  );
}

function ParamSlider({ config, value, onChange }) {
  const P = useTheme();
  const [localVal, setLocalVal] = useState(value);

  const handleChange = (v) => {
    const n = Math.max(config.min, Math.min(config.max, Number(v)));
    setLocalVal(n);
    onChange(n);
  };

  const fmtVal = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000)    return `${(v / 1000).toFixed(1)}k`;
    return v;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: P.text }}>{config.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={localVal}
            onChange={e => handleChange(e.target.value)}
            style={{
              width: 72, textAlign: 'right', fontSize: 12,
              background: P.input, border: `1px solid ${P.divider}`, borderRadius: 3,
              padding: '2px 6px', color: P.text, outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <span style={{ fontSize: 11, color: P.faint, width: 32 }}>{config.unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={localVal}
        onChange={e => handleChange(e.target.value)}
        style={{ width: '100%', height: 3, borderRadius: 2, cursor: 'pointer', accentColor: P.amber }}
      />
      <p style={{ fontSize: 11, color: P.faint }}>{config.description}</p>
    </div>
  );
}

export default function CostPanel() {
  const P = useTheme();
  const { closeCostPanel, nodes } = useStore();
  const [params, setParams]         = useState(DEFAULT_PARAMS);
  const [expandedItem, setExpanded] = useState(null);
  const [showParams, setShowParams] = useState(true);

  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const { items, total } = useMemo(
    () => estimatePipelineCost(nodes, params),
    [nodes, params]
  );

  const maxMonthly = Math.max(1, ...items.map(i => i.monthly));
  const yearlyTotal = total * 12;

  const confidenceCount = { high: 0, medium: 0, low: 0 };
  items.forEach(i => confidenceCount[i.confidence]++);
  const overallConfidence = confidenceCount.low > 1 ? 'low'
    : confidenceCount.medium > 1 ? 'medium' : 'high';

  return (
    <div style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: P.bg, borderLeft: `1px solid ${P.divider}` }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${P.divider}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E3E8DA', border: `1px solid #A9BB98` }}>
            <DollarSign size={14} style={{ color: '#435C36' }}/>
          </div>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Cost Estimator</h2>
            <p style={{ fontSize: 11, color: P.faint }}>{items.length} billable component{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={closeCostPanel}
          style={{ padding: 6, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: P.faint }}
          onMouseEnter={e => e.currentTarget.style.color = P.text}
          onMouseLeave={e => e.currentTarget.style.color = P.faint}
        >
          <X size={15}/>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Volume parameters */}
        <div style={{ borderBottom: `1px solid ${P.divider}` }}>
          <button
            onClick={() => setShowParams(!showParams)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = P.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.muted }}>
              Volume Parameters
            </span>
            {showParams
              ? <ChevronUp size={12} style={{ color: P.faint }}/>
              : <ChevronDown size={12} style={{ color: P.faint }}/>}
          </button>
          {showParams && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {PARAM_CONFIGS.map(cfg => (
                <ParamSlider
                  key={cfg.key}
                  config={cfg}
                  value={params[cfg.key]}
                  onChange={v => updateParam(cfg.key, v)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        <div style={{ padding: 16 }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
              <DollarSign size={28} style={{ color: P.faint, marginBottom: 10 }}/>
              <p style={{ fontSize: 13, color: P.muted }}>No components on canvas</p>
              <p style={{ fontSize: 12, color: P.faint, marginTop: 4 }}>Add components or load a template to see estimates</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items
                .sort((a, b) => b.monthly - a.monthly)
                .map(item => (
                  <CostItem
                    key={item.componentType}
                    item={item}
                    maxMonthly={maxMonthly}
                    expanded={expandedItem === item.componentType}
                    onToggle={() => setExpanded(expandedItem === item.componentType ? null : item.componentType)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer totals */}
      {items.length > 0 && (
        <div style={{ borderTop: `1px solid ${P.divider}`, padding: '14px 16px', flexShrink: 0, background: P.surface, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Info size={11} style={{ color: P.faint, flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontSize: 11, color: P.faint, lineHeight: 1.55 }}>
              Estimates based on public list pricing. Actual costs vary with reserved capacity and usage patterns.
            </p>
          </div>

          {/* Confidence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: P.faint, width: 72 }}>Confidence:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['high', 'medium', 'low'].map(c => {
                const active = overallConfidence === c;
                const clr = c === 'high' ? '#5C7A4A' : c === 'medium' ? '#C99A3E' : '#9C8F7C';
                return (
                  <span key={c} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 2,
                    background: active ? clr + '22' : P.card,
                    color: active ? clr : P.faint,
                    border: `1px solid ${active ? clr + '66' : P.divider}`,
                  }}>
                    {c}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div style={{ border: `1px solid ${P.divider}`, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${P.divider}` }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: P.text }}>Monthly Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: P.text }}>{fmtUSD(total)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: P.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={11} style={{ color: P.faint }}/>
                <span style={{ fontSize: 12, color: P.muted }}>Annual projection</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{fmtUSD(yearlyTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CostItem({ item, maxMonthly, expanded, onToggle }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        border: `1px solid ${expanded ? costColor(item.monthly) + '66' : P.divider}`,
        borderRadius: 4, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ padding: '10px 12px', background: expanded ? costBg(item.monthly) : hover ? P.hover : P.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: costColor(item.monthly), flexShrink: 0 }}/>
            <span style={{ fontSize: 13, fontWeight: 500, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 2, flexShrink: 0,
              background: P.card, border: `1px solid ${P.divider}`,
              color: item.confidence === 'high' ? '#5C7A4A' : item.confidence === 'medium' ? '#C99A3E' : P.faint,
            }}>
              {item.confidence}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: costColor(item.monthly) }}>{fmtUSD(item.monthly)}</span>
            <span style={{ fontSize: 11, color: P.faint }}>/mo</span>
          </div>
        </div>
        <CostBar monthly={item.monthly} maxMonthly={maxMonthly}/>
      </div>

      {expanded && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${P.divider}`, background: P.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, color: P.muted, fontWeight: 500 }}>{item.service}</p>
          {item.breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: P.muted }}>{b.label}</span>
              <span style={{ color: P.text, fontFamily: 'monospace' }}>{fmtUSD(b.amount)}</span>
            </div>
          ))}
          {item.note && (
            <div style={{ display: 'flex', gap: 6, paddingTop: 6, borderTop: `1px solid ${P.divider}`, marginTop: 2 }}>
              <Info size={11} style={{ color: P.faint, flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontSize: 11, color: P.faint, lineHeight: 1.5 }}>{item.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
