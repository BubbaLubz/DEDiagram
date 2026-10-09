import { createContext, useContext } from 'react';

const defaults = { autoLayout: () => {}, fitView: () => {}, exportImage: () => {} };

// The context value is a MutableRefObject so the Provider can live above
// DiagramCanvas while DiagramCanvas imperatively writes the real functions in.
// Toolbar reads at call time via the proxy returned by useCanvasActions.
export const CanvasActionsContext = createContext({ current: defaults });

export const useCanvasActions = () => {
  const ref = useContext(CanvasActionsContext);
  return {
    autoLayout: (...args) => ref.current.autoLayout(...args),
    fitView:    (...args) => ref.current.fitView(...args),
    exportImage: (...args) => ref.current.exportImage(...args),
  };
};
