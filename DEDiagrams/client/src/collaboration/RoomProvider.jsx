import { RoomProvider as LiveblocksRoomProvider } from './liveblocks.config';
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import { useRoom } from './liveblocks.config';
import useStore from '../store';

/**
 * Provides the Yjs document for a diagram room.
 * Must be used inside a LiveblocksRoomProvider.
 */
function YjsDocProvider({ children }) {
  const room = useRoom();
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const setYjsBridge = useStore(s => s.setYjsBridge);

  useEffect(() => {
    if (!room) return;

    const ydoc = new Y.Doc();
    const provider = new LiveblocksYjsProvider(room, ydoc);
    ydocRef.current = ydoc;
    providerRef.current = provider;

    import('./YjsCanvasBridge').then(({ YjsCanvasBridge }) => {
      const bridge = new YjsCanvasBridge(ydoc);
      setYjsBridge(bridge);
    });

    return () => {
      setYjsBridge(null);
      provider.destroy();
      ydoc.destroy();
    };
  }, [room, setYjsBridge]);

  return children;
}

/**
 * Wraps children with a Liveblocks room and a Yjs document for a diagram.
 *
 * @param {{ diagramId: string, children: React.ReactNode }} props
 */
export default function CollabRoomProvider({ diagramId, children }) {
  const roomId = `diagram:${diagramId}`;

  return (
    <LiveblocksRoomProvider
      id={roomId}
      initialPresence={{ cursor: null, selectedNodeIds: [], editingNodeId: null }}
    >
      <YjsDocProvider>
        {children}
      </YjsDocProvider>
    </LiveblocksRoomProvider>
  );
}
