import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createCanvasSlice } from '../canvasSlice';
import { createDiagramSlice } from '../diagramSlice';

vi.mock('axios');
import axios from 'axios';

function makeStore() {
  return create((set, get) => ({
    isCostPanelOpen: false,
    ...createCanvasSlice(set, get),
    ...createDiagramSlice(set, get),
  }));
}

// ─── fetchSavedDiagrams ───────────────────────────────────────────────────────

describe('diagramSlice › fetchSavedDiagrams', () => {
  let store;
  beforeEach(() => { store = makeStore(); vi.clearAllMocks(); });

  it('populates savedDiagrams on success', async () => {
    const diagrams = [{ id: '1', name: 'Test', description: '' }];
    axios.get.mockResolvedValue({ data: diagrams });

    await store.getState().fetchSavedDiagrams();

    expect(store.getState().savedDiagrams).toEqual(diagrams);
  });

  it('does not throw and leaves savedDiagrams unchanged on failure', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    await expect(store.getState().fetchSavedDiagrams()).resolves.toBeUndefined();
    expect(store.getState().savedDiagrams).toEqual([]);
  });
});

// ─── saveDiagram ──────────────────────────────────────────────────────────────

describe('diagramSlice › saveDiagram', () => {
  let store;
  beforeEach(() => { store = makeStore(); vi.clearAllMocks(); });

  it('POSTs when no currentDiagramId is set', async () => {
    const saved = { id: 'new-id', name: 'My Pipeline' };
    axios.post.mockResolvedValue({ data: saved });
    axios.get.mockResolvedValue({ data: [] });

    await store.getState().saveDiagram('My Pipeline', 'desc', false);

    expect(axios.post).toHaveBeenCalledWith(
      '/api/diagrams',
      expect.objectContaining({ name: 'My Pipeline' }),
      expect.any(Object)
    );
    expect(store.getState().currentDiagramId).toBe('new-id');
    expect(store.getState().isDirty).toBe(false);
  });

  it('PUTs when currentDiagramId exists', async () => {
    store.setState({ currentDiagramId: 'existing-id' });
    axios.put.mockResolvedValue({ data: { id: 'existing-id', name: 'Updated' } });
    axios.get.mockResolvedValue({ data: [] });

    await store.getState().saveDiagram('Updated', '', false);

    expect(axios.put).toHaveBeenCalledWith(
      '/api/diagrams/existing-id',
      expect.any(Object),
      expect.any(Object)
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('clears isDirty after a successful save', async () => {
    store.setState({ isDirty: true });
    axios.post.mockResolvedValue({ data: { id: 'x', name: 'T' } });
    axios.get.mockResolvedValue({ data: [] });

    await store.getState().saveDiagram('T', '', false);

    expect(store.getState().isDirty).toBe(false);
  });

  it('throws on save failure', async () => {
    axios.post.mockRejectedValue(new Error('Server error'));

    await expect(store.getState().saveDiagram('T', '', false)).rejects.toThrow('Server error');
  });
});

// ─── loadDiagram ──────────────────────────────────────────────────────────────

describe('diagramSlice › loadDiagram', () => {
  let store;
  beforeEach(() => { store = makeStore(); vi.clearAllMocks(); });

  it('replaces canvas state from the API response', async () => {
    const diagram = {
      id: 'diag-1',
      name: 'Remote Pipeline',
      nodes: [{ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    };
    axios.get.mockResolvedValue({ data: diagram });

    await store.getState().loadDiagram('diag-1');

    expect(store.getState().nodes).toHaveLength(1);
    expect(store.getState().currentDiagramId).toBe('diag-1');
    expect(store.getState().currentDiagramName).toBe('Remote Pipeline');
    expect(store.getState().isDirty).toBe(false);
  });
});

// ─── deleteDiagram ────────────────────────────────────────────────────────────

describe('diagramSlice › deleteDiagram', () => {
  let store;
  beforeEach(() => { store = makeStore(); vi.clearAllMocks(); });

  it('clears currentDiagramId when the active diagram is deleted', async () => {
    store.setState({ currentDiagramId: 'to-delete' });
    axios.delete.mockResolvedValue({});
    axios.get.mockResolvedValue({ data: [] });

    await store.getState().deleteDiagram('to-delete');

    expect(store.getState().currentDiagramId).toBeNull();
    expect(store.getState().isDirty).toBe(false);
  });

  it('does not clear currentDiagramId when a different diagram is deleted', async () => {
    store.setState({ currentDiagramId: 'active' });
    axios.delete.mockResolvedValue({});
    axios.get.mockResolvedValue({ data: [] });

    await store.getState().deleteDiagram('other');

    expect(store.getState().currentDiagramId).toBe('active');
  });
});
