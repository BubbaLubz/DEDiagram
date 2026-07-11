import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { normalizeCells } from './docSlice';

// Debounce state for updateNodeData — one snapshot per typing session
let _nodeDataTimer = null;
let _nodeDataSnapped = false;

// Accepts either the current { nodeIds: [] } shape or the older single
// { nodeId } shape (older saved diagrams / imported JSON), normalizes to the
// current shape, and pads in the typeable plain-text gaps normalizeCells
// guarantees (in case the saved/imported data doesn't have them already).
export function normalizeDocCells(cells) {
  if (!cells?.length) return [{ id: uuidv4(), text: '', nodeIds: [] }];
  return normalizeCells(cells.map(c => ({
    id: c.id,
    text: c.text ?? '',
    nodeIds: c.nodeIds ?? (c.nodeId ? [c.nodeId] : []),
  })));
}

export const createCanvasSlice = (set, get) => ({
  // State
  nodes: [],
  edges: [],
  selectedNode: null,
  isDetailOpen: false,

  // Undo history
  undoStack: [],

  snapshot: () => {
    const { nodes, edges, drawingStrokes, undoStack } = get();
    const snap = { nodes, edges, drawingStrokes };
    const next = [...undoStack, snap];
    if (next.length > 50) next.shift();
    set({ undoStack: next });
  },

  undo: () => {
    const stack = [...get().undoStack];
    if (stack.length === 0) return;
    const snap = stack.pop();
    // Also clear the debounce flag so a resumed edit gets a fresh snapshot
    _nodeDataSnapped = false;
    clearTimeout(_nodeDataTimer);
    set({ ...snap, undoStack: stack });
  },

  // ReactFlow handlers
  onNodesChange: (changes) => {
    const removedIds = changes.filter(c => c.type === 'remove').map(c => c.id);
    const needsSnapshot = removedIds.length > 0 ||
      changes.some(c => c.type === 'position' && c.dragging === false);
    if (needsSnapshot) get().snapshot();
    set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true });
    if (removedIds.length > 0) get().clearDocCellsForNodes(removedIds);
  },

  onEdgesChange: (changes) => {
    if (changes.some(c => c.type === 'remove')) get().snapshot();
    set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
  },

  onConnect: (connection) => {
    get().snapshot();
    set({
      edges: addEdge(
        { ...connection, type: 'labeled', data: { label: 'batch', edgeType: 'batch' } },
        get().edges,
      ),
      isDirty: true,
    });
  },

  addNode: (node) => {
    get().snapshot();
    set({ nodes: [...get().nodes, node], isDirty: true });
  },

  updateNodeData: (nodeId, data) => {
    // Snapshot once at the start of a typing session, not per keystroke
    if (!_nodeDataSnapped) {
      get().snapshot();
      _nodeDataSnapped = true;
    }
    clearTimeout(_nodeDataTimer);
    _nodeDataTimer = setTimeout(() => { _nodeDataSnapped = false; }, 1500);

    const { selectedNode } = get();
    set({
      nodes: get().nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
      isDirty: true,
      ...(selectedNode?.id === nodeId
        ? { selectedNode: { ...selectedNode, data: { ...selectedNode.data, ...data } } }
        : {}),
    });
  },

  updateEdgeData: (edgeId, data) => {
    get().snapshot();
    set({
      edges: get().edges.map(e => e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e),
      isDirty: true,
    });
  },

  deleteSelected: () => {
    get().snapshot();
    const removedIds = get().nodes.filter(n => n.selected).map(n => n.id);
    set({
      nodes: get().nodes.filter(n => !n.selected),
      edges: get().edges.filter(e => !e.selected),
      isDirty: true,
    });
    if (removedIds.length > 0) get().clearDocCellsForNodes(removedIds);
  },

  selectNode: (node) => set({ selectedNode: node, isDetailOpen: !!node, isCostPanelOpen: false }),
  closeDetail: () => set({ isDetailOpen: false, selectedNode: null }),

  loadTemplate: (template) => {
    // Deliberately keeps currentDiagramId as-is (not cleared to force a
    // save-as-new) — clearing it unmounts the live-collab RoomProvider in
    // App.jsx, which tears down the Yjs bridge before it can push the new
    // nodes/edges, so a template loaded mid-session never reaches other
    // collaborators and the room silently dies.
    set({
      nodes: template.nodes,
      edges: template.edges,
      currentDiagramName: template.name,
      isDirty: true,
      selectedNode: null,
      isDetailOpen: false,
      docCells: normalizeDocCells(template.docCells),
      activeCellId: null,
    });
  },

  // Confirmation gate in front of loadTemplate — it replaces the whole
  // canvas, so anything already on it (sidebar templates, AI generation,
  // JSON import) routes through here instead of calling loadTemplate
  // directly. Skipped when there's nothing to lose.
  isConfirmClearOpen: false,
  pendingTemplate: null,

  requestLoadTemplate: (template) => {
    if (get().nodes.length === 0) {
      get().loadTemplate(template);
      return;
    }
    set({ pendingTemplate: template, isConfirmClearOpen: true });
  },

  confirmLoadTemplate: () => {
    const { pendingTemplate } = get();
    set({ isConfirmClearOpen: false, pendingTemplate: null });
    if (pendingTemplate) get().loadTemplate(pendingTemplate);
  },

  cancelLoadTemplate: () => set({ isConfirmClearOpen: false, pendingTemplate: null }),
});
