import { useEffect, useMemo } from 'react';
import { useMyPresence, useOthers } from '@liveblocks/react';
import useStore from '../store';
import { SelectionPresenceContext } from './SelectionPresenceContext';
import { colorForUserId } from './selectionColor';

/**
 * Publishes the local user's selected node to Liveblocks presence, and
 * exposes everyone else's current selections (nodeId -> [{name, color}])
 * via context so ComponentNode can render a highlight ring + hover label
 * without each node subscribing to presence individually.
 */
export default function SelectionPresenceProvider({ children }) {
  const selectedNodeId = useStore(s => s.selectedNode?.id ?? null);
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();

  useEffect(() => {
    updateMyPresence({ selectedNodeId });
  }, [selectedNodeId, updateMyPresence]);

  const selectionsByNode = useMemo(() => {
    const map = new Map();
    for (const other of others) {
      const nodeId = other.presence?.selectedNodeId;
      if (!nodeId) continue;
      const uid = other.id || String(other.connectionId);
      const entry = { connectionId: other.connectionId, name: other.info?.name || 'Someone', color: colorForUserId(uid) };
      const list = map.get(nodeId);
      if (list) list.push(entry);
      else map.set(nodeId, [entry]);
    }
    return map;
  }, [others]);

  return (
    <SelectionPresenceContext.Provider value={selectionsByNode}>
      {children}
    </SelectionPresenceContext.Provider>
  );
}
