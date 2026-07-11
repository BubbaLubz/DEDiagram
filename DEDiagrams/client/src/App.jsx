import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react';
import LeftSidebar from './components/LeftSidebar';
import DiagramCanvas from './components/DiagramCanvas';
import DetailPanel from './components/DetailPanel';
import CostPanel from './components/CostPanel';
import Toolbar from './components/Toolbar';
import DocPanel from './components/DocPanel';
import SaveModal from './components/modals/SaveModal';
import GenerateModal from './components/modals/GenerateModal';
import AccountSettingsModal from './components/modals/AccountSettingsModal';
import ShareModal from './components/modals/ShareModal';
import useYjsSync from './collab/useYjsSync';
import useStore from './store';
import { useTheme } from './theme';

// Mounted inside RoomProvider so useRoom() has context to attach to.
function CollabSync() {
  useYjsSync();
  return null;
}

export default function App() {
  const { isDetailOpen, isCostPanelOpen, fetchSavedDiagrams, darkMode, currentDiagramId } = useStore();
  const P = useTheme();

  useEffect(() => {
    fetchSavedDiagrams();
  }, []);

  // Keep <html data-theme> in sync so CSS variables and index.css rules apply
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {currentDiagramId && (
        <RoomProvider id={currentDiagramId} initialPresence={{}}>
          <CollabSync/>
        </RoomProvider>
      )}
      <ReactFlowProvider>
        <div
          className="h-screen w-screen flex flex-col overflow-hidden"
          style={{ background: P.bg, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
        >
          <Toolbar/>
          <div className="flex flex-1 overflow-hidden">
            <LeftSidebar/>
            <DiagramCanvas/>
            {isDetailOpen && !isCostPanelOpen && <DetailPanel/>}
            {isCostPanelOpen && <CostPanel/>}
          </div>
        </div>
        <DocPanel/>
        <SaveModal/>
        <GenerateModal/>
        <AccountSettingsModal/>
        <ShareModal/>
      </ReactFlowProvider>
    </LiveblocksProvider>
  );
}
