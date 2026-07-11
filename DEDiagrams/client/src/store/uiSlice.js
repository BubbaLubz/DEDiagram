// Shortest distance from `p` to the segment a→b.
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function strokeHitByPoint(stroke, point, radius) {
  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(point, pts[i], pts[i + 1]) <= radius) return true;
  }
  return pts.length === 1 && Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= radius;
}

export const createUiSlice = (set, get) => ({
  // State
  activeTab: 'components',
  isSaveModalOpen: false,
  isLoadModalOpen: false,
  isGenerateModalOpen: false,
  isCostPanelOpen: false,
  isAccountSettingsOpen: false,
  isShareModalOpen: false,

  // Theme
  darkMode: localStorage.getItem('de-dark-mode') === 'true',

  // Drawing
  isDrawingMode: false,
  drawTool: 'pen', // 'pen' | 'eraser'
  penColor: '#B87040',
  penWidth: 3,
  eraserSize: 20,
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

  openShareModal: () => set({ isShareModalOpen: true }),
  closeShareModal: () => set({ isShareModalOpen: false }),

  openAccountSettings: () => set({ isAccountSettingsOpen: true }),
  closeAccountSettings: () => set({ isAccountSettingsOpen: false }),
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode;
    localStorage.setItem('de-dark-mode', String(next));
    return { darkMode: next };
  }),

  toggleDrawingMode: () => set(s => ({ isDrawingMode: !s.isDrawingMode, drawTool: s.isDrawingMode ? 'pen' : s.drawTool })),
  setDrawTool: (tool) => set({ drawTool: tool }),
  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (width) => set({ penWidth: width }),
  setEraserSize: (size) => set({ eraserSize: size }),
  addStroke: (stroke) => { get().snapshot(); set(s => ({ drawingStrokes: [...s.drawingStrokes, stroke] })); },
  eraseStrokesAt: (point, radius) => set(s => {
    const kept = s.drawingStrokes.filter(stroke => !strokeHitByPoint(stroke, point, radius));
    return kept.length === s.drawingStrokes.length ? s : { drawingStrokes: kept };
  }),
  undoLastStroke: () => get().undo(),
  clearDrawing: () => { get().snapshot(); set({ drawingStrokes: [] }); },
});
