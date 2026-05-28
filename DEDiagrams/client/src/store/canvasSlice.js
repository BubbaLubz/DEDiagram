import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

export const createCanvasSlice = (set, get) => ({
  // State
  nodes: [],
  edges: [],
  selectedNode: null,
  isDetailOpen: false,

  // ReactFlow handlers
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(
        { ...connection, type: 'labeled', data: { label: 'batch', edgeType: 'batch' } },
        get().edges,
      ),
      isDirty: true,
    });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node], isDirty: true });
  },

  updateNodeData: (nodeId, data) => {
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
    set({
      edges: get().edges.map(e => e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e),
      isDirty: true,
    });
  },

  deleteSelected: () => {
    set({
      nodes: get().nodes.filter(n => !n.selected),
      edges: get().edges.filter(e => !e.selected),
      isDirty: true,
    });
  },

  selectNode: (node) => set({ selectedNode: node, isDetailOpen: !!node, isCostPanelOpen: false }),
  closeDetail: () => set({ isDetailOpen: false, selectedNode: null }),

  loadTemplate: (template) => {
    set({
      nodes: template.nodes,
      edges: template.edges,
      currentDiagramId: null,
      currentDiagramName: template.name,
      isDirty: true,
      selectedNode: null,
      isDetailOpen: false,
    });
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      currentDiagramId: null,
      currentDiagramName: 'Untitled Pipeline',
      isDirty: false,
      selectedNode: null,
      isDetailOpen: false,
    });
  },
});
