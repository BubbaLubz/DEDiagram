import { useEffect } from 'react';
import { useRoom } from '@liveblocks/react';
import { getYjsProviderForRoom } from '@liveblocks/yjs';
import useStore from '../store';

// Bridges the existing Zustand state with a shared Yjs doc, so multiple
// browsers editing the same diagram converge on the same state. Deliberately
// syncs at the store boundary rather than rewriting every mutation in
// canvasSlice.js/docSlice.js to talk to Yjs directly — much smaller surface
// area, and those slices keep working exactly as before for a single user.
//
// nodes/edges are unordered collections (rendered by id, not sequence), kept
// in a Y.Map. docCells is an ordered *document* — cell order is the content
// — so it's kept in a Y.Array instead, which preserves order across peers;
// a Y.Map's iteration order isn't guaranteed and would risk cells silently
// reshuffling between users.
export default function useYjsSync() {
  const room = useRoom();

  useEffect(() => {
    const yProvider = getYjsProviderForRoom(room);
    const yDoc = yProvider.getYDoc();
    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');
    const yDocCells = yDoc.getArray('docCells');
    let initialized = false;

    // What was last written to (or read from) each shared type — lets the
    // outgoing sync push only what actually changed, instead of rewriting
    // everything on every keystroke or drag-move event.
    let lastNodes = new Map();
    let lastEdges = new Map();
    let lastDocCells = [];

    const applyRemoteState = () => {
      const nodes = Array.from(yNodes.values());
      const edges = Array.from(yEdges.values());
      const docCells = yDocCells.toArray();
      lastNodes = new Map(nodes.map(n => [n.id, n]));
      lastEdges = new Map(edges.map(e => [e.id, e]));
      lastDocCells = docCells;
      useStore.setState({ nodes, edges, docCells });
    };

    // First client into an empty room seeds Yjs from whatever's already
    // loaded locally (the diagram just fetched via GET /api/diagrams/:id).
    // Anyone joining after that gets the existing shared state instead.
    const handleSync = (isSynced) => {
      if (!isSynced || initialized) return;
      initialized = true;
      if (yNodes.size === 0 && yEdges.size === 0 && yDocCells.length === 0) {
        const { nodes, edges, docCells } = useStore.getState();
        yDoc.transact(() => {
          nodes.forEach(n => yNodes.set(n.id, n));
          edges.forEach(e => yEdges.set(e.id, e));
          yDocCells.insert(0, docCells);
        }, 'init');
        lastNodes = new Map(nodes.map(n => [n.id, n]));
        lastEdges = new Map(edges.map(e => [e.id, e]));
        lastDocCells = docCells;
      } else {
        applyRemoteState();
      }
    };

    yProvider.on('sync', handleSync);
    if (yProvider.synced) handleSync(true);

    // Remote changes (from other clients, or our own 'init' write echoing
    // back) flow into Zustand — except transactions tagged 'local', which
    // would otherwise loop straight back into another outgoing write.
    const onRemoteChange = (_events, transaction) => {
      if (transaction.origin === 'local') return;
      applyRemoteState();
    };
    yNodes.observe(onRemoteChange);
    yEdges.observe(onRemoteChange);
    yDocCells.observe(onRemoteChange);

    // Local changes mirror into the shared doc, coalesced to once per
    // animation frame — a drag or a fast typist fires many store updates a
    // second, and syncing only what actually changed each frame (instead of
    // the whole diagram/document) is what keeps that from bogging down.
    let rafId = null;
    const flush = () => {
      rafId = null;
      const { nodes, edges, docCells } = useStore.getState();
      let didSomething = false;

      const nextNodes = new Map();
      const changedNodes = [];
      nodes.forEach(n => {
        nextNodes.set(n.id, n);
        if (lastNodes.get(n.id) !== n) changedNodes.push(n);
      });
      const removedNodeIds = [...lastNodes.keys()].filter(id => !nextNodes.has(id));

      const nextEdges = new Map();
      const changedEdges = [];
      edges.forEach(e => {
        nextEdges.set(e.id, e);
        if (lastEdges.get(e.id) !== e) changedEdges.push(e);
      });
      const removedEdgeIds = [...lastEdges.keys()].filter(id => !nextEdges.has(id));

      // Trim the matching prefix/suffix between what was last synced and
      // the current cells, so a single edited cell (the common case) only
      // touches that one index instead of rewriting the whole document.
      let start = 0;
      const minLen = Math.min(lastDocCells.length, docCells.length);
      while (start < minLen && lastDocCells[start] === docCells[start]) start++;
      let endOld = lastDocCells.length;
      let endNew = docCells.length;
      while (endOld > start && endNew > start && lastDocCells[endOld - 1] === docCells[endNew - 1]) {
        endOld--; endNew--;
      }
      const docCellsChanged = endOld > start || endNew > start;

      if (changedNodes.length || removedNodeIds.length || changedEdges.length || removedEdgeIds.length || docCellsChanged) {
        yDoc.transact(() => {
          changedNodes.forEach(n => yNodes.set(n.id, n));
          removedNodeIds.forEach(id => yNodes.delete(id));
          changedEdges.forEach(e => yEdges.set(e.id, e));
          removedEdgeIds.forEach(id => yEdges.delete(id));
          if (docCellsChanged) {
            if (endOld > start) yDocCells.delete(start, endOld - start);
            if (endNew > start) yDocCells.insert(start, docCells.slice(start, endNew));
          }
        }, 'local');
        didSomething = true;
      }

      if (didSomething) {
        lastNodes = nextNodes;
        lastEdges = nextEdges;
        lastDocCells = docCells;
      }
    };

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (!initialized) return;
      if (state.nodes === prevState.nodes && state.edges === prevState.edges && state.docCells === prevState.docCells) return;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      yProvider.off('sync', handleSync);
      yNodes.unobserve(onRemoteChange);
      yEdges.unobserve(onRemoteChange);
      yDocCells.unobserve(onRemoteChange);
      unsubscribe();
    };
  }, [room]);
}
