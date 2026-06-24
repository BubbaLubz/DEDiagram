export const createUiSlice = (set, get) => ({
  // State
  activeTab: 'components',
  isSaveModalOpen: false,
  isLoadModalOpen: false,
  isGenerateModalOpen: false,
  isCostPanelOpen: false,
  isAccountSettingsOpen: false,

  // Theme
  darkMode: localStorage.getItem('de-dark-mode') === 'true',

  // Drawing
  isDrawingMode: false,
  penColor: '#B87040',
  penWidth: 3,
  drawingStrokes: [],

  // Actions
  openSaveModal: () => set({ isSaveModalOpen: true }),
  closeSaveModal: () => set({ isSaveModalOpen: false }),
  openLoadModal: () => set({ isLoadModalOpen: true }),
  closeLoadModal: () => set({ isLoadModalOpen: false }),
  openGenerateModal: () => set({ isGenerateModalOpen: true }),
  closeGenerateModal: () => set({ isGenerateModalOpen: false }),
  toggleCostPanel: () => set(s => ({ isCostPanelOpen: !s.isCostPanelOpen, isDetailOpen: false, selectedNode: null })),
  closeCostPanel: () => set({ isCostPanelOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  openAccountSettings: () => set({ isAccountSettingsOpen: true }),
  closeAccountSettings: () => set({ isAccountSettingsOpen: false }),
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode;
    localStorage.setItem('de-dark-mode', String(next));
    return { darkMode: next };
  }),

  toggleDrawingMode: () => set(s => ({ isDrawingMode: !s.isDrawingMode })),
  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (width) => set({ penWidth: width }),
  addStroke: (stroke) => { get().snapshot(); set(s => ({ drawingStrokes: [...s.drawingStrokes, stroke] })); },
  undoLastStroke: () => get().undo(),
  clearDrawing: () => { get().snapshot(); set({ drawingStrokes: [] }); },
});
