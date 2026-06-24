import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import LeftSidebar from './components/LeftSidebar';
import DiagramCanvas from './components/DiagramCanvas';
import DetailPanel from './components/DetailPanel';
import CostPanel from './components/CostPanel';
import Toolbar from './components/Toolbar';
import SaveModal from './components/modals/SaveModal';
import GenerateModal from './components/modals/GenerateModal';
import AccountSettingsModal from './components/modals/AccountSettingsModal';
import useStore from './store';

export default function App() {
  const { isDetailOpen, isCostPanelOpen, fetchSavedDiagrams, darkMode } = useStore();

  useEffect(() => {
    fetchSavedDiagrams();
  }, []);

  // Keep <html data-theme> in sync so CSS variables and index.css rules apply
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <ReactFlowProvider>
      <div
        className="h-screen w-screen flex flex-col overflow-hidden"
        style={{ background: darkMode ? '#161b22' : '#F5F0E8', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
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
      <AccountSettingsModal/>
    </ReactFlowProvider>
  );
}
