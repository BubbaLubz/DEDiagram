import { useState } from 'react';
import { Package, Layout, BookOpen, Trash2, FolderOpen, Clock } from 'lucide-react';
import { getComponentsByCategory } from '../data/componentLibrary';
import { BUILT_IN_TEMPLATES } from '../data/templates';
import useStore from '../store';

const TABS = [
  { id: 'components', label: 'Components', icon: Package },
  { id: 'templates', label: 'Templates', icon: Layout },
  { id: 'saved', label: 'Saved', icon: BookOpen },
];

function DraggableComponent({ comp }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/de-component', JSON.stringify({ componentType: comp.type, label: comp.label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-slate-700/50 group border border-transparent hover:border-slate-600"
    >
      <div
        className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-sm"
        style={{ background: comp.bg || '#1c2333', border: `1px solid ${comp.color}44` }}
      >
        {comp.iconEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{comp.label}</div>
        <div className="text-xs text-slate-500 truncate">{comp.tagline}</div>
      </div>
    </div>
  );
}

function ComponentsTab() {
  const [expanded, setExpanded] = useState(new Set(['source', 'streaming', 'processing']));
  const categories = getComponentsByCategory().filter(cat => cat.id !== 'custom');

  const toggle = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="overflow-y-auto flex-1 pb-4">
      {/* Pinned custom box */}
      <div className="px-2 pt-2 pb-1 border-b border-slate-700/60 mb-1">
        <DraggableComponent comp={{
          type: 'custom_box', label: 'Custom Box', tagline: 'Blank box — name & describe freely',
          color: '#64748b', bg: '#1c2333', iconEmoji: '🔲',
        }}/>
      </div>
      <p className="text-xs text-slate-500 px-4 pt-2 pb-2">Drag components onto the canvas</p>
      {categories.map(cat => (
        <div key={cat.id} className="mb-1">
          <button
            onClick={() => toggle(cat.id)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cat.color }}/>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
              <span className="text-xs text-slate-600">({cat.components.length})</span>
            </div>
            <svg
              className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${expanded.has(cat.id) ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {expanded.has(cat.id) && (
            <div className="px-2 pb-1">
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
  const { loadTemplate } = useStore();

  return (
    <div className="overflow-y-auto flex-1 p-3 space-y-3">
      <p className="text-xs text-slate-500 px-1 pb-1">Click to load a starter architecture</p>
      {BUILT_IN_TEMPLATES.map(tpl => (
        <div
          key={tpl.id}
          onClick={() => loadTemplate(tpl)}
          className="rounded-xl border border-slate-700 p-3.5 cursor-pointer hover:border-slate-500 transition-all duration-200 group hover:bg-slate-700/20"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-3 h-full min-h-10 rounded-full flex-shrink-0"
              style={{ background: tpl.color, width: 4, marginTop: 2 }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">{tpl.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: tpl.color + '22', color: tpl.color }}>
                  {tpl.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tpl.description}</p>
              <p className="text-xs text-slate-600 mt-1.5">{tpl.nodes.length} components · {tpl.edges.length} connections</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedTab() {
  const { savedDiagrams, loadDiagram, deleteDiagram, fetchSavedDiagrams } = useStore();
  const [loading, setLoading] = useState(false);

  const handleLoad = async (id) => {
    try { await loadDiagram(id); } catch {}
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <FolderOpen size={32} className="text-slate-600 mb-3"/>
        <p className="text-sm text-slate-500 mb-1">No saved diagrams yet</p>
        <p className="text-xs text-slate-600">Use Save (Ctrl+S) to save your work</p>
        <button onClick={handleRefresh} className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-xs text-slate-500">{savedDiagrams.length} diagram{savedDiagrams.length !== 1 ? 's' : ''} saved</p>
        <button onClick={handleRefresh} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      {savedDiagrams.map(d => (
        <div
          key={d.id}
          onClick={() => handleLoad(d.id)}
          className="rounded-xl border border-slate-700 p-3 cursor-pointer hover:border-slate-500 transition-all group hover:bg-slate-700/20"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{d.name}</h3>
                {d.isTemplate && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-400 border border-purple-700 flex-shrink-0">template</span>
                )}
              </div>
              {d.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.description}</p>}
              <div className="flex items-center gap-1 mt-1.5">
                <Clock size={10} className="text-slate-600"/>
                <span className="text-xs text-slate-600">{new Date(d.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, d.id)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 size={12}/>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeftSidebar() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="h-full flex flex-col border-r border-slate-700" style={{ width: 280, background: '#161b22' }}>
      {/* Logo */}
      <div className="px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white">
              <path d="M3 4h4v3H3zm5 0h4v3H8zm5 0h4v3h-4zM3 10h4v3H3zm10 0h4v3h-4zM8 13h4v4H8z"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-white">DE Diagrams</span>
            <p className="text-xs text-slate-500" style={{ lineHeight: 1 }}>Pipeline Visualizer</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Icon size={14}/>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'components' && <ComponentsTab/>}
        {activeTab === 'templates' && <TemplatesTab/>}
        {activeTab === 'saved' && <SavedTab/>}
      </div>
    </div>
  );
}
