import { useState } from 'react';
import { useOthers, useSelf } from '../../collaboration/liveblocks.config';
import { useCurrentUser } from '../../hooks/useCurrentUser';

/**
 * Shows avatar bubbles for all users currently in the room.
 * Click an avatar to enter "follow mode" (viewport tracks that user).
 */
export default function ActiveUsers({ onFollowUser }) {
  const { user } = useCurrentUser();
  let others = [];
  let self = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    others = useOthers();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    self = useSelf();
  } catch {
    return null;
  }

  const [followingId, setFollowingId] = useState(null);

  const handleFollow = (connectionId) => {
    if (followingId === connectionId) {
      setFollowingId(null);
      onFollowUser?.(null);
    } else {
      setFollowingId(connectionId);
      onFollowUser?.(connectionId);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div
        title={user?.displayName ?? 'You'}
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-600 overflow-hidden flex-shrink-0"
        style={{ background: self?.info?.color ?? '#58a6ff', color: 'white' }}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
        ) : (
          (user?.displayName?.[0] ?? '?').toUpperCase()
        )}
      </div>

      {others.slice(0, 6).map((other) => (
        <button
          key={other.connectionId}
          onClick={() => handleFollow(other.connectionId)}
          title={
            followingId === other.connectionId
              ? `Following ${other.info?.name ?? 'Someone'} (click to unfollow)`
              : other.info?.name ?? 'Someone'
          }
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0 transition-all ${
            followingId === other.connectionId
              ? 'ring-2 ring-white scale-110'
              : 'hover:scale-105 opacity-90 hover:opacity-100'
          }`}
          style={{
            background: other.info?.color ?? '#94a3b8',
            color: 'white',
            border: `2px solid ${other.info?.color ?? '#94a3b8'}`,
          }}
        >
          {other.info?.avatar ? (
            <img src={other.info.avatar} alt="" className="w-full h-full object-cover"/>
          ) : (
            (other.info?.name?.[0] ?? '?').toUpperCase()
          )}
        </button>
      ))}

      {others.length > 6 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-slate-400 bg-slate-700">
          +{others.length - 6}
        </div>
      )}
    </div>
  );
}
