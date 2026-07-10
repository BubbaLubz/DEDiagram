import { useEffect } from 'react';
import { Toaster } from 'sonner';
import LeftSidebar from '../components/LeftSidebar';
import DiagramCanvas from '../components/DiagramCanvas';
import DetailPanel from '../components/DetailPanel';
import CostPanel from '../components/CostPanel';
import Toolbar from '../components/Toolbar';
import SaveModal from '../components/modals/SaveModal';
import GenerateModal from '../components/modals/GenerateModal';
import ShareModal from '../components/modals/ShareModal';
import useStore from '../store';
import { useExposeClerkToken } from '../collaboration/useClerkToken';

/**
 * The main authenticated canvas page.
 * Extracted from App.jsx so App can focus solely on routing and auth gating.
 */
export default function Canvas() {
  const { isDetailOpen, isCostPanelOpen, isShareModalOpen, closeShareModal, fetchSavedDiagrams } = useStore();

  useExposeClerkToken();

  useEffect(() => {
    fetchSavedDiagrams();
  }, []);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: '#0d1117', fontFamily: 'Inter, sans-serif' }}
    >
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <DiagramCanvas />
        {isDetailOpen && !isCostPanelOpen && <DetailPanel />}
        {isCostPanelOpen && <CostPanel />}
      </div>
      <SaveModal />
      <GenerateModal />
      {isShareModalOpen && <ShareModal onClose={closeShareModal} />}
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
