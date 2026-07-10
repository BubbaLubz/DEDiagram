import axios from 'axios';
import { normalizeDocCells } from './canvasSlice';

export const createDiagramSlice = (set, get) => ({
  // State
  currentDiagramId: null,
  currentDiagramName: 'Untitled Pipeline',
  isDirty: false,
  savedDiagrams: [],

  setDiagramName: (name) => set({ currentDiagramName: name, isDirty: true }),

  fetchSavedDiagrams: async () => {
    try {
      const { data } = await axios.get('/api/diagrams');
      set({ savedDiagrams: data });
    } catch (err) {
      console.error('Failed to fetch diagrams:', err);
    }
  },

  saveDiagram: async (name, description, isTemplate) => {
    const { nodes, edges, docCells, currentDiagramId } = get();
    try {
      let result;
      if (currentDiagramId) {
        const { data } = await axios.put(`/api/diagrams/${currentDiagramId}`, {
          name, description, nodes, edges, docCells, isTemplate,
        });
        result = data;
      } else {
        const { data } = await axios.post('/api/diagrams', {
          name, description, nodes, edges, docCells, isTemplate,
        });
        result = data;
      }
      set({ currentDiagramId: result.id, currentDiagramName: result.name, isDirty: false });
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
        docCells: normalizeDocCells(data.docCells),
        activeCellId: null,
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
});
