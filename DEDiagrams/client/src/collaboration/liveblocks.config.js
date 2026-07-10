import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

/**
 * Liveblocks client configuration.
 * authEndpoint is called whenever the client needs to join a room.
 * It POSTs to our server which verifies the Clerk JWT and returns a Liveblocks token.
 */
const client = createClient({
  authEndpoint: async (room) => {
    const clerkToken = await window.__clerkGetToken?.();
    const res = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clerkToken && { Authorization: `Bearer ${clerkToken}` }),
      },
      body: JSON.stringify({ room }),
    });
    return res.json();
  },
});

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthersMapped,
  useOthers,
  useSelf,
  useStorage,
  useMutation,
  useStatus,
} = createRoomContext(client);
