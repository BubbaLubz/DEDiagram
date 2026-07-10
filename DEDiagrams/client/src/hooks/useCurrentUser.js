import { useUser } from '@clerk/clerk-react';

/**
 * @typedef {Object} CollabUser
 * @property {string} id        - Clerk user ID (stable, use as DB foreign key)
 * @property {string} displayName - Full name › username › email fallback chain
 * @property {string} email     - Primary email address
 * @property {string | null} avatarUrl - Profile image URL or null
 */

/**
 * @typedef {Object} CurrentUserResult
 * @property {CollabUser | null} user
 * @property {boolean} isLoaded   - false while Clerk is initializing
 * @property {boolean} isSignedIn
 */

/**
 * Normalized current-user hook.
 *
 * Wraps Clerk's useUser() and returns a stable CollabUser shape so the rest
 * of the app never imports from @clerk/clerk-react directly for identity data.
 * This makes auth-provider swaps and testing straightforward.
 *
 * @returns {CurrentUserResult}
 */
export function useCurrentUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isLoaded || !isSignedIn || !user) {
    return { user: null, isLoaded: isLoaded ?? false, isSignedIn: isSignedIn ?? false };
  }

  return {
    user: {
      id: user.id,
      displayName:
        user.fullName ||
        user.username ||
        user.emailAddresses[0]?.emailAddress ||
        'Anonymous',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      avatarUrl: user.imageUrl ?? null,
    },
    isLoaded: true,
    isSignedIn: true,
  };
}
