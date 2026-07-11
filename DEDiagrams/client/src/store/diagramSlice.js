import axios from 'axios';
import { normalizeDocCells } from './canvasSlice';

// Guards against overlapping PUT requests if a tick fires while the
// previous autosave is still in flight (e.g. a slow connection).
let _autosaveInFlight = false;

// node/edge `.selected` is local ReactFlow UI state, not real diagram
// content — never persist it, so a diagram someone happened to have a node
// selected on at save time doesn't load with that node pre-selected for
// everyone who opens it afterward.
const stripSelected = ({ selected, ...rest }) => rest;

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
    const cleanNodes = nodes.map(stripSelected);
    const cleanEdges = edges.map(stripSelected);
    try {
      let result;
      if (currentDiagramId) {
        const { data } = await axios.put(`/api/diagrams/${currentDiagramId}`, {
          name, description, nodes: cleanNodes, edges: cleanEdges, docCells, isTemplate,
        });
        result = data;
      } else {
        const { data } = await axios.post('/api/diagrams', {
          name, description, nodes: cleanNodes, edges: cleanEdges, docCells, isTemplate,
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

  createNewDiagram: async () => {
    try {
      const { data } = await axios.post('/api/diagrams', {
        name: 'Untitled Pipeline', description: '', nodes: [], edges: [], docCells: [],
      });
      set({
        nodes: [], edges: [], docCells: normalizeDocCells([]), activeCellId: null,
        currentDiagramId: data.id, currentDiagramName: data.name, isDirty: false,
        selectedNode: null, isDetailOpen: false,
      });
      await get().fetchSavedDiagrams();
      return data;
    } catch (err) {
      console.error('Failed to create new diagram:', err);
      throw err;
    }
  },

  loadDiagram: async (id) => {
    try {
      const { data } = await axios.get(`/api/diagrams/${id}`);
      set({
        nodes: (data.nodes || []).map(stripSelected),
        edges: (data.edges || []).map(stripSelected),
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

  renameDiagram: async (id, name) => {
    try {
      const { data } = await axios.put(`/api/diagrams/${id}`, { name });
      set(state => ({
        savedDiagrams: state.savedDiagrams.map(d => d.id === id ? { ...d, name: data.name, updatedAt: data.updatedAt } : d),
        currentDiagramName: state.currentDiagramId === id ? data.name : state.currentDiagramName,
      }));
      return data;
    } catch (err) {
      console.error('Failed to rename diagram:', err);
      throw err;
    }
  },

  // Silent background save — only patches nodes/edges/docCells/name (no
  // description/isTemplate, which live only in SaveModal's local state), so
  // it never clobbers those fields. Skips diagrams that were never saved
  // once (no id to PUT to — those still need an explicit first Save).
  autosave: async () => {
    const { currentDiagramId, isDirty, nodes, edges, docCells, currentDiagramName } = get();
    if (!currentDiagramId || !isDirty || _autosaveInFlight) return;
    _autosaveInFlight = true;
    try {
      await axios.put(`/api/diagrams/${currentDiagramId}`, {
        name: currentDiagramName, nodes: nodes.map(stripSelected), edges: edges.map(stripSelected), docCells,
      });
      // Only clear isDirty if nothing changed again while the request was
      // in flight — otherwise we'd silently drop that newer edit.
      const state = get();
      if (state.nodes === nodes && state.edges === edges
        && state.docCells === docCells && state.currentDiagramName === currentDiagramName) {
        set({ isDirty: false });
      }
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      _autosaveInFlight = false;
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
