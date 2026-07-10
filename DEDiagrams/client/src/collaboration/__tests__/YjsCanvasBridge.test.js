import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { YjsCanvasBridge } from '../YjsCanvasBridge';

function makeDoc() { return new Y.Doc(); }
function makeBridge(doc) { return new YjsCanvasBridge(doc); }

const sampleNode = {
  id: 'n1', type: 'component',
  position: { x: 100, y: 200 },
  data: { componentType: 'postgresql', label: 'DB', notes: 'main db', docs: '', completed: false, iconEmoji: null },
};
const sampleEdge = {
  id: 'e1', source: 'n1', target: 'n2', type: 'labeled',
  data: { label: 'CDC events', edgeType: 'cdc' },
};

describe('YjsCanvasBridge', () => {
  let doc, bridge;
  beforeEach(() => { doc = makeDoc(); bridge = makeBridge(doc); });

  describe('initFromData', () => {
    it('populates nodes and edges', () => {
      bridge.initFromData([sampleNode], [sampleEdge]);
      expect(bridge.getNodes()).toHaveLength(1);
      expect(bridge.getEdges()).toHaveLength(1);
    });

    it('clears existing data before init', () => {
      bridge.addNode(sampleNode);
      bridge.initFromData([], []);
      expect(bridge.getNodes()).toHaveLength(0);
    });
  });

  describe('addNode / getNodes', () => {
    it('adds a node and retrieves it', () => {
      bridge.addNode(sampleNode);
      const nodes = bridge.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('n1');
      expect(nodes[0].position).toEqual({ x: 100, y: 200 });
      expect(nodes[0].data.componentType).toBe('postgresql');
    });
  });

  describe('updateNodeData', () => {
    it('merges data updates into existing node', () => {
      bridge.addNode(sampleNode);
      bridge.updateNodeData('n1', { label: 'Updated DB', completed: true });
      const node = bridge.getNodes()[0];
      expect(node.data.label).toBe('Updated DB');
      expect(node.data.completed).toBe(true);
      expect(node.data.componentType).toBe('postgresql');
    });

    it('is a no-op for unknown nodeId', () => {
      bridge.updateNodeData('nonexistent', { label: 'x' });
      expect(bridge.getNodes()).toHaveLength(0);
    });
  });

  describe('moveNode', () => {
    it('updates position', () => {
      bridge.addNode(sampleNode);
      bridge.moveNode('n1', { x: 500, y: 600 });
      expect(bridge.getNodes()[0].position).toEqual({ x: 500, y: 600 });
    });
  });

  describe('deleteNode', () => {
    it('removes the node', () => {
      bridge.addNode(sampleNode);
      bridge.deleteNode('n1');
      expect(bridge.getNodes()).toHaveLength(0);
    });
  });

  describe('addEdge / deleteEdge', () => {
    it('adds and retrieves an edge', () => {
      bridge.addEdge(sampleEdge);
      const edges = bridge.getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('n1');
      expect(edges[0].data.edgeType).toBe('cdc');
    });

    it('deletes an edge', () => {
      bridge.addEdge(sampleEdge);
      bridge.deleteEdge('e1');
      expect(bridge.getEdges()).toHaveLength(0);
    });
  });

  describe('applyNodeChanges', () => {
    it('handles position change', () => {
      bridge.addNode(sampleNode);
      bridge.applyNodeChanges([{ type: 'position', id: 'n1', position: { x: 300, y: 400 } }]);
      expect(bridge.getNodes()[0].position).toEqual({ x: 300, y: 400 });
    });

    it('handles remove change', () => {
      bridge.addNode(sampleNode);
      bridge.applyNodeChanges([{ type: 'remove', id: 'n1' }]);
      expect(bridge.getNodes()).toHaveLength(0);
    });

    it('handles add change', () => {
      bridge.applyNodeChanges([{ type: 'add', item: sampleNode }]);
      expect(bridge.getNodes()).toHaveLength(1);
    });

    it('ignores select changes', () => {
      bridge.addNode(sampleNode);
      bridge.applyNodeChanges([{ type: 'select', id: 'n1', selected: true }]);
      expect(bridge.getNodes()).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('notifies subscriber on remote changes', () => {
      const changes = [];
      bridge.subscribe(state => changes.push(state));

      const doc2 = makeDoc();
      const bridge2 = new YjsCanvasBridge(doc2);
      doc2.on('update', (update) => Y.applyUpdate(doc, update));
      doc.on('update', (update) => Y.applyUpdate(doc2, update));

      bridge2.addNode(sampleNode);

      expect(changes).toHaveLength(1);
      expect(changes[0].nodes).toHaveLength(1);
    });

    it('does NOT notify subscriber for local changes (own origin)', () => {
      const changes = [];
      bridge.subscribe(state => changes.push(state));
      bridge.addNode(sampleNode);
      expect(changes).toHaveLength(0);
    });

    it('returns an unsubscribe function', () => {
      const changes = [];
      const unsub = bridge.subscribe(state => changes.push(state));
      unsub();

      const doc2 = makeDoc();
      const bridge2 = new YjsCanvasBridge(doc2);
      doc2.on('update', (update) => Y.applyUpdate(doc, update));
      bridge2.addNode(sampleNode);

      expect(changes).toHaveLength(0);
    });
  });

  describe('isEmpty', () => {
    it('returns true when no nodes or edges', () => {
      expect(bridge.isEmpty()).toBe(true);
    });

    it('returns false after adding a node', () => {
      bridge.addNode(sampleNode);
      expect(bridge.isEmpty()).toBe(false);
    });
  });
});
