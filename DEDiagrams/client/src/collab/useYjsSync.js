import { useEffect } from 'react';
import { useRoom } from '@liveblocks/react';
import { getYjsProviderForRoom } from '@liveblocks/yjs';
import useStore from '../store';
import { stripSelected, nodeContentEqual, edgeContentEqual } from './yjsSyncUtils';

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
//
// node/edge `.selected` is deliberately never written to Yjs. It's
// ReactFlow's per-browser selection flag, not shared document content —
// syncing it meant one user clicking empty canvas (which makes ReactFlow
// deselect everything in the *shared* nodes array) broadcast that
// deselection to everyone, wiping other users' highlighted selections.
// Selection stays purely local; cross-user selection *awareness* is a
// separate concern already handled via Presence (see SelectionPresenceProvider).
export default function useYjsSync() {
  const room = useRoom();

  useEffect(() => {
    const yProvider = getYjsProviderForRoom(room);
    const yDoc = yProvider.getYDoc();
    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');
    const yDocCells = yDoc.getArray('docCells');
    const yMeta = yDoc.getMap('metadata');
    let initialized = false;

    // What was last written to (or read from) each shared type — lets the
    // outgoing sync push only what actually changed, instead of rewriting
    // everything on every keystroke or drag-move event.
    let lastNodes = new Map();
    let lastEdges = new Map();
    let lastDocCells = [];
    let lastName = null;

    const applyRemoteState = () => {
      // Re-attach each node/edge's *current local* selected flag — it was
      // never part of what's in Yjs (see stripSelected above), so a remote
      // update must not silently unselect whatever the local user has
      // selected right now.
      const localNodesById = new Map(useStore.getState().nodes.map(n => [n.id, n]));
      const localEdgesById = new Map(useStore.getState().edges.map(e => [e.id, e]));

      const nodes = Array.from(yNodes.values()).map(n => ({ ...n, selected: localNodesById.get(n.id)?.selected ?? false }));
      const edges = Array.from(yEdges.values()).map(e => ({ ...e, selected: localEdgesById.get(e.id)?.selected ?? false }));
      const docCells = yDocCells.toArray();
      const name = yMeta.get('name');
      lastNodes = new Map(nodes.map(n => [n.id, n]));
      lastEdges = new Map(edges.map(e => [e.id, e]));
      lastDocCells = docCells;
      // Older rooms synced before name-sharing existed won't have this key
      // yet — leave whatever REST already loaded into currentDiagramName.
      if (name !== undefined) lastName = name;
      useStore.setState({ nodes, edges, docCells, ...(name !== undefined ? { currentDiagramName: name } : {}) });
    };

    // First client into an empty room seeds Yjs from whatever's already
    // loaded locally (the diagram just fetched via GET /api/diagrams/:id).
    // Anyone joining after that gets the existing shared state instead.
    const handleSync = (isSynced) => {
      if (!isSynced || initialized) return;
      initialized = true;
      if (yNodes.size === 0 && yEdges.size === 0 && yDocCells.length === 0 && !yMeta.has('name')) {
        const { nodes, edges, docCells, currentDiagramName } = useStore.getState();
        yDoc.transact(() => {
          nodes.forEach(n => yNodes.set(n.id, stripSelected(n)));
          edges.forEach(e => yEdges.set(e.id, stripSelected(e)));
          yDocCells.insert(0, docCells);
          yMeta.set('name', currentDiagramName);
        }, 'init');
        lastNodes = new Map(nodes.map(n => [n.id, n]));
        lastEdges = new Map(edges.map(e => [e.id, e]));
        lastDocCells = docCells;
        lastName = currentDiagramName;
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
    yMeta.observe(onRemoteChange);

    // Local changes mirror into the shared doc, coalesced to once per
    // animation frame — a drag or a fast typist fires many store updates a
    // second, and syncing only what actually changed each frame (instead of
    // the whole diagram/document) is what keeps that from bogging down.
    let rafId = null;
    const flush = () => {
      rafId = null;
      const { nodes, edges, docCells, currentDiagramName } = useStore.getState();
      let didSomething = false;
      const nameChanged = currentDiagramName !== lastName;

      const nextNodes = new Map();
      const changedNodes = [];
      nodes.forEach(n => {
        nextNodes.set(n.id, n);
        const prev = lastNodes.get(n.id);
        if (!prev || !nodeContentEqual(prev, n)) changedNodes.push(n);
      });
      const removedNodeIds = [...lastNodes.keys()].filter(id => !nextNodes.has(id));

      const nextEdges = new Map();
      const changedEdges = [];
      edges.forEach(e => {
        nextEdges.set(e.id, e);
        const prev = lastEdges.get(e.id);
        if (!prev || !edgeContentEqual(prev, e)) changedEdges.push(e);
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

      if (changedNodes.length || removedNodeIds.length || changedEdges.length || removedEdgeIds.length || docCellsChanged || nameChanged) {
        yDoc.transact(() => {
          changedNodes.forEach(n => yNodes.set(n.id, stripSelected(n)));
          removedNodeIds.forEach(id => yNodes.delete(id));
          changedEdges.forEach(e => yEdges.set(e.id, stripSelected(e)));
          removedEdgeIds.forEach(id => yEdges.delete(id));
          if (docCellsChanged) {
            if (endOld > start) yDocCells.delete(start, endOld - start);
            if (endNew > start) yDocCells.insert(start, docCells.slice(start, endNew));
          }
          if (nameChanged) yMeta.set('name', currentDiagramName);
        }, 'local');
        didSomething = true;
      }

      if (didSomething) {
        lastNodes = nextNodes;
        lastEdges = nextEdges;
        lastDocCells = docCells;
        lastName = currentDiagramName;
      }
    };

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (!initialized) return;
      if (state.nodes === prevState.nodes && state.edges === prevState.edges
        && state.docCells === prevState.docCells && state.currentDiagramName === prevState.currentDiagramName) return;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      yProvider.off('sync', handleSync);
      yNodes.unobserve(onRemoteChange);
      yEdges.unobserve(onRemoteChange);
      yDocCells.unobserve(onRemoteChange);
      yMeta.unobserve(onRemoteChange);
      unsubscribe();
    };
  }, [room]);
}
