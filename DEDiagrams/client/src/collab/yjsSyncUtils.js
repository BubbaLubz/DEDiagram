// node/edge `.selected` is deliberately never written to Yjs. It's
// ReactFlow's per-browser selection flag, not shared document content —
// syncing it meant one user clicking empty canvas (which makes ReactFlow
// deselect everything in the *shared* nodes array) broadcast that
// deselection to everyone, wiping other users' highlighted selections.
// Selection stays purely local; cross-user selection *awareness* is a
// separate concern already handled via Presence (see SelectionPresenceProvider).
export function stripSelected(obj) {
  const { selected, ...rest } = obj;
  return rest;
}

// True if nothing but `.selected` differs — used to decide whether a node/
// edge change is worth pushing to Yjs at all. Relies on ReactFlow's
// applyChanges only ever reassigning the one field a given change type
// touches, so an unrelated field keeps its original object reference.
export function nodeContentEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.position === b.position && a.data === b.data
    && a.width === b.width && a.height === b.height;
}

export function edgeContentEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.source === b.source && a.target === b.target && a.data === b.data;
}
