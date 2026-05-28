import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { COMPONENTS, getCategory } from '../../data/componentLibrary';

const ICON_MAP = {
  postgresql: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="monospace">PG</text>
    </svg>
  ),
  mysql: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="monospace">MY</text>
    </svg>
  ),
  mongodb: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M16 5 C16 5 20 11 20 17 C20 20.3 18.2 23.3 16 25 C13.8 23.3 12 20.3 12 17 C12 11 16 5 16 5Z" fill="white" opacity="0.9"/>
    </svg>
  ),
  rest_api: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">API</text>
    </svg>
  ),
  files_s3: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <rect x="8" y="10" width="16" height="3" rx="1" fill="white"/>
      <rect x="8" y="15" width="13" height="3" rx="1" fill="white" opacity="0.8"/>
      <rect x="8" y="20" width="10" height="3" rx="1" fill="white" opacity="0.6"/>
    </svg>
  ),
  debezium: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">DBZ</text>
    </svg>
  ),
  fivetran: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M8 8 L20 8 L20 14 L14 14 L14 24 L8 24Z" fill="white"/>
    </svg>
  ),
  airbyte: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2.5"/>
      <circle cx="16" cy="16" r="3" fill="white"/>
    </svg>
  ),
  kinesis: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M7 16 Q11 10 16 16 Q21 22 25 16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  kafka: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <circle cx="16" cy="8" r="3" fill="white"/>
      <circle cx="9" cy="22" r="3" fill="white"/>
      <circle cx="23" cy="22" r="3" fill="white"/>
      <line x1="16" y1="11" x2="10" y2="19" stroke="white" strokeWidth="1.5"/>
      <line x1="16" y1="11" x2="22" y2="19" stroke="white" strokeWidth="1.5"/>
      <line x1="10" y1="22" x2="22" y2="22" stroke="white" strokeWidth="1" strokeDasharray="2 1"/>
    </svg>
  ),
  rabbitmq: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <rect x="10" y="12" width="12" height="10" rx="2" fill="white"/>
      <rect x="13" y="7" width="3" height="6" rx="1" fill="white"/>
      <rect x="19" y="9" width="3" height="4" rx="1" fill="white"/>
    </svg>
  ),
  spark: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M18 5 L12 17 L17 17 L14 27 L22 13 L17 13 Z" fill="white"/>
    </svg>
  ),
  flink: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M8 22 Q10 14 16 10 Q20 8 24 12 Q26 15 24 18 Q22 22 18 22 Q14 24 12 26 Q10 24 8 22Z" fill="white" opacity="0.9"/>
      <circle cx="21" cy="12" r="2" fill="#e6522c"/>
    </svg>
  ),
  dbt: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">dbt</text>
    </svg>
  ),
  databricks: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M16 5 L26 11 L26 17 L16 23 L6 17 L6 11 Z" fill="none" stroke="white" strokeWidth="1.5"/>
      <path d="M16 11 L22 14 L22 18 L16 21 L10 18 L10 14 Z" fill="white" opacity="0.8"/>
    </svg>
  ),
  aws_glue: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <circle cx="16" cy="16" r="6" fill="none" stroke="white" strokeWidth="2"/>
      <line x1="16" y1="7" x2="16" y2="10" stroke="white" strokeWidth="2"/>
      <line x1="16" y1="22" x2="16" y2="25" stroke="white" strokeWidth="2"/>
      <line x1="7" y1="16" x2="10" y2="16" stroke="white" strokeWidth="2"/>
      <line x1="22" y1="16" x2="25" y2="16" stroke="white" strokeWidth="2"/>
    </svg>
  ),
  airflow: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M6 20 Q10 12 16 14 Q22 16 26 10" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M6 24 Q10 16 16 18 Q22 20 26 14" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  prefect: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M10 8 L22 8 L22 16 L16 16 L16 24 L10 24 Z" fill="white"/>
    </svg>
  ),
  dagster: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <polygon points="16,6 26,12 26,20 16,26 6,20 6,12" fill="none" stroke="white" strokeWidth="2"/>
      <polygon points="16,11 21,14 21,18 16,21 11,18 11,14" fill="white" opacity="0.8"/>
    </svg>
  ),
  s3: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <ellipse cx="16" cy="11" rx="8" ry="4" fill="white"/>
      <path d="M8 11 L8 22 Q8 26 16 26 Q24 26 24 22 L24 11" fill="none" stroke="white" strokeWidth="2"/>
      <path d="M8 16 Q8 20 16 20 Q24 20 24 16" fill="none" stroke="white" strokeWidth="1.5"/>
    </svg>
  ),
  adls: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M6 22 Q8 16 12 14 Q16 12 20 14 Q24 16 26 22Z" fill="white" opacity="0.9"/>
      <path d="M4 26 L28 26" stroke="white" strokeWidth="2"/>
    </svg>
  ),
  delta_lake: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M16 6 L27 24 L5 24 Z" fill="none" stroke="white" strokeWidth="2.5"/>
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Δ</text>
    </svg>
  ),
  iceberg: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <polygon points="16,8 22,16 10,16" fill="white"/>
      <polygon points="14,16 22,26 7,26" fill="white" opacity="0.6"/>
    </svg>
  ),
  hdfs: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <rect x="7" y="9" width="6" height="14" rx="1" fill="white"/>
      <rect x="19" y="9" width="6" height="14" rx="1" fill="white"/>
      <rect x="13" y="14" width="6" height="4" rx="1" fill="white" opacity="0.8"/>
    </svg>
  ),
  snowflake: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <line x1="16" y1="5" x2="16" y2="27" stroke="white" strokeWidth="2"/>
      <line x1="5" y1="16" x2="27" y2="16" stroke="white" strokeWidth="2"/>
      <line x1="8" y1="8" x2="24" y2="24" stroke="white" strokeWidth="2"/>
      <line x1="24" y1="8" x2="8" y2="24" stroke="white" strokeWidth="2"/>
      <circle cx="16" cy="16" r="3" fill="white"/>
    </svg>
  ),
  bigquery: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <circle cx="15" cy="15" r="7" fill="none" stroke="white" strokeWidth="2.5"/>
      <line x1="20" y1="20" x2="26" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  redshift: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M16 6 L26 12 L26 20 L16 26 L6 20 L6 12 Z" fill="none" stroke="white" strokeWidth="2"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>
  ),
  azure_synapse: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">SYN</text>
    </svg>
  ),
  tableau: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <rect x="10" y="18" width="4" height="8" rx="1" fill="white"/>
      <rect x="16" y="12" width="4" height="14" rx="1" fill="white" opacity="0.9"/>
      <rect x="22" y="8" width="4" height="18" rx="1" fill="white" opacity="0.8"/>
      <rect x="4" y="22" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
    </svg>
  ),
  looker: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <circle cx="16" cy="13" r="6" fill="none" stroke="white" strokeWidth="2.5"/>
      <path d="M20 17 L26 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="16" cy="13" r="2.5" fill="white"/>
    </svg>
  ),
  power_bi: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <rect x="6" y="20" width="5" height="7" rx="1" fill="white" opacity="0.8"/>
      <rect x="13" y="14" width="5" height="13" rx="1" fill="white"/>
      <rect x="20" y="8" width="5" height="19" rx="1" fill="white" opacity="0.9"/>
    </svg>
  ),
  superset: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <path d="M8 24 Q10 16 16 14 Q22 12 24 8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="24" cy="8" r="2.5" fill="white"/>
    </svg>
  ),
  redis: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      <ellipse cx="16" cy="20" rx="9" ry="4" fill="white" opacity="0.3"/>
      <ellipse cx="16" cy="16" rx="9" ry="4" fill="white" opacity="0.6"/>
      <ellipse cx="16" cy="12" rx="9" ry="4" fill="white"/>
    </svg>
  ),
  docker: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color}/>
      {/* Whale body */}
      <path d="M5 20 Q5 24 10 24 L24 24 Q28 24 28 20 Q28 17 25 16 Q24 12 20 12 Q19 9 16 9 L14 9 L14 12 L11 12 L11 9 L9 9 L9 12 L6 12 Q4 13 4 16 Q4 18 5 20Z" fill="white" opacity="0.15"/>
      {/* Container stacks */}
      <rect x="7" y="14" width="4" height="3" rx="0.5" fill="white"/>
      <rect x="13" y="14" width="4" height="3" rx="0.5" fill="white"/>
      <rect x="19" y="14" width="4" height="3" rx="0.5" fill="white"/>
      <rect x="7" y="19" width="4" height="3" rx="0.5" fill="white" opacity="0.7"/>
      <rect x="13" y="19" width="4" height="3" rx="0.5" fill="white" opacity="0.7"/>
      {/* Whale spout */}
      <path d="M25 13 Q27 10 26 8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  anthropic: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill="#1a0e05"/>
      {/* Stylized A mark matching Anthropic's brand */}
      <path d="M16 6 L24 26 L20.5 26 L18.5 21 L13.5 21 L11.5 26 L8 26 Z" fill={color} opacity="0.9"/>
      <path d="M16 11 L19 20 L13 20 Z" fill="#1a0e05"/>
    </svg>
  ),
  openai: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill="#041a14"/>
      {/* OpenAI knot/swirl approximation */}
      <path
        d="M16 7 C20 7 23 9.5 23 13 C23 14.5 22.5 15.8 21.5 16.8 C23 17.5 24 19 24 20.5 C24 23.5 21.5 25.5 18 25.5 C16.5 25.5 15 25 14 24 C13 25 11.5 25.5 10 25.5 C7 25.5 5 23.5 5 20.5 C5 19 6 17.5 7.5 16.8 C6.5 15.8 6 14.5 6 13 C6 9.5 9 7 13 7 C13.8 7 14.9 7.2 16 7.5 C15.7 7.2 15.8 7 16 7Z"
        fill="none" stroke={color} strokeWidth="2" opacity="0.9"
      />
      <circle cx="16" cy="16" r="3" fill={color}/>
    </svg>
  ),
  custom_box: ({ color }) => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" rx="6" fill={color} opacity="0.15"/>
      <rect x="5" y="5" width="22" height="22" rx="3" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 2"/>
      <line x1="9" y1="13" x2="23" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9" y1="18" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const DefaultIcon = ({ color, iconText }) => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <rect width="32" height="32" rx="6" fill={color}/>
    <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">
      {iconText || '?'}
    </text>
  </svg>
);

const EDGE_TYPE_COLORS = {
  batch: '#94a3b8',
  streaming: '#3b82f6',
  api: '#a855f7',
  cdc: '#ef4444',
  event: '#f59e0b',
  sql: '#10b981',
};

function ComponentNode({ data, selected }) {
  const [hovered, setHovered] = useState(false);
  const component = COMPONENTS[data.componentType] || {};
  const category = getCategory(component.category);
  const IconComponent = ICON_MAP[data.componentType];

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 cursor-pointer select-none`}
      style={{
        width: 200,
        borderColor: selected ? category.color : hovered ? category.color + 'aa' : '#30363d',
        background: selected
          ? `linear-gradient(135deg, #1c2333, ${component.bg || '#1c2333'})`
          : `#1c2333`,
        boxShadow: selected
          ? `0 0 0 2px ${category.color}44, 0 8px 24px rgba(0,0,0,0.4)`
          : hovered
          ? `0 4px 16px rgba(0,0,0,0.3)`
          : `0 2px 8px rgba(0,0,0,0.2)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Category accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${category.color}, ${category.color}44)` }}
      />

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#30363d', border: `2px solid ${category.color}`, width: 10, height: 10, left: -6 }}
      />

      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
            {data.componentType === 'custom_box' ? (
              <div className="w-full h-full flex items-center justify-center text-xl"
                style={{ background: '#1c2333' }}>
                {data.iconEmoji || '🔲'}
              </div>
            ) : IconComponent ? (
              <IconComponent color={component.color || category.color} />
            ) : (
              <DefaultIcon color={component.color || category.color} iconText={component.iconText} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate">{data.label || component.label}</div>
            {data.componentType !== 'custom_box' && (
              <div className="text-xs font-medium mt-0.5" style={{ color: category.color }}>
                {category.label}
              </div>
            )}
          </div>
        </div>

        {data.notes && (
          <div className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2 border-t border-slate-700 pt-2">
            {data.notes}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#30363d', border: `2px solid ${category.color}`, width: 10, height: 10, right: -6 }}
      />
    </div>
  );
}

export default memo(ComponentNode);
