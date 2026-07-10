import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Shows toast notifications for collaborative room events.
 * Listens for Liveblocks presence changes (users joining/leaving).
 */
export function useCollabNotifications() {
  useEffect(() => {
    // Liveblocks notifications are best handled via room event listeners.
    // This hook is a placeholder for wiring toast() calls to room events.
  }, []);
}

export const notify = {
  userJoined: (name) => toast.info(`${name} joined the diagram`, { duration: 3000 }),
  userLeft: (name) => toast(`${name} left`, { duration: 2000 }),
  aiGenerating: (prompt) => toast.loading(`Generating: "${prompt.slice(0, 40)}..."`, { id: 'ai-gen' }),
  aiComplete: () => toast.success('AI generation complete', { id: 'ai-gen' }),
  aiError: (msg) => toast.error(msg, { id: 'ai-gen' }),
  snapshotSaved: (name) => toast.success(`Snapshot saved: ${name}`),
  commentAdded: () => toast.success('Comment added'),
  saved: () => toast.success('Diagram saved'),
  error: (msg) => toast.error(msg),
};
