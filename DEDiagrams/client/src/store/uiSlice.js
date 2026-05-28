export const createUiSlice = (set) => ({
  // State
  activeTab: 'components',
  isSaveModalOpen: false,
  isLoadModalOpen: false,
  isGenerateModalOpen: false,
  isCostPanelOpen: false,

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
});
