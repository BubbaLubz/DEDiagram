import { useState, useMemo } from 'react';
import { X, DollarSign, Info, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { estimatePipelineCost, DEFAULT_PARAMS, PARAM_CONFIGS } from '../data/costModels';
import useStore from '../store';

function fmtUSD(n) {
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(0)}`;
}

function costColor(monthly) {
  if (monthly < 100) return '#22c55e';
  if (monthly < 500) return '#f59e0b';
  if (monthly < 2000) return '#f97316';
  return '#ef4444';
}

function costBg(monthly) {
  if (monthly < 100) return '#052e16';
  if (monthly < 500) return '#1c1207';
  if (monthly < 2000) return '#1c0f07';
  return '#1c0a0a';
}

function CostBar({ monthly, maxMonthly }) {
  const pct = maxMonthly > 0 ? Math.min(100, (monthly / maxMonthly) * 100) : 0;
  return (
    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: costColor(monthly) }}/>
    </div>
  );
}

function ParamSlider({ config, value, onChange }) {
  const [localVal, setLocalVal] = useState(value);

  const handleChange = (v) => {
    const n = Math.max(config.min, Math.min(config.max, Number(v)));
    setLocalVal(n);
    onChange(n);
  };

  const fmtVal = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{config.label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={localVal}
            onChange={e => handleChange(e.target.value)}
            className="w-20 text-right text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-200 outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-slate-500 w-8">{config.unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={localVal}
        onChange={e => handleChange(e.target.value)}
        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
      />
      <p className="text-xs text-slate-600">{config.description}</p>
    </div>
  );
}

export default function CostPanel() {
  const { closeCostPanel, nodes } = useStore();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [expandedItem, setExpandedItem] = useState(null);
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
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#161b22', borderLeft: '1px solid #30363d', width: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}>
            <DollarSign size={14} className="text-emerald-300"/>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Cost Estimator</h2>
            <p className="text-xs text-slate-500">{items.length} billable component{items.length !== 1 ? 's' : ''} in diagram</p>
          </div>
        </div>
        <button onClick={closeCostPanel} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
          <X size={15}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Volume params */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowParams(!showParams)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Parameters</span>
            {showParams ? <ChevronUp size={13} className="text-slate-500"/> : <ChevronDown size={13} className="text-slate-500"/>}
          </button>
          {showParams && (
            <div className="px-4 pb-4 space-y-4">
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
        <div className="p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign size={28} className="text-slate-600 mb-2"/>
              <p className="text-sm text-slate-500">No components on canvas</p>
              <p className="text-xs text-slate-600 mt-1">Add components or load a template to see cost estimates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items
                .sort((a, b) => b.monthly - a.monthly)
                .map(item => (
                  <div
                    key={item.componentType}
                    className="rounded-xl border overflow-hidden cursor-pointer transition-all"
                    style={{ borderColor: expandedItem === item.componentType ? costColor(item.monthly) + '66' : '#30363d' }}
                    onClick={() => setExpandedItem(expandedItem === item.componentType ? null : item.componentType)}
                  >
                    <div className="px-3 py-2.5" style={{ background: expandedItem === item.componentType ? costBg(item.monthly) : '#1c2333' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: costColor(item.monthly) }}/>
                          <span className="text-sm font-medium text-slate-200 truncate">{item.label}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#0d1117', color: item.confidence === 'high' ? '#22c55e' : item.confidence === 'medium' ? '#f59e0b' : '#94a3b8', border: '1px solid #30363d' }}
                          >
                            {item.confidence}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-sm font-bold" style={{ color: costColor(item.monthly) }}>{fmtUSD(item.monthly)}</span>
                          <span className="text-xs text-slate-600">/mo</span>
                        </div>
                      </div>
                      <CostBar monthly={item.monthly} maxMonthly={maxMonthly}/>
                    </div>

                    {expandedItem === item.componentType && (
                      <div className="px-3 py-2.5 border-t border-slate-700 bg-slate-900/50 space-y-1.5">
                        <p className="text-xs text-slate-500 font-medium">{item.service}</p>
                        {item.breakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{b.label}</span>
                            <span className="text-slate-300 font-mono">{fmtUSD(b.amount)}</span>
                          </div>
                        ))}
                        {item.note && (
                          <div className="flex items-start gap-1.5 pt-1 border-t border-slate-700 mt-1">
                            <Info size={11} className="text-slate-500 mt-0.5 flex-shrink-0"/>
                            <p className="text-xs text-slate-500 leading-relaxed">{item.note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Total footer */}
      {items.length > 0 && (
        <div className="border-t border-slate-700 px-4 py-4 flex-shrink-0 space-y-3" style={{ background: '#0d1117' }}>
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <Info size={12} className="text-slate-500 flex-shrink-0"/>
            <p className="text-xs text-slate-500">
              Estimates based on public list pricing. Actual costs vary with reserved capacity, usage patterns, and negotiated rates.
            </p>
          </div>

          {/* Confidence meter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20">Confidence:</span>
            <div className="flex gap-1">
              {['high', 'medium', 'low'].map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: overallConfidence === c ? (c === 'high' ? '#052e16' : c === 'medium' ? '#1c1207' : '#1c0a0a') : '#1c2333',
                    color: overallConfidence === c ? (c === 'high' ? '#22c55e' : c === 'medium' ? '#f59e0b' : '#94a3b8') : '#374151',
                    border: `1px solid ${overallConfidence === c ? (c === 'high' ? '#166534' : c === 'medium' ? '#92400e' : '#374151') : '#30363d'}`,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="text-sm font-medium text-slate-300">Monthly Total</span>
              <span className="text-xl font-bold text-white">{fmtUSD(total)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/50">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-slate-500"/>
                <span className="text-xs text-slate-400">Annual projection</span>
              </div>
              <span className="text-sm font-semibold text-slate-200">{fmtUSD(yearlyTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
