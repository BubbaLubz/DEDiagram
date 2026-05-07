import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import axios from 'axios';

const useStore = create((set, get) => ({
  // Canvas state
  nodes: [],
  edges: [],
  selectedNode: null,
  isDetailOpen: false,

  // UI state
  activeTab: 'components',
  isSaveModalOpen: false,
  isLoadModalOpen: false,
  isGenerateModalOpen: false,
  isCostPanelOpen: false,

  // Diagram metadata
  currentDiagramId: null,
  currentDiagramName: 'Untitled Pipeline',
  isDirty: false,

  // Saved diagrams from server
  savedDiagrams: [],

  // ─── Node / Edge handlers ────────────────────────────────────────────────
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
  },
  onConnect: (connection) => {
    const newEdge = {
      ...connection,
      type: 'labeled',
      data: { label: 'batch', edgeType: 'batch' },
    };
    set({ edges: addEdge(newEdge, get().edges), isDirty: true });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node], isDirty: true });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
      isDirty: true,
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

  // ─── Selection ────────────────────────────────────────────────────────────
  selectNode: (node) => set({ selectedNode: node, isDetailOpen: !!node, isCostPanelOpen: false }),
  closeDetail: () => set({ isDetailOpen: false, selectedNode: null }),

  // ─── Template loading ─────────────────────────────────────────────────────
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

  setDiagramName: (name) => set({ currentDiagramName: name, isDirty: true }),

  // ─── Server interactions ──────────────────────────────────────────────────
  fetchSavedDiagrams: async () => {
    try {
      const { data } = await axios.get('/api/diagrams');
      set({ savedDiagrams: data });
    } catch (err) {
      console.error('Failed to fetch diagrams:', err);
    }
  },

  saveDiagram: async (name, description, isTemplate) => {
    const { nodes, edges, currentDiagramId } = get();
    try {
      let result;
      if (currentDiagramId) {
        const { data } = await axios.put(`/api/diagrams/${currentDiagramId}`, {
          name, description, nodes, edges, isTemplate,
        });
        result = data;
      } else {
        const { data } = await axios.post('/api/diagrams', {
          name, description, nodes, edges, isTemplate,
        });
        result = data;
      }
      set({
        currentDiagramId: result.id,
        currentDiagramName: result.name,
        isDirty: false,
      });
      await get().fetchSavedDiagrams();
      return result;
    } catch (err) {
      console.error('Failed to save diagram:', err);
      throw err;
    }
  },

  loadDiagram: async (id) => {
    try {
      const { data } = await axios.get(`/api/diagrams/${id}`);
      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        currentDiagramId: data.id,
        currentDiagramName: data.name,
        isDirty: false,
        selectedNode: null,
        isDetailOpen: false,
      });
    } catch (err) {
      console.error('Failed to load diagram:', err);
      throw err;
    }
  },

  deleteDiagram: async (id) => {
    try {
      await axios.delete(`/api/diagrams/${id}`);
      if (get().currentDiagramId === id) {
        set({ currentDiagramId: null, currentDiagramName: 'Untitled Pipeline', isDirty: false });
      }
      await get().fetchSavedDiagrams();
    } catch (err) {
      console.error('Failed to delete diagram:', err);
      throw err;
    }
  },

  // UI toggles
  openSaveModal: () => set({ isSaveModalOpen: true }),
  closeSaveModal: () => set({ isSaveModalOpen: false }),
  openLoadModal: () => set({ isLoadModalOpen: true }),
  closeLoadModal: () => set({ isLoadModalOpen: false }),
  openGenerateModal: () => set({ isGenerateModalOpen: true }),
  closeGenerateModal: () => set({ isGenerateModalOpen: false }),
  toggleCostPanel: () => set(s => ({ isCostPanelOpen: !s.isCostPanelOpen, isDetailOpen: false, selectedNode: null })),
  closeCostPanel: () => set({ isCostPanelOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export default useStore;
