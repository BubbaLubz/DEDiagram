import * as Y from 'yjs';

/**
 * YjsCanvasBridge manages the Yjs-side of the collaborative canvas.
 *
 * Nodes and edges are stored as plain objects in Y.Map with string keys.
 * Each change to the Yjs doc (from remote clients) is surfaced through
 * the `subscribe(callback)` method, which the store observes to update
 * React state.
 *
 * Local changes are written to Yjs using `apply*` / `add*` / `update*` / `delete*`
 * methods, which pass `this` as the transaction origin so the observer
 * can skip re-applying our own changes.
 */
export class YjsCanvasBridge {
  constructor(ydoc) {
    this.ydoc = ydoc;
    this.yNodes = ydoc.getMap('nodes');
    this.yEdges = ydoc.getMap('edges');
    this.yMeta = ydoc.getMap('metadata');
    this._subscriptions = [];
  }

  // ── Serialization helpers ──────────────────────────────────────────────────

  _nodeToYjs(node) {
    return {
      type: node.type || 'component',
      positionX: node.position?.x ?? 0,
      positionY: node.position?.y ?? 0,
      componentType: node.data?.componentType ?? '',
      label: node.data?.label ?? '',
      notes: node.data?.notes ?? '',
      docs: node.data?.docs ?? '',
      completed: node.data?.completed ?? false,
      iconEmoji: node.data?.iconEmoji ?? null,
      width: node.width ?? null,
      height: node.height ?? null,
    };
  }

  _nodeFromYjs(id, raw) {
    return {
      id,
      type: raw.type || 'component',
      position: { x: raw.positionX ?? 0, y: raw.positionY ?? 0 },
      data: {
        componentType: raw.componentType ?? '',
        label: raw.label ?? '',
        notes: raw.notes ?? '',
        docs: raw.docs ?? '',
        completed: raw.completed ?? false,
        iconEmoji: raw.iconEmoji ?? null,
      },
      width: raw.width ?? undefined,
      height: raw.height ?? undefined,
    };
  }

  _edgeToYjs(edge) {
    return {
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? 'batch',
      edgeType: edge.data?.edgeType ?? 'batch',
    };
  }

  _edgeFromYjs(id, raw) {
    return {
      id,
      source: raw.source,
      target: raw.target,
      type: 'labeled',
      data: { label: raw.label ?? 'batch', edgeType: raw.edgeType ?? 'batch' },
    };
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getNodes() {
    const nodes = [];
    this.yNodes.forEach((raw, id) => nodes.push(this._nodeFromYjs(id, raw)));
    return nodes;
  }

  getEdges() {
    const edges = [];
    this.yEdges.forEach((raw, id) => edges.push(this._edgeFromYjs(id, raw)));
    return edges;
  }

  isEmpty() {
    return this.yNodes.size === 0 && this.yEdges.size === 0;
  }

  // ── Write (local changes → Yjs) ────────────────────────────────────────────

  /** Seed the Yjs doc from existing nodes/edges (e.g. when loading from DB). */
  initFromData(nodes, edges) {
    this.ydoc.transact(() => {
      this.yNodes.clear();
      nodes.forEach(n => this.yNodes.set(n.id, this._nodeToYjs(n)));
      this.yEdges.clear();
      edges.forEach(e => this.yEdges.set(e.id, this._edgeToYjs(e)));
    }, this);
  }

  addNode(node) {
    this.ydoc.transact(() => {
      this.yNodes.set(node.id, this._nodeToYjs(node));
    }, this);
  }

  updateNodeData(nodeId, data) {
    const existing = this.yNodes.get(nodeId);
    if (!existing) return;
    this.ydoc.transact(() => {
      this.yNodes.set(nodeId, {
        ...existing,
        ...(data.componentType !== undefined && { componentType: data.componentType }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.docs !== undefined && { docs: data.docs }),
        ...(data.completed !== undefined && { completed: data.completed }),
        ...(data.iconEmoji !== undefined && { iconEmoji: data.iconEmoji }),
      });
    }, this);
  }

  moveNode(nodeId, position) {
    const existing = this.yNodes.get(nodeId);
    if (!existing) return;
    this.ydoc.transact(() => {
      this.yNodes.set(nodeId, { ...existing, positionX: position.x, positionY: position.y });
    }, this);
  }

  deleteNode(nodeId) {
    this.ydoc.transact(() => {
      this.yNodes.delete(nodeId);
    }, this);
  }

  addEdge(edge) {
    this.ydoc.transact(() => {
      this.yEdges.set(edge.id, this._edgeToYjs(edge));
    }, this);
  }

  updateEdgeData(edgeId, data) {
    const existing = this.yEdges.get(edgeId);
    if (!existing) return;
    this.ydoc.transact(() => {
      this.yEdges.set(edgeId, { ...existing, ...data });
    }, this);
  }

  deleteEdge(edgeId) {
    this.ydoc.transact(() => {
      this.yEdges.delete(edgeId);
    }, this);
  }

  /**
   * Apply ReactFlow onNodesChange changes.
   * Writes structural changes (add, remove, position, dimensions) to Yjs.
   * 'select' changes are local-only and are applied directly to Zustand.
   */
  applyNodeChanges(changes) {
    this.ydoc.transact(() => {
      for (const change of changes) {
        if (change.type === 'add') {
          this.yNodes.set(change.item.id, this._nodeToYjs(change.item));
        } else if (change.type === 'remove') {
          this.yNodes.delete(change.id);
        } else if (change.type === 'position' && change.position) {
          const existing = this.yNodes.get(change.id);
          if (existing) {
            this.yNodes.set(change.id, {
              ...existing,
              positionX: change.position.x,
              positionY: change.position.y,
            });
          }
        } else if (change.type === 'dimensions' && change.dimensions) {
          const existing = this.yNodes.get(change.id);
          if (existing) {
            this.yNodes.set(change.id, {
              ...existing,
              width: change.dimensions.width,
              height: change.dimensions.height,
            });
          }
        }
        // 'select' and 'reset' are local-only — handled by the caller applying to Zustand directly
      }
    }, this);
  }

  applyEdgeChanges(changes) {
    this.ydoc.transact(() => {
      for (const change of changes) {
        if (change.type === 'add') {
          this.yEdges.set(change.item.id, this._edgeToYjs(change.item));
        } else if (change.type === 'remove') {
          this.yEdges.delete(change.id);
        }
      }
    }, this);
  }

  // ── Subscribe to remote changes ────────────────────────────────────────────

  /**
   * Subscribe to remote changes from other clients.
   * The callback is called with { nodes, edges } whenever the Yjs doc changes
   * due to a remote update (own updates are filtered by transaction origin).
   *
   * @param {(state: { nodes: any[], edges: any[] }) => void} callback
   * @returns {() => void} unsubscribe function
   */
  subscribe(callback) {
    const handler = (_event, transaction) => {
      if (transaction.origin === this) return;
      callback({ nodes: this.getNodes(), edges: this.getEdges() });
    };
    this.yNodes.observe(handler);
    this.yEdges.observe(handler);
    this._subscriptions.push(handler);
    return () => {
      this.yNodes.unobserve(handler);
      this.yEdges.unobserve(handler);
    };
  }

  destroy() {
    this._subscriptions = [];
  }
}
