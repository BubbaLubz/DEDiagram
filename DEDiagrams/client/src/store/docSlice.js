import { v4 as uuidv4 } from 'uuid';

const emptyCell = () => ({ id: uuidv4(), text: '', nodeIds: [] });

// A "plain" cell (nodeIds.length === 0) is just flowing document text, not a
// notebook cell. Keeps the document editable as continuous prose:
//  1. Two plain cells never sit next to each other — merge them into one.
//  2. There's always a plain cell to click into before the first linked cell,
//     after the last one, and between any two linked cells sitting next to
//     each other — otherwise there'd be nowhere to place the cursor and type
//     free text immediately around a highlighted passage.
export function normalizeCells(cells) {
  const merged = [];
  for (const c of cells) {
    const last = merged[merged.length - 1];
    if (last && last.nodeIds.length === 0 && c.nodeIds.length === 0) {
      last.text += c.text;
    } else {
      merged.push({ ...c });
    }
  }
  if (merged.length === 0) return [emptyCell()];

  const out = [];
  if (merged[0].nodeIds.length > 0) out.push(emptyCell());
  merged.forEach((c, i) => {
    out.push(c);
    const next = merged[i + 1];
    if (c.nodeIds.length > 0 && (!next || next.nodeIds.length > 0)) out.push(emptyCell());
  });
  return out;
}

export const createDocSlice = (set, get) => ({
  // State
  isDocPanelOpen: false,
  docCells: [emptyCell()],
  activeCellId: null,

  // Actions
  toggleDocPanel: () => set(s => ({ isDocPanelOpen: !s.isDocPanelOpen })),

  setCellText: (cellId, text) => set(s => ({
    docCells: s.docCells.map(c => c.id === cellId ? { ...c, text } : c),
  })),

  setActiveCell: (cellId) => set({ activeCellId: cellId }),

  /**
   * Splits `cellId`'s text at [start, end) into up to three cells — the text
   * before the selection, the selection itself (linked to `nodeId`), and the
   * text after — mirroring how a Jupyter cell gets divided at a cursor. A
   * collapsed selection (start === end) links the whole cell instead of
   * splitting it. Only meant to be called on a plain (unlinked) cell — use
   * `toggleCellNode` to add/remove links on a cell that's already split out.
   */
  assignSelectionToNode: (cellId, start, end, nodeId) => set(s => {
    const idx = s.docCells.findIndex(c => c.id === cellId);
    if (idx === -1) return s;
    const cell = s.docCells[idx];

    if (start === end) {
      const next = [...s.docCells];
      next[idx] = { ...cell, nodeIds: [nodeId] };
      return { docCells: normalizeCells(next), activeCellId: cell.id };
    }

    const before = cell.text.slice(0, start);
    const middle = cell.text.slice(start, end);
    const after = cell.text.slice(end);

    const replacement = [
      ...(before ? [{ id: uuidv4(), text: before, nodeIds: [] }] : []),
      { id: uuidv4(), text: middle, nodeIds: [nodeId] },
      ...(after ? [{ id: uuidv4(), text: after, nodeIds: [] }] : []),
    ];

    const next = [...s.docCells];
    next.splice(idx, 1, ...replacement);
    return { docCells: normalizeCells(next), activeCellId: replacement.find(c => c.nodeIds.includes(nodeId))?.id ?? null };
  }),

  // Adds/removes a single node link on an already-split-out cell (used by the
  // assign-to-node flyout). A cell can link to any number of nodes. If a cell
  // loses its last link it dissolves back into plain text and normalizeCells
  // may merge it into an adjacent plain cell, discarding its id — so this
  // also reports which id the cell survives as (itself, or the neighbor it
  // got folded into), letting the caller keep pointing at the right cell
  // instead of silently going stale.
  toggleCellNode: (cellId, nodeId) => set(s => {
    const idx = s.docCells.findIndex(c => c.id === cellId);
    if (idx === -1) return s;

    const next = s.docCells.map(c => {
      if (c.id !== cellId) return c;
      const has = c.nodeIds.includes(nodeId);
      return { ...c, nodeIds: has ? c.nodeIds.filter(n => n !== nodeId) : [...c.nodeIds, nodeId] };
    });

    const becamePlain = next[idx].nodeIds.length === 0;
    const mergesIntoPrev = becamePlain && idx > 0 && next[idx - 1].nodeIds.length === 0;
    const survivingId = mergesIntoPrev ? next[idx - 1].id : next[idx].id;

    return { docCells: normalizeCells(next), activeCellId: survivingId };
  }),

  // Un-links cells pointing at nodes that no longer exist on the canvas.
  clearDocCellsForNodes: (removedNodeIds) => set(s => {
    if (removedNodeIds.length === 0) return s;
    const removed = new Set(removedNodeIds);
    const next = s.docCells.map(c =>
      c.nodeIds.some(n => removed.has(n)) ? { ...c, nodeIds: c.nodeIds.filter(n => !removed.has(n)) } : c,
    );
    const normalized = normalizeCells(next);
    const activeStillLinked = normalized.some(c => c.id === s.activeCellId && c.nodeIds.length > 0);
    return { docCells: normalized, activeCellId: activeStillLinked ? s.activeCellId : null };
  }),
});
