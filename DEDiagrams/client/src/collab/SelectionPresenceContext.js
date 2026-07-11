import { createContext, useContext } from 'react';

// Map<nodeId, Array<{ connectionId, name, color }>> — which OTHER users (not
// the local one) currently have each node selected. Populated by
// SelectionPresenceProvider, read by ComponentNode.
export const SelectionPresenceContext = createContext(new Map());

const EMPTY = [];

export function useNodeSelections(nodeId) {
  const map = useContext(SelectionPresenceContext);
  return map.get(nodeId) || EMPTY;
}
