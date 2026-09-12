import { create } from 'zustand';
import { createCanvasSlice } from './canvasSlice';
import { createUiSlice } from './uiSlice';
import { createDiagramSlice } from './diagramSlice';
import { createDocSlice } from './docSlice';
import { createSchemaSlice } from './schemaSlice';

const useStore = create((set, get) => ({
  ...createCanvasSlice(set, get),
  ...createUiSlice(set, get),
  ...createDiagramSlice(set, get),
  ...createDocSlice(set, get),
  ...createSchemaSlice(set, get),
}));

export default useStore;
