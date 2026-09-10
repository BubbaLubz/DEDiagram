import { useState } from 'react';
import { Package, Layout, BookOpen, Trash2, FolderOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getComponentsByCategory } from '../data/componentLibrary';
import { BUILT_IN_TEMPLATES } from '../data/templates';
import useStore from '../store';
import { useTheme } from '../theme';

const TABS = [
  { id: 'components', label: 'Components', icon: Package },
  { id: 'templates',  label: 'Templates',  icon: Layout   },
  { id: 'saved',      label: 'Saved',      icon: BookOpen },
];

function DraggableComponent({ comp }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleDragStart = (e) => {
    setPressed(false);
    e.dataTransfer.setData('application/de-component', JSON.stringify({ componentType: comp.type, label: comp.label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 12px', cursor: 'grab', borderRadius: 4,
        background: hover ? P.hover : 'transparent',
        border: `1px solid ${hover ? P.divider : 'transparent'}`,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s, background 0.12s, border-color 0.12s',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        background: comp.logo ? '#fff' : (comp.bg || P.surface),
        border: `1px solid ${comp.color ? comp.color + '44' : P.divider}`,
        padding: comp.logo ? 4 : 0,
      }}>
        {comp.logo ? (
          <img src={comp.logo} alt={comp.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : comp.iconEmoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {comp.label}
        </div>
        <div style={{ fontSize: 11, color: P.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {comp.tagline}
        </div>
      </div>
    </div>
  );
}

function ComponentsTab() {
  const P = useTheme();
  const [expanded, setExpanded] = useState(new Set(['source', 'streaming', 'processing']));
  const categories = getComponentsByCategory().filter(cat => cat.id !== 'custom');

  const toggle = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
      <div style={{ padding: '8px 8px 6px', borderBottom: `1px solid ${P.divider}`, marginBottom: 4 }}>
        <DraggableComponent comp={{
          type: 'custom_box', label: 'Custom Box', tagline: 'Blank box — name & describe freely',
          color: '#8A8275', bg: P.surface, iconEmoji: '🔲',
        }}/>
      </div>
      <p style={{ fontSize: 11, color: P.faint, padding: '8px 16px 6px' }}>Drag components onto the canvas</p>
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 2 }}>
          <button
            onClick={() => toggle(cat.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 16px', background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 0.1s, transform 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = P.hover}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }}/>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: cat.color }}>
                {cat.label}
              </span>
              <span style={{ fontSize: 11, color: P.faint }}>({cat.components.length})</span>
            </div>
            <svg
              style={{
                width: 12, height: 12, color: P.faint,
                transform: expanded.has(cat.id) ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {expanded.has(cat.id) && (
            <div style={{ padding: '0 8px 4px' }}>
              {cat.components.map(comp => (
                <DraggableComponent key={comp.type} comp={comp}/>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TemplatesTab() {
  const P = useTheme();
  const { requestCanvasReplace, loadTemplate } = useStore();

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 11, color: P.faint, padding: '0 4px 4px' }}>Click to load a starter architecture</p>
      {BUILT_IN_TEMPLATES.map(tpl => (
        <TemplateCard key={tpl.id} tpl={tpl} onLoad={() => requestCanvasReplace(tpl.name, () => loadTemplate(tpl))}/>
      ))}
    </div>
  );
}

function TemplateCard({ tpl, onLoad }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={onLoad}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        border: `1px solid ${hover ? tpl.color + '66' : P.divider}`,
        padding: '12px 14px', cursor: 'pointer',
        background: hover ? P.hover : P.surface,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s, background 0.15s, border-color 0.15s', borderRadius: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: P.text }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: tpl.color, flexShrink: 0 }}/>
          {tpl.name}
        </h3>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 2, flexShrink: 0,
          background: tpl.color + '22', color: tpl.color, fontWeight: 500,
        }}>
          {tpl.category}
        </span>
      </div>
      <p style={{ fontSize: 12, color: P.muted, lineHeight: 1.5, marginBottom: 6 }}>{tpl.description}</p>
      <p style={{ fontSize: 11, color: P.faint }}>{tpl.nodes.length} components · {tpl.edges.length} connections</p>
    </div>
  );
}

function SavedTab() {
  const P = useTheme();
  const { savedDiagrams, loadDiagram, deleteDiagram, fetchSavedDiagrams, requestCanvasReplace } = useStore();
  const [loading, setLoading] = useState(false);

  const handleLoad = (d) => {
    requestCanvasReplace(d.name, async () => {
      try { await loadDiagram(d.id); } catch {}
    });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this diagram?')) return;
    try { await deleteDiagram(id); } catch {}
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchSavedDiagrams();
    setLoading(false);
  };

  if (savedDiagrams.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <FolderOpen size={32} style={{ color: P.faint, marginBottom: 12 }}/>
        <p style={{ fontSize: 13, color: P.muted, marginBottom: 4 }}>No saved diagrams yet</p>
        <p style={{ fontSize: 12, color: P.faint }}>Use Save (Ctrl+S) to save your work</p>
        <button
          onClick={handleRefresh}
          style={{ marginTop: 16, fontSize: 12, color: P.muted, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px' }}>
        <p style={{ fontSize: 11, color: P.faint }}>{savedDiagrams.length} diagram{savedDiagrams.length !== 1 ? 's' : ''} saved</p>
        <button
          onClick={handleRefresh}
          style={{ fontSize: 11, color: P.muted, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>
      {savedDiagrams.map(d => <SavedCard key={d.id} d={d} onLoad={() => handleLoad(d)} onDelete={(e) => handleDelete(e, d.id)}/>)}
    </div>
  );
}

function SavedCard({ d, onLoad, onDelete }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={onLoad}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        border: `1px solid ${hover ? P.amber + '66' : P.divider}`,
        padding: '10px 12px', cursor: 'pointer', borderRadius: 3,
        background: hover ? P.hover : P.surface,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s, background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <h3 style={{ fontSize: 13, fontWeight: 500, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.name}
            </h3>
            {d.isTemplate && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, background: P.amber + '22', color: P.amber, flexShrink: 0 }}>
                template
              </span>
            )}
          </div>
          {d.description && (
            <p style={{ fontSize: 12, color: P.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
              {d.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} style={{ color: P.faint }}/>
            <span style={{ fontSize: 11, color: P.faint }}>
              {new Date(d.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          style={{
            padding: 6, borderRadius: 3, border: 'none', cursor: 'pointer',
            opacity: hover ? 1 : 0, background: 'none',
            color: P.danger, transition: 'opacity 0.15s',
          }}
        >
          <Trash2 size={12}/>
        </button>
      </div>
    </div>
  );
}

function SidebarTabButton({ id, label, Icon, activeTab, setActiveTab, P }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={() => setActiveTab(id)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '9px 4px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
        background: 'none', border: 'none',
        borderBottom: `2px solid ${activeTab === id ? P.amber : 'transparent'}`,
        color: activeTab === id ? P.amber : P.muted,
        transform: pressed ? 'scale(0.94)' : 'scale(1)',
        transition: 'transform 0.1s, color 0.15s, border-color 0.15s',
      }}
    >
      <Icon size={13}/>
      {label}
    </button>
  );
}

export default function LeftSidebar() {
  const P = useTheme();
  const { activeTab, setActiveTab } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const toggleBtn = (onClick, icon) => (
    <button
      onClick={onClick}
      style={{
        padding: 5, borderRadius: 4, border: 'none', background: 'none',
        cursor: 'pointer', color: P.faint, flexShrink: 0, display: 'flex', alignItems: 'center',
        transition: 'color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = P.text}
      onMouseLeave={e => e.currentTarget.style.color = P.faint}
    >
      {icon}
    </button>
  );

  if (collapsed) {
    return (
      <div style={{ width: 40, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: P.bg, borderRight: `1px solid ${P.divider}`, flexShrink: 0, paddingTop: 10 }}>
        {toggleBtn(() => setCollapsed(false), <ChevronRight size={15}/>)}
      </div>
    );
  }

  return (
    <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column', background: P.bg, borderRight: `1px solid ${P.divider}`, flexShrink: 0 }}>
      {/* Logo + collapse */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${P.divider}`, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: P.text }}>
          <span style={{ color: P.amber }}>DE</span>Diagram
        </span>
        {toggleBtn(() => setCollapsed(true), <ChevronLeft size={15}/>)}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${P.divider}`, flexShrink: 0 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <SidebarTabButton key={id} id={id} label={label} Icon={Icon} activeTab={activeTab} setActiveTab={setActiveTab} P={P}/>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'components' && <ComponentsTab/>}
        {activeTab === 'templates'  && <TemplatesTab/>}
        {activeTab === 'saved'      && <SavedTab/>}
      </div>
    </div>
  );
}
