import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge, Position } from 'reactflow';
import { Zap, Pencil } from 'lucide-react';
import useStore from '../../../store';

// Fixed, semantic palette — no free-form per-connection color (see project
// convention: relationship kind determines color, not user choice).
const CARDINALITY_COLOR = {
  '1:N': '#5C7A4A',
  '1:1': '#5B7A8C',
};

// Short, discreet crow's-foot marks: a single tick for the "one" end, a small
// three-pronged fork for the "many" end — both anchored exactly on the
// column row they describe, not just the table card's edge.
const TICK_OFFSET = 8;
const TICK_HALF = 5;
const FOOT_DEPTH = 5;
const FOOT_HALF = 5;

function OneTick({ x, y, position, color }) {
  const dx = position === Position.Right ? TICK_OFFSET : -TICK_OFFSET;
  const tx = x + dx;
  return <line x1={tx} y1={y - TICK_HALF} x2={tx} y2={y + TICK_HALF} stroke={color} strokeWidth={2} />;
}

function CrowsFoot({ x, y, position, color }) {
  const dx = position === Position.Left ? -FOOT_DEPTH : FOOT_DEPTH;
  const bx = x + dx;
  return (
    <path
      d={`M ${bx} ${y - FOOT_HALF} L ${x} ${y} L ${bx} ${y + FOOT_HALF} M ${x} ${y} L ${bx} ${y}`}
      stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
    />
  );
}

function RelationshipEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }) {
  const toggleRelationshipOverride = useStore(s => s.toggleRelationshipOverride);
  const { relationship, nodeId } = data;
  const color = CARDINALITY_COLOR[relationship.cardinality] || CARDINALITY_COLOR['1:N'];

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const [oneLabel, manyLabel] = relationship.cardinality.split(':');

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ stroke: selected ? '#fff' : color, strokeWidth: selected ? 2.5 : 2, transition: 'stroke 0.2s' }}
      />
      <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
        <OneTick x={sourceX} y={sourceY} position={sourcePosition} color={color} />
        <circle cx={sourceX} cy={sourceY} r={3.5} fill={color} />
        {relationship.cardinality === '1:N' ? (
          <CrowsFoot x={targetX} y={targetY} position={targetPosition} color={color} />
        ) : (
          <OneTick x={targetX} y={targetY} position={targetPosition} color={color} />
        )}
        <circle cx={targetX} cy={targetY} r={3.5} fill={color} />
      </svg>

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          onClick={() => toggleRelationshipOverride(nodeId, relationship)}
          title={relationship.autoDetected ? 'Auto-detected from the foreign key — click to override' : 'Manually set — click to cycle, or revert to auto-detect'}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#171310', color, border: `1px solid ${color}66`, borderRadius: 999,
            fontSize: 10, letterSpacing: '0.02em', padding: '2px 8px 2px 6px',
            boxShadow: `0 0 8px ${color}22`, whiteSpace: 'nowrap',
          }}
        >
          {relationship.autoDetected
            ? <Zap size={9} fill="#E3A854" stroke="none" />
            : <Pencil size={9} color={color} />}
          {oneLabel} — {manyLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
