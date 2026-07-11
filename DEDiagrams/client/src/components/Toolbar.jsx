import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, FolderOpen, Trash2, AlignLeft, Download,
  Maximize, RotateCcw, Wand2, DollarSign, Image, Upload,
  Pencil, Eraser, Undo2, ArrowLeft, Users,
} from 'lucide-react';
import useStore from '../store';
import { useCanvasActions } from '../context/CanvasActionsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';

const EDGE_TYPES = [
  { value: 'batch',     label: 'Batch',     color: '#8A8275' },
  { value: 'streaming', label: 'Streaming', color: '#5B7A8C' },
  { value: 'api',       label: 'API',       color: '#7D6088' },
  { value: 'cdc',       label: 'CDC',       color: '#A3502B' },
  { value: 'event',     label: 'Event',     color: '#C99A3E' },
  { value: 'sql',       label: 'SQL',       color: '#5C7A4A' },
];

export default function Toolbar() {
  const { autoLayout, fitView, exportImage } = useCanvasActions();
  const {
    currentDiagramName, setDiagramName, isDirty,
    openSaveModal, openLoadModal,
    selectedNode, edges, updateEdgeData, nodes, deleteSelected,
    openGenerateModal, toggleCostPanel, isCostPanelOpen,
    requestLoadTemplate,
    isDrawingMode, toggleDrawingMode, drawTool, setDrawTool, penColor, setPenColor,
    penWidth, setPenWidth, eraserSize, setEraserSize, undoLastStroke, clearDrawing, drawingStrokes,
    openAccountSettings, openShareModal, currentDiagramId,
  } = useStore();

  const P = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
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

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.nodes)) throw new Error('Missing nodes array');
        requestLoadTemplate({ name: data.name || file.name.replace(/\.json$/i, ''), nodes: data.nodes, edges: data.edges || [], docCells: data.docCells || [] });
      } catch {
        alert('Could not import: file is not a valid diagram JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJSON = () => {
    const { nodes, edges, docCells } = useStore.getState();
    const data = JSON.stringify({ name: currentDiagramName, nodes, edges, docCells }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDiagramName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 14px', height: 48, flexShrink: 0,
      background: P.bg, borderBottom: `1px solid ${P.divider}`,
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>

      {/* Back to projects */}
      <button
        onClick={() => {
          if (!isDirty || confirm('Leave without saving? Unsaved changes will be lost.')) navigate('/projects');
        }}
        title="Back to projects"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 4, border: 'none', background: 'none',
          color: P.muted, cursor: 'pointer', flexShrink: 0,
        }}
      >
        <ArrowLeft size={15}/>
      </button>

      <Sep/>

      {/* Diagram name */}
      <div style={{ display: 'flex', alignItems: 'center', marginRight: 2 }}>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setEditingName(false);
            }}
            style={{
              fontSize: 13, fontWeight: 600, width: 200,
              background: P.surface, color: P.text,
              border: `1.5px solid ${P.amber}`, borderRadius: 3,
              padding: '2px 8px', outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={() => { setNameValue(currentDiagramName); setEditingName(true); }}
            style={{
              fontSize: 13, fontWeight: 600, color: P.text,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px',
            }}
          >
            {currentDiagramName}
            {isDirty && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.amber, flexShrink: 0 }}/>
            )}
          </button>
        )}
      </div>

      <Sep/>

      {/* AI Generate — primary CTA */}
      <AIGenBtn onClick={openGenerateModal}/>

      <Sep/>

      <TBtn
        onClick={openShareModal}
        title={currentDiagramId ? 'Share with other users' : 'Save this diagram first to share it'}
        Icon={Users}
        label="Share"
        disabled={!currentDiagramId}
      />

      <Sep/>

      {/* File actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON}/>
        <TBtn onClick={openSaveModal} title="Save (Ctrl+S)" Icon={Save}/>
        <TBtn onClick={openLoadModal} title="Open saved" Icon={FolderOpen}/>
        <TBtn onClick={() => fileInputRef.current?.click()} title="Import JSON" Icon={Upload}/>
        <TBtn onClick={handleExportJSON} title="Export JSON" Icon={Download}/>
        <TBtn onClick={exportImage} title="Export PNG" Icon={Image}/>
      </div>

      <Sep/>

      {/* Layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TBtn onClick={autoLayout} title="Auto-layout left→right" Icon={AlignLeft} label="Auto Layout"/>
        <TBtn onClick={fitView} title="Fit all to view" Icon={Maximize}/>
      </div>

      <Sep/>

      {/* Pen tool */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PenToggleBtn active={isDrawingMode} onClick={toggleDrawingMode}/>
        {isDrawingMode && (
          <>
            {/* Pen vs eraser */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SubToolBtn active={drawTool === 'pen'} onClick={() => setDrawTool('pen')} title="Pen" Icon={Pencil}/>
              <SubToolBtn active={drawTool === 'eraser'} onClick={() => setDrawTool('eraser')} title="Eraser" Icon={Eraser}/>
            </div>

            {drawTool === 'pen' ? (
              <>
                {/* Color swatch + hex input */}
                <label style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Pick color">
                  <div style={{
                    width: 18, height: 18, borderRadius: 3, background: penColor,
                    border: `1.5px solid ${P.divider}`, flexShrink: 0, cursor: 'pointer',
                  }}/>
                  <input
                    type="color"
                    value={penColor}
                    onChange={e => setPenColor(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                  />
                </label>
                <input
                  type="text"
                  value={penColor}
                  onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setPenColor(e.target.value); }}
                  style={{
                    width: 72, fontSize: 11, fontFamily: 'monospace',
                    background: P.input, border: `1px solid ${P.divider}`, borderRadius: 3,
                    padding: '2px 6px', color: P.text, outline: 'none', letterSpacing: '0.04em',
                  }}
                />
                {/* Width dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {[2, 4, 7].map(w => (
                    <button
                      key={w}
                      onClick={() => setPenWidth(w)}
                      title={`Stroke width ${w}`}
                      style={{
                        width: 20, height: 20, borderRadius: 3, border: `1px solid ${penWidth === w ? P.amber + '88' : P.divider}`,
                        background: penWidth === w ? P.amber + '18' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <div style={{ width: w + 2, height: w + 2, borderRadius: '50%', background: penWidth === w ? P.amber : P.faint }}/>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Eraser size dots */
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[12, 20, 32].map(sz => (
                  <button
                    key={sz}
                    onClick={() => setEraserSize(sz)}
                    title={`Eraser size ${sz}`}
                    style={{
                      width: 20, height: 20, borderRadius: 3, border: `1px solid ${eraserSize === sz ? P.amber + '88' : P.divider}`,
                      background: eraserSize === sz ? P.amber + '18' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{
                      width: sz / 3, height: sz / 3, borderRadius: '50%',
                      border: `1.5px solid ${eraserSize === sz ? P.amber : P.faint}`,
                    }}/>
                  </button>
                ))}
              </div>
            )}

            {drawingStrokes.length > 0 && (
              <>
                <TBtn onClick={undoLastStroke} title="Undo last stroke" Icon={Undo2}/>
                <TBtn onClick={clearDrawing} title="Clear all drawing" Icon={RotateCcw}/>
              </>
            )}
          </>
        )}
      </div>

      <Sep/>

      {/* Edge type selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: P.faint, whiteSpace: 'nowrap' }}>Edge:</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {EDGE_TYPES.map(({ value, label, color }) => (
            <EdgeTypeBtn
              key={value}
              active={defaultEdgeType === value}
              color={color}
              label={label}
              onClick={() => handleEdgeTypeChange(value)}
              title={`${label} connection${selectedEdges.length > 0 ? ' — apply to selected' : ''}`}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Cost estimator */}
      <CostEstimatorBtn active={isCostPanelOpen} onClick={toggleCostPanel}/>

      <Sep/>

      {/* Destructive */}
      {(selectedNode || nodes.some(n => n.selected)) && (
        <TBtn onClick={deleteSelected} title="Delete selected (Del)" Icon={Trash2} danger/>
      )}

      <Sep/>

      {/* Profile */}
      <ProfileMenu/>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sep() {
  const P = useTheme();
  return <div style={{ width: 1, height: 20, background: P.divider, flexShrink: 0 }}/>;
}

function TBtn({ onClick, title, Icon, label, danger, disabled }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 3, border: 'none',
        fontSize: 12, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
        color: hover && !disabled ? (danger ? P.danger : P.text) : (danger ? P.faint : P.muted),
        background: hover && !disabled ? (danger ? P.danger + '18' : P.hover) : 'transparent',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.12s',
      }}
    >
      <Icon size={13}/>
      {label && <span>{label}</span>}
    </button>
  );
}

function AIGenBtn({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Generate pipeline from a description"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bg-washi"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 3,
        border: `1px solid ${hover ? '#B87040' : '#D2C6AF'}`,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: '#F7F2E7',
        color: '#2B2926',
        transition: 'border-color 0.15s',
      }}
    >
      <Wand2 size={12}/>
      AI Generate
    </button>
  );
}

function EdgeTypeBtn({ active, color, label, onClick, title }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 11, padding: '3px 7px', borderRadius: 3, cursor: 'pointer',
        border: `1px solid ${active ? color + '88' : 'transparent'}`,
        background: active ? color + '18' : hover ? P.hover : 'transparent',
        color: active ? color : hover ? P.text : P.muted,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  );
}

function PenToggleBtn({ active, onClick }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={active ? 'Exit draw mode' : 'Draw on canvas'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 3, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.12s',
        color: active ? P.amber : hover ? P.text : P.muted,
        background: active ? P.amber + '18' : hover ? P.hover : 'transparent',
        border: `1px solid ${active ? P.amber + '66' : 'transparent'}`,
      }}
    >
      <Pencil size={13}/>
      {active ? 'Drawing' : 'Draw'}
    </button>
  );
}

function SubToolBtn({ active, onClick, title, Icon }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 3,
        cursor: 'pointer', transition: 'all 0.12s',
        color: active ? P.amber : hover ? P.text : P.muted,
        background: active ? P.amber + '18' : hover ? P.hover : 'transparent',
        border: `1px solid ${active ? P.amber + '66' : 'transparent'}`,
      }}
    >
      <Icon size={13}/>
    </button>
  );
}

function CostEstimatorBtn({ active, onClick }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Estimate monthly cloud costs"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 3, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.12s',
        color: active ? '#435C36' : hover ? P.text : P.muted,
        background: active ? '#E3E8DA' : hover ? P.hover : 'transparent',
        border: `1px solid ${active ? '#A9BB98' : 'transparent'}`,
      }}
    >
      <DollarSign size={13}/>
      Cost Estimator
    </button>
  );
}

function ProfileMenu() {
  const P = useTheme();
  const { user, logout } = useAuth();
  const { openAccountSettings } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = (user.name || '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          border: `1.5px solid ${open ? P.amber : P.divider}`,
          overflow: 'hidden', cursor: 'pointer',
          background: P.amber, color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s', padding: 0, flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = P.amber}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = P.divider; }}
      >
        {user.avatar
          ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: P.surface, border: `1px solid ${P.divider}`,
          minWidth: 210, zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${P.divider}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: P.text, margin: 0 }}>{user.name}</p>
            {user.username && (
              <p style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>@{user.username}</p>
            )}
          </div>
          <div style={{ padding: '4px 0' }}>
            <DropdownItem label="Account Settings" onClick={() => { setOpen(false); openAccountSettings(); }}/>
            <DropdownItem label="Sign Out" onClick={() => { setOpen(false); logout(); }} danger/>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ label, onClick, danger }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left', display: 'block',
        padding: '9px 16px', fontSize: 13,
        color: danger ? P.danger : P.text,
        background: hover ? P.deeper : 'transparent',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  );
}
