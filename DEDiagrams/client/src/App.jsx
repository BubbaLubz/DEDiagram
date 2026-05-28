import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import LeftSidebar from './components/LeftSidebar';
import DiagramCanvas from './components/DiagramCanvas';
import DetailPanel from './components/DetailPanel';
import CostPanel from './components/CostPanel';
import Toolbar from './components/Toolbar';
import SaveModal from './components/modals/SaveModal';
import GenerateModal from './components/modals/GenerateModal';
import useStore from './store';

export default function App() {
  const { isDetailOpen, isCostPanelOpen, fetchSavedDiagrams } = useStore();

  useEffect(() => {
    fetchSavedDiagrams();
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#0d1117', fontFamily: 'Inter, sans-serif' }}>
        <Toolbar/>
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar/>
          <DiagramCanvas/>
          {isDetailOpen && !isCostPanelOpen && <DetailPanel/>}
          {isCostPanelOpen && <CostPanel/>}
        </div>
      </div>
      <SaveModal/>
      <GenerateModal/>
    </ReactFlowProvider>
  );
}
