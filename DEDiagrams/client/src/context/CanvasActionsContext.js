import { createContext, useContext } from 'react';

export const CanvasActionsContext = createContext({
  autoLayout: () => {},
  fitView: () => {},
  exportImage: () => {},
});

export const useCanvasActions = () => useContext(CanvasActionsContext);
