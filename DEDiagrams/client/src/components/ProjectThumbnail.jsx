import { COMPONENTS } from '../data/componentLibrary';

// Nominal node footprint used for layout — doesn't need to match the canvas
// pixel-for-pixel, just enough to keep proportions sane in a small preview.
const NODE_W = 200;
const NODE_H = 70;

export default function ProjectThumbnail({ nodes = [], edges = [], width = 220, height = 120, background = 'transparent' }) {
  if (!nodes.length) {
    return (
      <div style={{
        width, height, background,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#9C8F7C' }}>Empty diagram</span>
      </div>
    );
  }

  const xs = nodes.map(n => n.position?.x ?? 0);
  const ys = nodes.map(n => n.position?.y ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs) + NODE_W;
  const maxY = Math.max(...ys) + NODE_H;
  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);

  const pad = 8;
  const scale = Math.min((width - pad * 2) / contentW, (height - pad * 2) / contentH, 1);
  const offsetX = (width - contentW * scale) / 2;
  const offsetY = (height - contentH * scale) / 2;

  const project = (x, y) => [
    offsetX + (x - minX) * scale,
    offsetY + (y - minY) * scale,
  ];

  const byId = new Map(nodes.map(n => [n.id, n]));

  return (
    <svg width={width} height={height} style={{ display: 'block', background }}>
      {edges.map((e, i) => {
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        if (!s || !t) return null;
        const [x1, y1] = project((s.position?.x ?? 0) + NODE_W / 2, (s.position?.y ?? 0) + NODE_H / 2);
        const [x2, y2] = project((t.position?.x ?? 0) + NODE_W / 2, (t.position?.y ?? 0) + NODE_H / 2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6E6355" strokeWidth={1}/>;
      })}
      {nodes.map(n => {
        const [x, y] = project(n.position?.x ?? 0, n.position?.y ?? 0);
        const w = Math.max(NODE_W * scale, 3);
        const h = Math.max(NODE_H * scale, 3);
        const color = COMPONENTS[n.componentType]?.color || '#9C8F7C';
        return <rect key={n.id} x={x} y={y} width={w} height={h} rx={2} fill={color} opacity={0.85}/>;
      })}
    </svg>
  );
}
