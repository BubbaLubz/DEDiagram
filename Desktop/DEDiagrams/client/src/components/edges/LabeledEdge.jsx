import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const EDGE_STYLES = {
  batch:     { color: '#94a3b8', strokeDasharray: 'none', animated: false, label: 'batch' },
  streaming: { color: '#3b82f6', strokeDasharray: '8 4',  animated: true,  label: 'stream' },
  api:       { color: '#a855f7', strokeDasharray: '3 3',  animated: false, label: 'API' },
  cdc:       { color: '#ef4444', strokeDasharray: '6 3',  animated: true,  label: 'CDC' },
  event:     { color: '#f59e0b', strokeDasharray: '8 3',  animated: true,  label: 'event' },
  sql:       { color: '#10b981', strokeDasharray: 'none', animated: false, label: 'SQL' },
};

const DEFAULT_MARKER = 'url(#react-flow__arrowclosed)';

function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected, markerEnd,
}) {
  const resolvedMarker = markerEnd || DEFAULT_MARKER;
  const edgeType = data?.edgeType || 'batch';
  const style = EDGE_STYLES[edgeType] || EDGE_STYLES.batch;
  const label = data?.label || style.label;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={resolvedMarker}
        style={{
          stroke: selected ? '#fff' : style.color,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: style.strokeDasharray,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          filter: selected ? `drop-shadow(0 0 4px ${style.color})` : 'none',
        }}
        className={style.animated ? 'animated-edge' : ''}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full border"
            style={{
              background: '#0d1117',
              color: style.color,
              borderColor: style.color + '66',
              fontSize: '10px',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 8px ${style.color}22`,
            }}
          >
            {label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(LabeledEdge);
