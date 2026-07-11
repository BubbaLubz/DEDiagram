import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createCanvasSlice } from '../canvasSlice';

/**
 * Creates a fresh, isolated store for each test.
 * Adds isDirty to the base state so slice assertions work without the
 * full diagramSlice being present.
 */
function makeStore(extraState = {}) {
  return create((set, get) => ({
    isDirty: false,
    isCostPanelOpen: false,
    ...extraState,
    ...createCanvasSlice(set, get),
  }));
}

// ─── addNode ──────────────────────────────────────────────────────────────────

describe('canvasSlice › addNode', () => {
  let store;
  beforeEach(() => { store = makeStore(); });

  it('appends the node to the nodes array', () => {
    const node = { id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: { componentType: 'postgresql' } };
    store.getState().addNode(node);
    expect(store.getState().nodes).toHaveLength(1);
    expect(store.getState().nodes[0]).toEqual(node);
  });

  it('sets isDirty', () => {
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
    expect(store.getState().isDirty).toBe(true);
  });

  it('preserves existing nodes when adding a second', () => {
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
    store.getState().addNode({ id: 'n2', type: 'component', position: { x: 300, y: 0 }, data: {} });
    expect(store.getState().nodes).toHaveLength(2);
  });
});

// ─── updateNodeData ───────────────────────────────────────────────────────────

describe('canvasSlice › updateNodeData', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.getState().addNode({
      id: 'n1',
      type: 'component',
      position: { x: 0, y: 0 },
      data: { componentType: 'postgresql', label: 'Old Label', notes: 'keep me' },
    });
  });

  it('shallow-merges new data into the target node', () => {
    store.getState().updateNodeData('n1', { label: 'New Label' });
    const n = store.getState().nodes.find(n => n.id === 'n1');
    expect(n.data.label).toBe('New Label');
    expect(n.data.notes).toBe('keep me');
    expect(n.data.componentType).toBe('postgresql');
  });

  it('does not mutate other nodes', () => {
    store.getState().addNode({
      id: 'n2',
      type: 'component',
      position: { x: 300, y: 0 },
      data: { componentType: 'kafka', label: 'Kafka' },
    });
    store.getState().updateNodeData('n1', { label: 'Changed' });
    const n2 = store.getState().nodes.find(n => n.id === 'n2');
    expect(n2.data.label).toBe('Kafka');
  });

  it('keeps selectedNode in sync when it matches the updated node', () => {
    const node = store.getState().nodes[0];
    store.getState().selectNode(node);
    store.getState().updateNodeData('n1', { label: 'Synced' });
    expect(store.getState().selectedNode.data.label).toBe('Synced');
  });

  it('does not touch selectedNode when it is a different node', () => {
    store.getState().addNode({
      id: 'n2',
      type: 'component',
      position: { x: 300, y: 0 },
      data: { componentType: 'kafka', label: 'Kafka' },
    });
    store.getState().selectNode(store.getState().nodes[1]);
    store.getState().updateNodeData('n1', { label: 'Changed' });
    expect(store.getState().selectedNode.data.label).toBe('Kafka');
  });
});

// ─── clearCanvas ──────────────────────────────────────────────────────────────

describe('canvasSlice › clearCanvas', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
    store.setState({ edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'labeled', data: {} }] });
    store.setState({ currentDiagramId: 'some-id', isDirty: true });
  });

  it('empties nodes and edges', () => {
    store.getState().clearCanvas();
    expect(store.getState().nodes).toHaveLength(0);
    expect(store.getState().edges).toHaveLength(0);
  });

  it('resets diagram name to "Untitled Pipeline"', () => {
    store.getState().clearCanvas();
    expect(store.getState().currentDiagramName).toBe('Untitled Pipeline');
  });

  it('clears currentDiagramId and isDirty', () => {
    store.getState().clearCanvas();
    expect(store.getState().currentDiagramId).toBeNull();
    expect(store.getState().isDirty).toBe(false);
  });
});

// ─── loadTemplate ─────────────────────────────────────────────────────────────

describe('canvasSlice › loadTemplate', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.setState({ currentDiagramId: 'existing-id' });
  });

  it('replaces nodes and edges with template data', () => {
    const template = {
      name: 'Kafka Pipeline',
      nodes: [{ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'labeled', data: {} }],
    };
    store.getState().loadTemplate(template);
    expect(store.getState().nodes).toHaveLength(1);
    expect(store.getState().edges).toHaveLength(1);
    expect(store.getState().currentDiagramName).toBe('Kafka Pipeline');
  });

  it('clears currentDiagramId to force save-as-new', () => {
    store.getState().loadTemplate({ name: 'T', nodes: [], edges: [] });
    expect(store.getState().currentDiagramId).toBeNull();
  });

  it('sets isDirty', () => {
    store.setState({ isDirty: false });
    store.getState().loadTemplate({ name: 'T', nodes: [], edges: [] });
    expect(store.getState().isDirty).toBe(true);
  });
});
