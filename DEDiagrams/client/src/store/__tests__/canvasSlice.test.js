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

// ─── deleteNode ───────────────────────────────────────────────────────────────

describe('canvasSlice › deleteNode', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
    store.getState().addNode({ id: 'n2', type: 'component', position: { x: 300, y: 0 }, data: {} });
    store.setState({
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'labeled', data: {} }],
    });
  });

  it('removes the specified node', () => {
    store.getState().deleteNode('n1');
    expect(store.getState().nodes.find(n => n.id === 'n1')).toBeUndefined();
    expect(store.getState().nodes).toHaveLength(1);
  });

  it('removes edges connected to the deleted node', () => {
    store.getState().deleteNode('n1');
    expect(store.getState().edges).toHaveLength(0);
  });

  it('preserves edges not connected to the deleted node', () => {
    store.getState().addNode({ id: 'n3', type: 'component', position: { x: 600, y: 0 }, data: {} });
    store.setState(s => ({
      edges: [...s.edges, { id: 'e2', source: 'n2', target: 'n3', type: 'labeled', data: {} }],
    }));
    store.getState().deleteNode('n1');
    expect(store.getState().edges).toHaveLength(1);
    expect(store.getState().edges[0].id).toBe('e2');
  });

  it('clears selectedNode and closes detail when the deleted node was selected', () => {
    store.getState().selectNode(store.getState().nodes[0]);
    store.getState().deleteNode('n1');
    expect(store.getState().selectedNode).toBeNull();
    expect(store.getState().isDetailOpen).toBe(false);
  });

  it('does not clear selectedNode when a different node is deleted', () => {
    store.getState().selectNode(store.getState().nodes[1]);
    store.getState().deleteNode('n1');
    expect(store.getState().selectedNode?.id).toBe('n2');
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

// ─── Yjs bridge integration ────────────────────────────────────────────────

describe('canvasSlice › Yjs bridge integration', () => {
  it('stores bridge ref via setYjsBridge', () => {
    const store = makeStore();
    const mockBridge = {
      isEmpty: () => true,
      getNodes: () => [],
      getEdges: () => [],
      subscribe: () => () => {},
    };
    store.getState().setYjsBridge(mockBridge);
    expect(store.getState().yjsBridge).toBe(mockBridge);
  });

  it('calls bridge.addNode when addNode is called with a bridge', () => {
    const store = makeStore();
    const addedNodes = [];
    const mockBridge = {
      isEmpty: () => true,
      getNodes: () => [],
      getEdges: () => [],
      subscribe: () => () => {},
      addNode: (n) => addedNodes.push(n),
    };
    store.getState().setYjsBridge(mockBridge);
    const node = { id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} };
    store.getState().addNode(node);
    expect(addedNodes).toHaveLength(1);
    expect(addedNodes[0].id).toBe('n1');
  });

  it('calls bridge.updateNodeData when updateNodeData is called', () => {
    const store = makeStore();
    const updates = [];
    const mockBridge = {
      isEmpty: () => true,
      getNodes: () => [],
      getEdges: () => [],
      subscribe: () => () => {},
      addNode: () => {},
      updateNodeData: (id, d) => updates.push({ id, d }),
    };
    store.getState().setYjsBridge(mockBridge);
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: { label: 'X' } });
    store.getState().updateNodeData('n1', { label: 'Y' });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ id: 'n1', d: { label: 'Y' } });
  });

  it('calls bridge.deleteNode when deleteNode is called', () => {
    const store = makeStore();
    const deleted = [];
    const mockBridge = {
      isEmpty: () => true,
      getNodes: () => [],
      getEdges: () => [],
      subscribe: () => () => {},
      addNode: () => {},
      deleteNode: (id) => deleted.push(id),
      deleteEdge: () => {},
    };
    store.getState().setYjsBridge(mockBridge);
    store.getState().addNode({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
    store.getState().deleteNode('n1');
    expect(deleted).toContain('n1');
  });
});
