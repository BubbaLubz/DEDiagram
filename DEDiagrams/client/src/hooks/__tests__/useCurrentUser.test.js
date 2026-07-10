import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrentUser } from '../useCurrentUser';

vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '@clerk/clerk-react';

describe('useCurrentUser', () => {
  it('returns isLoaded=false and null user while Clerk is initializing', () => {
    useUser.mockReturnValue({ isLoaded: false, isSignedIn: false, user: null });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isSignedIn).toBe(false);
  });

  it('returns null user when signed out', () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
  });

  it('returns a normalized CollabUser when signed in with all fields', () => {
    useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_abc123',
        fullName: 'Jane Smith',
        username: 'janesmith',
        emailAddresses: [{ emailAddress: 'jane@example.com' }],
        imageUrl: 'https://example.com/avatar.jpg',
      },
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toEqual({
      id: 'user_abc123',
      displayName: 'Jane Smith',
      email: 'jane@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    expect(result.current.isSignedIn).toBe(true);
  });

  it('falls back to username when fullName is null', () => {
    useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_456',
        fullName: null,
        username: 'johndoe',
        emailAddresses: [{ emailAddress: 'john@example.com' }],
        imageUrl: null,
      },
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user.displayName).toBe('johndoe');
    expect(result.current.user.avatarUrl).toBeNull();
  });

  it('falls back to email when fullName and username are both null', () => {
    useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_789',
        fullName: null,
        username: null,
        emailAddresses: [{ emailAddress: 'anon@example.com' }],
        imageUrl: null,
      },
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user.displayName).toBe('anon@example.com');
  });

  it('falls back to "Anonymous" when all name fields are null', () => {
    useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_000',
        fullName: null,
        username: null,
        emailAddresses: [],
        imageUrl: null,
      },
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user.displayName).toBe('Anonymous');
  });
});
