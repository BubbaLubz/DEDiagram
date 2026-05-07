import { useState } from 'react';
import {
  Save, FolderOpen, Trash2, AlignLeft, Download,
  Maximize, RotateCcw, Wand2, DollarSign,
} from 'lucide-react';
import useStore from '../store';

const EDGE_TYPES = [
  { value: 'batch',     label: 'Batch',     color: '#94a3b8' },
  { value: 'streaming', label: 'Streaming', color: '#3b82f6' },
  { value: 'api',       label: 'API',       color: '#a855f7' },
  { value: 'cdc',       label: 'CDC',       color: '#ef4444' },
  { value: 'event',     label: 'Event',     color: '#f59e0b' },
  { value: 'sql',       label: 'SQL',       color: '#10b981' },
];

export default function Toolbar({ onAutoLayout, onFitView }) {
  const {
    currentDiagramName, setDiagramName, isDirty,
    openSaveModal, openLoadModal, clearCanvas,
    selectedNode, edges, updateEdgeData, nodes, deleteSelected,
    openGenerateModal, toggleCostPanel, isCostPanelOpen,
  } = useStore();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentDiagramName);
  const [defaultEdgeType, setDefaultEdgeType] = useState('batch');

  const selectedEdges = edges.filter(e => e.selected);

  const handleNameSubmit = () => {
    setDiagramName(nameValue);
    setEditingName(false);
  };

  const handleEdgeTypeChange = (type) => {
    setDefaultEdgeType(type);
    selectedEdges.forEach(edge => {
      const edgeStyle = EDGE_TYPES.find(t => t.value === type);
      updateEdgeData(edge.id, { edgeType: type, label: edgeStyle?.label?.toLowerCase() || type });
    });
  };

  const handleExportJSON = () => {
    const { nodes, edges } = useStore.getState();
    const data = JSON.stringify({ name: currentDiagramName, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDiagramName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700 flex-shrink-0 flex-wrap"
      style={{ background: '#0d1117', minHeight: 48 }}
    >
      {/* Diagram name */}
      <div className="flex items-center gap-2 mr-1">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') setEditingName(false); }}
            className="text-sm font-semibold bg-slate-800 text-white border border-indigo-500 rounded px-2 py-0.5 outline-none"
            style={{ width: 200 }}
          />
        ) : (
          <button
            onClick={() => { setNameValue(currentDiagramName); setEditingName(true); }}
            className="text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 group"
          >
            {currentDiagramName}
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>}
            <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-slate-700"/>

      {/* AI Generate — primary CTA */}
      <button
        onClick={openGenerateModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white' }}
        title="Generate pipeline from a text description"
      >
        <Wand2 size={13}/>
        AI Generate
      </button>

      <div className="w-px h-5 bg-slate-700"/>

      {/* File actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={openSaveModal} title="Save (Ctrl+S)" icon={Save}/>
        <ToolbarButton onClick={openLoadModal} title="Open saved" icon={FolderOpen}/>
        <ToolbarButton onClick={handleExportJSON} title="Export JSON" icon={Download}/>
      </div>

      <div className="w-px h-5 bg-slate-700"/>

      {/* Layout + View */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={onAutoLayout} title="Auto-layout left→right" icon={AlignLeft} label="Auto Layout"/>
        <ToolbarButton onClick={onFitView} title="Fit all to view" icon={Maximize}/>
      </div>

      <div className="w-px h-5 bg-slate-700"/>

      {/* Edge type selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 whitespace-nowrap">Edge:</span>
        <div className="flex items-center gap-0.5">
          {EDGE_TYPES.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => handleEdgeTypeChange(value)}
              title={`${label} connection${selectedEdges.length > 0 ? ' — apply to selected edge' : ''}`}
              className={`text-xs px-1.5 py-1 rounded transition-all ${
                defaultEdgeType === value ? 'font-semibold' : 'opacity-40 hover:opacity-70'
              }`}
              style={{
                color,
                background: defaultEdgeType === value ? color + '22' : 'transparent',
                border: `1px solid ${defaultEdgeType === value ? color + '66' : 'transparent'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1"/>

      {/* Cost estimator toggle */}
      <button
        onClick={toggleCostPanel}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
          isCostPanelOpen
            ? 'text-emerald-300 bg-emerald-900/30 border border-emerald-700'
            : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-900/20 border border-transparent'
        }`}
        title="Estimate monthly cloud costs for this pipeline"
      >
        <DollarSign size={13}/>
        Cost Estimator
      </button>

      <div className="w-px h-5 bg-slate-700"/>

      {/* Destructive actions */}
      {(selectedNode || nodes.some(n => n.selected)) && (
        <ToolbarButton onClick={deleteSelected} title="Delete selected (Delete key)" icon={Trash2} danger/>
      )}
      <ToolbarButton onClick={clearCanvas} title="Clear canvas" icon={RotateCcw} danger/>
    </div>
  );
}

function ToolbarButton({ onClick, title, icon: Icon, label, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        danger
          ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
      }`}
    >
      <Icon size={13}/>
      {label && <span>{label}</span>}
    </button>
  );
}
