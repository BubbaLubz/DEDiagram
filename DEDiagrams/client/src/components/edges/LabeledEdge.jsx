import { memo, useState, useRef, useEffect } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import useStore from '../../store';

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
  const updateEdgeData = useStore(s => s.updateEdgeData);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const resolvedMarker = markerEnd || DEFAULT_MARKER;
  const edgeType = data?.edgeType || 'batch';
  const style = EDGE_STYLES[edgeType] || EDGE_STYLES.batch;
  const label = data?.label || style.label;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditValue(label);
    setEditing(true);
  };

  const handleCommit = () => {
    const trimmed = editValue.trim();
    if (trimmed) updateEdgeData(id, { label: trimmed });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') setEditing(false);
    e.stopPropagation();
  };

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
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              size={Math.max(editValue.length, 4)}
              style={{
                background: '#0d1117',
                color: style.color,
                border: `1px solid ${style.color}`,
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.02em',
                padding: '2px 6px',
                outline: 'none',
                boxShadow: `0 0 8px ${style.color}44`,
                minWidth: '32px',
                textAlign: 'center',
              }}
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              title="Double-click to edit"
              className="text-xs font-medium px-1.5 py-0.5 rounded-full border cursor-text"
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
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(LabeledEdge);
