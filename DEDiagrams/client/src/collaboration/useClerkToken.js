import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';

/**
 * Exposes the Clerk getToken function on window so liveblocks.config.js
 * can call it without importing React hooks (config is non-component code).
 * Called once in the authenticated app shell.
 */
export function useExposeClerkToken() {
  const { getToken } = useAuth();
  useEffect(() => {
    window.__clerkGetToken = () => getToken();
    return () => {
      window.__clerkGetToken = null;
    };
  }, [getToken]);
}
