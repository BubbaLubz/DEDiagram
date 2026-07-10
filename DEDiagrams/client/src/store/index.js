import { create } from 'zustand';
import { createCanvasSlice } from './canvasSlice';
import { createUiSlice } from './uiSlice';
import { createDiagramSlice } from './diagramSlice';
import { createDocSlice } from './docSlice';

const useStore = create((set, get) => ({
  ...createCanvasSlice(set, get),
  ...createUiSlice(set, get),
  ...createDiagramSlice(set, get),
  ...createDocSlice(set, get),
}));

export default useStore;
