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
import ConfirmClearModal from './components/modals/ConfirmClearModal';
import ErdWorkspace from './components/erd/ErdWorkspace';
import useYjsSync from './collab/useYjsSync';
import SelectionPresenceProvider from './collab/SelectionPresenceProvider';
import useStore from './store';
import { useTheme } from './theme';

// Mounted inside RoomProvider so useRoom() has context to attach to.
function CollabSync() {
  useYjsSync();
  return null;
}

function AppShell() {
  const { isDetailOpen, isCostPanelOpen } = useStore();
  const P = useTheme();

  return (
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
      <ConfirmClearModal/>
      <AccountSettingsModal/>
      <ShareModal/>
      <ErdWorkspace/>
    </ReactFlowProvider>
  );
}

export default function App() {
  const { fetchSavedDiagrams, darkMode, currentDiagramId } = useStore();

  useEffect(() => {
    fetchSavedDiagrams();
  }, []);

  // Google-Docs-style autosave: periodically flush unsaved edits to the
  // server without requiring the Save modal. No-ops when there's nothing
  // dirty or no diagram id yet (see diagramSlice.autosave).
  useEffect(() => {
    const id = setInterval(() => useStore.getState().autosave(), 4000);
    return () => clearInterval(id);
  }, []);

  // Keep <html data-theme> in sync so CSS variables and index.css rules apply
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {currentDiagramId ? (
        // RoomProvider wraps the whole shell (not just the Yjs bridge) so
        // presence hooks (selection highlights, hover labels) are reachable
        // from ComponentNode, deep inside DiagramCanvas.
        <RoomProvider id={currentDiagramId} initialPresence={{ selectedNodeIds: [] }}>
          <SelectionPresenceProvider>
            <CollabSync/>
            <AppShell/>
          </SelectionPresenceProvider>
        </RoomProvider>
      ) : (
        <AppShell/>
      )}
    </LiveblocksProvider>
  );
}
