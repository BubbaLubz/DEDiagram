import { useEffect, useMemo, useRef } from 'react';
import { useMyPresence, useOthers } from '@liveblocks/react';
import useStore from '../store';
import { SelectionPresenceContext } from './SelectionPresenceContext';
import { colorForUserId } from './selectionColor';

/**
 * Publishes the local user's selected node(s) to Liveblocks presence, and
 * exposes everyone else's current selections (nodeId -> [{name, color}])
 * via context so ComponentNode can render a highlight ring + hover label
 * without each node subscribing to presence individually.
 */
export default function SelectionPresenceProvider({ children }) {
  // node.selected reflects ReactFlow's actual selection state (click,
  // shift-click, or drag-box select-all) — selectedNode in the store is a
  // separate, single-node concept only used for the DetailPanel, so it
  // misses multi-selection entirely.
  const nodes = useStore(s => s.nodes);
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const lastKeyRef = useRef('');

  const selectedNodeIds = useMemo(() => nodes.filter(n => n.selected).map(n => n.id), [nodes]);

  useEffect(() => {
    const key = selectedNodeIds.join(',');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    updateMyPresence({ selectedNodeIds });
  }, [selectedNodeIds, updateMyPresence]);

  const selectionsByNode = useMemo(() => {
    const map = new Map();
    for (const other of others) {
      const ids = other.presence?.selectedNodeIds;
      if (!Array.isArray(ids) || ids.length === 0) continue;
      const uid = other.id || String(other.connectionId);
      const entry = { connectionId: other.connectionId, name: other.info?.name || 'Someone', color: colorForUserId(uid) };
      for (const nodeId of ids) {
        const list = map.get(nodeId);
        if (list) list.push(entry);
        else map.set(nodeId, [entry]);
      }
    }
    return map;
  }, [others]);

  return (
    <SelectionPresenceContext.Provider value={selectionsByNode}>
      {children}
    </SelectionPresenceContext.Provider>
  );
}
