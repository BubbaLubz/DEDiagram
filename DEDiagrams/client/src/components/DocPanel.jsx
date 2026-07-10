import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, ChevronUp, X, Bold, Italic, Strikethrough, Tags, ChevronRight } from 'lucide-react';
import { useReactFlow, getNodesBounds } from 'reactflow';
import useStore from '../store';
import { useTheme } from '../theme';
import { COMPONENTS, getCategory } from '../data/componentLibrary';

const MARKERS = { bold: '**', italic: '*', strike: '~~' };

// Toggles a markdown marker around [start, end) — unwraps if the selection is
// already immediately surrounded by it, otherwise wraps it. Returns the new
// full text plus the (shifted) selection bounds so the caret can be restored
// over the same semantic text, not the marker characters.
function toggleMarker(text, start, end, marker) {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const len = marker.length;
  const wrapped = before.endsWith(marker) && after.startsWith(marker);

  if (wrapped) {
    return { text: before.slice(0, -len) + selected + after.slice(len), start: start - len, end: end - len };
  }
  return { text: before + marker + selected + marker + after, start: start + len, end: end + len };
}

export default function DocPanel() {
  const P = useTheme();
  const {
    isDocPanelOpen, toggleDocPanel, docCells, activeCellId, setActiveCell,
    setCellText, assignSelectionToNode, toggleCellNode, nodes,
  } = useStore();
  const { fitBounds, getNodes } = useReactFlow();
  const textareaRefs = useRef({});
  const toolbarRef = useRef(null);
  const assignCloseTimer = useRef(null);
  const [toolbar, setToolbar] = useState(null); // { cellId, start, end, top, left }
  const [assignOpen, setAssignOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const linkedCount = docCells.filter(c => c.nodeIds.length > 0).length;

  // The button and its checkbox flyout are two separate floating boxes with a
  // small gap between them, so a plain onMouseLeave on either one (fired the
  // instant the pointer crosses that gap) closes it before the pointer lands
  // on the other. Debounce the close instead, and let entering either box
  // cancel a pending close — the standard hover-menu pattern.
  const openAssign = () => {
    clearTimeout(assignCloseTimer.current);
    setAssignOpen(true);
  };
  const scheduleCloseAssign = () => {
    clearTimeout(assignCloseTimer.current);
    assignCloseTimer.current = setTimeout(() => setAssignOpen(false), 200);
  };

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = panelHeight;
    const onMove = (ev) => {
      const draggedUpBy = startY - ev.clientY; // dragging up extends the panel
      setPanelHeight(Math.min(Math.max(startHeight + draggedUpBy, 160), window.innerHeight * 0.85));
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Clicking empty space below/around the cells (rather than directly on a
  // cell's textarea) should still let you type — land the cursor at the end
  // of the last cell, same as clicking at the end of a text document.
  const focusLastCell = () => {
    const lastCell = docCells[docCells.length - 1];
    const ta = textareaRefs.current[lastCell.id];
    if (!ta) return;
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  };

  useEffect(() => {
    if (!toolbar) return;
    const close = (e) => {
      if (toolbarRef.current?.contains(e.target)) return;
      setToolbar(null);
      setAssignOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { setToolbar(null); setAssignOpen(false); } };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [toolbar]);

  const focusCell = (cell) => {
    setActiveCell(cell.id);
    const linkedNodes = getNodes().filter(n => cell.nodeIds.includes(n.id));
    if (linkedNodes.length > 0) {
      fitBounds(getNodesBounds(linkedNodes), { padding: 0.4, duration: 500 });
    }
  };

  // Listened to on 'select', 'mouseup', and 'keyup' — the native 'select' event
  // alone isn't reliably fired for mouse-drag selections in every browser, so
  // this is deliberately redundant. Deferred a tick since mouseup/keyup can
  // fire a hair before the browser finalizes selectionStart/selectionEnd.
  const handleSelect = (cell) => (e) => {
    const ta = e.target;
    setTimeout(() => {
      const { selectionStart: start, selectionEnd: end } = ta;
      if (start === end) { setToolbar(null); setAssignOpen(false); return; }
      const rect = ta.getBoundingClientRect();
      setToolbar({ cellId: cell.id, start, end, top: rect.top - 42, left: rect.left + rect.width / 2 });
    }, 0);
  };

  const applyMarker = (markerKey) => {
    const cell = docCells.find(c => c.id === toolbar.cellId);
    if (!cell) return;
    const { text, start, end } = toggleMarker(cell.text, toolbar.start, toolbar.end, MARKERS[markerKey]);
    setCellText(cell.id, text);
    setToolbar(t => t && { ...t, start, end });
    requestAnimationFrame(() => {
      const ta = textareaRefs.current[cell.id];
      if (ta) { ta.focus(); ta.setSelectionRange(start, end); }
    });
  };

  // After either action below, the cell the toolbar was pointing at may have
  // been replaced (split into a new linked cell) or merged away (unlinked
  // back into an adjacent plain cell) — both actions report the surviving
  // id via activeCellId, so re-sync the toolbar to it instead of letting it
  // go stale and silently stop responding to further clicks.
  const syncToolbarToActiveCell = () => {
    const { activeCellId: newActive, docCells: freshCells } = useStore.getState();
    const newCell = freshCells.find(c => c.id === newActive);
    setToolbar(t => t && { ...t, cellId: newActive, start: 0, end: newCell?.text.length ?? 0 });
  };

  const toggleAssign = (nodeId) => {
    const cell = docCells.find(c => c.id === toolbar.cellId);
    if (!cell) return;
    if (cell.nodeIds.length === 0) {
      assignSelectionToNode(cell.id, toolbar.start, toolbar.end, nodeId);
    } else {
      toggleCellNode(cell.id, nodeId);
    }
    syncToolbarToActiveCell();
  };

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 'min(980px, 94vw)', zIndex: 40,
        background: P.surface, border: `1px solid ${P.divider}`, borderBottom: 'none',
        borderTopLeftRadius: 10, borderTopRightRadius: 10,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.18)', overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {isDocPanelOpen && (
        <div
          onMouseDown={startResize}
          title="Drag to resize"
          style={{ height: 8, flexShrink: 0, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: 36, height: 3, borderRadius: 2, background: P.divider }} />
        </div>
      )}

      <button
        onClick={toggleDocPanel}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <BookOpen size={14} color={P.amber} />
        <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Pipeline Notes</span>
        {linkedCount > 0 && (
          <span style={{ fontSize: 11, color: P.muted }}>{linkedCount} linked</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: P.faint }}>highlight text for formatting &amp; node links</span>
        {isDocPanelOpen ? <ChevronDown size={14} color={P.muted} /> : <ChevronUp size={14} color={P.muted} />}
      </button>

      <div
        onClick={e => { if (e.target === e.currentTarget) focusLastCell(); }}
        style={{ height: isDocPanelOpen ? panelHeight : 0, transition: isResizing ? 'none' : 'height 0.25s ease', overflowY: 'auto' }}
      >
        <div
          onClick={e => { if (e.target === e.currentTarget) focusLastCell(); }}
          style={{ padding: '2px 14px 14px', minHeight: '100%' }}
        >
          {docCells.map(cell => (
            <Cell
              key={cell.id}
              cell={cell}
              isActive={activeCellId === cell.id}
              showPlaceholder={docCells.length === 1}
              nodes={nodes}
              textareaRefs={textareaRefs}
              onSelect={handleSelect(cell)}
              onFocusCell={() => focusCell(cell)}
            />
          ))}
        </div>
      </div>

      {toolbar && createPortal(
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed', top: toolbar.top, left: toolbar.left, transform: 'translate(-50%, -100%)',
            zIndex: 100, display: 'flex', alignItems: 'center', gap: 2,
            background: P.card, border: `1px solid ${P.divider}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 3,
          }}
        >
          <ToolbarBtn title="Bold" onClick={() => applyMarker('bold')}><Bold size={13} /></ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => applyMarker('italic')}><Italic size={13} /></ToolbarBtn>
          <ToolbarBtn title="Strikethrough" onClick={() => applyMarker('strike')}><Strikethrough size={13} /></ToolbarBtn>

          <div style={{ width: 1, height: 18, background: P.divider, margin: '0 2px' }} />

          <div
            style={{ position: 'relative' }}
            onMouseEnter={openAssign}
            onMouseLeave={scheduleCloseAssign}
          >
            <ToolbarBtn title="Assign to node(s)">
              <Tags size={13} />
              <ChevronRight size={10} />
            </ToolbarBtn>

            {assignOpen && (
              <div
                onMouseEnter={openAssign}
                onMouseLeave={scheduleCloseAssign}
                style={{
                  position: 'absolute', bottom: '100%', left: 0, marginBottom: 2,
                  minWidth: 200, maxHeight: 240, overflowY: 'auto',
                  background: P.card, border: `1px solid ${P.divider}`, borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 4,
                }}
              >
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: P.faint, padding: '4px 8px' }}>
                  Assign to node
                </div>
                {nodes.length === 0 && (
                  <div style={{ fontSize: 12, color: P.muted, padding: '6px 8px' }}>No nodes on canvas</div>
                )}
                {nodes.map(n => {
                  const cell = docCells.find(c => c.id === toolbar.cellId);
                  const checked = cell?.nodeIds.includes(n.id) ?? false;
                  const component = COMPONENTS[n.data.componentType];
                  const category = getCategory(component?.category);
                  return (
                    <label
                      key={n.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => {
                        // The checkbox's own onClick/onChange already handles a
                        // direct click on it. For a click anywhere else in the
                        // row (the label's native "forward click to the
                        // control" behavior would otherwise focus the checkbox
                        // — the same focus-stealing preventDefault above is
                        // guarding against, just via the click event instead
                        // of mousedown), cancel that forwarding and toggle
                        // directly ourselves instead.
                        if (e.target.tagName === 'INPUT') return;
                        e.preventDefault();
                        toggleAssign(n.id);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        fontSize: 12, color: P.text, cursor: 'pointer', borderRadius: 5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssign(n.id)}
                        onMouseDown={e => e.preventDefault()}
                      />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: category?.color || P.faint, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.data.label || component?.label || n.id}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ToolbarBtn({ onClick, title, children }) {
  const P = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 1,
        padding: '5px 7px', borderRadius: 5, border: 'none', cursor: 'pointer',
        background: hover ? P.hover : 'transparent', color: P.text,
      }}
    >
      {children}
    </button>
  );
}

function Cell({ cell, isActive, showPlaceholder, nodes, textareaRefs, onSelect, onFocusCell }) {
  const P = useTheme();
  const { setCellText, toggleCellNode } = useStore();
  const taRef = useRef(null);
  const isPlain = cell.nodeIds.length === 0;

  const linkedNodes = nodes.filter(n => cell.nodeIds.includes(n.id));

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [cell.text]);

  return (
    <div
      style={isPlain ? undefined : {
        marginTop: 8, marginBottom: 8, borderRadius: 8,
        border: `1px solid ${isActive ? P.amber : P.divider}`,
        background: isActive ? P.amber + '0d' : P.input,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {!isPlain && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, padding: '5px 8px', borderBottom: `1px solid ${P.divider}` }}>
          {linkedNodes.map(n => {
            const component = COMPONENTS[n.data.componentType];
            const category = getCategory(component?.category);
            return (
              <span
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 6px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: (category?.color || P.amber) + '1c', color: category?.color || P.amber,
                  cursor: 'pointer',
                }}
                onClick={onFocusCell}
                title="Show on canvas"
              >
                {n.data.label || component?.label || 'Node'}
                <X
                  size={10}
                  onClick={e => { e.stopPropagation(); toggleCellNode(cell.id, n.id); }}
                  style={{ cursor: 'pointer' }}
                />
              </span>
            );
          })}
        </div>
      )}

      <textarea
        ref={el => { taRef.current = el; textareaRefs.current[cell.id] = el; }}
        value={cell.text}
        onChange={e => setCellText(cell.id, e.target.value)}
        onSelect={onSelect}
        onMouseUp={onSelect}
        onKeyUp={onSelect}
        placeholder={isPlain && showPlaceholder ? 'Write about your pipeline… highlight text to format it or link it to a node.' : ''}
        rows={1}
        style={{
          width: '100%', resize: 'none', overflow: 'hidden', border: 'none', outline: 'none',
          background: 'transparent', color: P.text, fontSize: 13, lineHeight: 1.6,
          padding: isPlain ? '4px 2px' : '8px 10px', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}
