import { useOthersMapped } from '../../collaboration/liveblocks.config';
import { useReactFlow } from 'reactflow';

/**
 * Renders colored cursor indicators for all other users on the canvas.
 * Uses Liveblocks awareness `cursor` field (canvas coordinates, not screen).
 * Must be rendered inside DiagramCanvas as an overlay.
 */
export default function RemoteCursors() {
  let others;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    others = useOthersMapped(other => ({
      cursor: other.presence.cursor,
      name: other.info?.name ?? 'Someone',
      color: other.info?.color ?? '#58a6ff',
    }));
  } catch {
    return null;
  }

  const { getViewport } = useReactFlow();
  const { x: vx, y: vy, zoom } = getViewport();

  return (
    <>
      {others.map(([id, { cursor, name, color }]) => {
        if (!cursor) return null;
        const screenX = cursor.x * zoom + vx;
        const screenY = cursor.y * zoom + vy;
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'translate(-2px, -2px)',
            }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
              <path d="M2 2l12 8-6 1-3 6L2 2z" fill={color} stroke="white" strokeWidth="1"/>
            </svg>
            <div
              style={{
                background: color,
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '0 6px 6px 6px',
                marginTop: -2,
                marginLeft: 14,
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </>
  );
}
