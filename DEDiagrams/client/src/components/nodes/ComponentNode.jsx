import { memo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Table2, ChevronRight } from 'lucide-react';
import { Handle, Position } from 'reactflow';
import { COMPONENTS, getCategory } from '../../data/componentLibrary';
import useStore from '../../store';
import { useNodeSelections } from '../../collab/SelectionPresenceContext';

const DefaultIcon = ({ color, iconText }) => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <rect width="32" height="32" rx="6" fill={color}/>
    <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">
      {iconText || '?'}
    </text>
  </svg>
);

const CustomBoxIcon = ({ color }) => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <rect width="32" height="32" rx="6" fill={color} opacity="0.15"/>
    <rect x="5" y="5" width="22" height="22" rx="3" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 2"/>
    <line x1="9" y1="13" x2="23" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="9" y1="18" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

function ComponentNode({ id, data, selected }) {
  const [hovered, setHovered] = useState(false);
  const component = COMPONENTS[data.componentType] || {};
  const category = getCategory(component.category);
  const openErdWorkspace = useStore(s => s.openErdWorkspace);
  const tableCount = data.schema?.tables?.length || 0;
  const hasSchema = tableCount > 0;

  // Pulses when this node is the one described by the doc panel's active cell.
  const isDocActive = useStore(s => s.docCells.find(c => c.id === s.activeCellId)?.nodeIds?.includes(id) ?? false);

  // Other collaborators currently selecting this node (live presence, not
  // persisted). The ring is always shown; the name label only on hover.
  const otherSelections = useNodeSelections(id);
  const primaryOther = otherSelections[0];

  const isCustomBox = data.componentType === 'custom_box';
  const LucideIcon = !isCustomBox && component.lucideIcon
    ? LucideIcons[component.lucideIcon]
    : null;

  const ownShadow = isDocActive ? undefined : selected
    ? `0 0 0 2px ${category.color}44, 0 8px 24px rgba(23,19,16,0.55)`
    : hovered
    ? `0 4px 16px rgba(23,19,16,0.45)`
    : `0 2px 8px rgba(23,19,16,0.35)`;

  return (
    <div
      className={`relative rounded-lg border-2 transition-all duration-200 cursor-pointer select-none ${isDocActive ? 'doc-cell-active-node' : ''}`}
      style={{
        width: 200,
        borderColor: selected ? category.color : hovered ? category.color + 'aa' : '#4A3B2C',
        background: '#2A2119',
        boxShadow: [ownShadow, primaryOther && `0 0 0 3px ${primaryOther.color}`].filter(Boolean).join(', ') || undefined,
        ...(isDocActive ? { '--doc-pulse-color': `${category.color}90` } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && primaryOther && (
        <div
          style={{
            position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
            background: primaryOther.color, color: '#241F19', fontSize: 11, fontWeight: 600,
            padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.35)', zIndex: 20,
          }}
        >
          {otherSelections.map(s => s.name).join(', ')}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#4A3B2C', border: `2px solid ${category.color}`, width: 10, height: 10, left: -6 }}
      />

      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="w-full h-full rounded-lg overflow-hidden shadow-md">
              {isCustomBox ? (
                data.iconEmoji ? (
                  <div className="w-full h-full flex items-center justify-center text-xl"
                    style={{ background: '#2A2119' }}>
                    {data.iconEmoji}
                  </div>
                ) : (
                  <CustomBoxIcon color={component.color || category.color} />
                )
              ) : component.logo ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg p-1.5" style={{ background: '#fff' }}>
                  <img src={component.logo} alt={component.label} className="w-full h-full object-contain" />
                </div>
              ) : LucideIcon ? (
                <div
                  className="w-full h-full flex items-center justify-center rounded-lg"
                  style={{ background: component.color || category.color }}
                >
                  <LucideIcon size={18} color="white" strokeWidth={2} />
                </div>
              ) : (
                <DefaultIcon color={component.color || category.color} iconText={component.iconText} />
              )}
            </div>

            {/* Schema badge — dashed "+" when no schema is attached yet, filled
                when one is, either way opening the ERD workspace for this node. */}
            <button
              className="nodrag nopan"
              onClick={(e) => { e.stopPropagation(); openErdWorkspace(id); }}
              title={hasSchema ? `Open ERD — ${tableCount} table${tableCount === 1 ? '' : 's'}` : 'Add a schema'}
              style={{
                position: 'absolute', right: -6, bottom: -6, width: 20, height: 20, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: hasSchema ? '#E3A854' : '#2A2119',
                border: hasSchema ? '2px solid #2A2119' : '1.5px dashed #6E6355',
                padding: 0,
              }}
            >
              {hasSchema
                ? <Table2 size={11} color="#1C1815" strokeWidth={2.5} />
                : <Plus size={11} color="#9C8F7C" strokeWidth={2.5} />}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#E8DFD0' }}>{data.label || component.label}</div>
            {!isCustomBox && (
              <div className="text-xs font-medium mt-0.5" style={{ color: category.color }}>
                {category.label}
              </div>
            )}
          </div>
        </div>

        {hasSchema && (
          <div
            className="nodrag nopan flex items-center justify-between mt-2 pt-2 cursor-pointer"
            style={{ borderTop: '1px solid #4A3B2C' }}
            onClick={(e) => { e.stopPropagation(); openErdWorkspace(id); }}
          >
            <div className="flex items-center gap-1.5">
              <Table2 size={12} color="#E3A854" strokeWidth={2.5} />
              <span className="text-xs" style={{ color: '#E8DFD0' }}>{tableCount} table{tableCount === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center gap-0.5 text-xs" style={{ color: '#E3A854', fontSize: 10 }}>
              Open ERD
              <ChevronRight size={10} color="#E3A854" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {data.notes && (
          <div className="mt-2 text-xs leading-relaxed line-clamp-2 pt-2" style={{ color: '#9C8F7C', borderTop: hasSchema ? 'none' : '1px solid #4A3B2C' }}>
            {data.notes}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#4A3B2C', border: `2px solid ${category.color}`, width: 10, height: 10, right: -6 }}
      />
    </div>
  );
}

export default memo(ComponentNode);
