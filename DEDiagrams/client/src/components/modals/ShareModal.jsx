import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Trash2, Search } from 'lucide-react';
import axios from 'axios';
import useStore from '../../store';
import { useAuth } from '../../context/AuthContext';

function initialsOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function ShareModal() {
  const { isShareModalOpen, closeShareModal, currentDiagramId, currentDiagramName } = useStore();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const myMembership = members.find(m => m.user_id === user?.id);
  const isOwner = myMembership?.role === 'owner';

  useEffect(() => {
    if (!isShareModalOpen || !currentDiagramId) return;
    setLoadingMembers(true);
    axios.get(`/api/diagrams/${currentDiagramId}/members`)
      .then(r => setMembers(r.data))
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoadingMembers(false));
  }, [isShareModalOpen, currentDiagramId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get('/api/users/search', { params: { q: query.trim() } });
        const memberIds = new Set(members.map(m => m.user_id));
        setResults(data.filter(u => !memberIds.has(u.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, members]);

  if (!isShareModalOpen) return null;

  const handleAdd = async (targetUser, role) => {
    setAddingId(targetUser.id);
    setError('');
    try {
      const { data } = await axios.post(`/api/diagrams/${currentDiagramId}/members`, {
        userId: targetUser.id, role,
      });
      setMembers(prev => [...prev, { user_id: targetUser.id, role: data.role, users: targetUser }]);
      setResults(prev => prev.filter(u => u.id !== targetUser.id));
      setQuery('');
    } catch {
      setError('Failed to add — only the owner can share this diagram.');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await axios.delete(`/api/diagrams/${currentDiagramId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch {
      setError('Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(23,19,16,0.7)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: '#262019', border: '1px solid #453B2F' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #453B2F' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#E8DFD0' }}>Share diagram</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9C8F7C' }}>{currentDiagramName}</p>
          </div>
          <button
            onClick={closeShareModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9C8F7C' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#322A21'; e.currentTarget.style.color = '#E8DFD0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9C8F7C'; }}
          >
            <X size={16}/>
          </button>
        </div>

        <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isOwner && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#C7BCA9' }}>Add people</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6E6355' }}/>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ border: '1px solid #453B2F', background: '#322A21', color: '#E8DFD0' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#E3A854'}
                  onBlur={e => e.currentTarget.style.borderColor = '#453B2F'}
                />
              </div>

              {query.trim().length >= 2 && (
                <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid #453B2F' }}>
                  {searching ? (
                    <p className="text-xs px-3 py-2" style={{ color: '#6E6355' }}>Searching…</p>
                  ) : results.length === 0 ? (
                    <p className="text-xs px-3 py-2" style={{ color: '#6E6355' }}>No matching users</p>
                  ) : (
                    results.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{ borderBottom: '1px solid #453B2F' }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: '#453B2F', color: '#C7BCA9' }}
                        >
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/> : initialsOf(u.display_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: '#E8DFD0' }}>{u.display_name || u.email}</p>
                          {u.email && <p className="text-xs truncate" style={{ color: '#6E6355' }}>{u.email}</p>}
                        </div>
                        <button
                          onClick={() => handleAdd(u, 'editor')}
                          disabled={addingId === u.id}
                          className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-40"
                          style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
                        >
                          Editor
                        </button>
                        <button
                          onClick={() => handleAdd(u, 'viewer')}
                          disabled={addingId === u.id}
                          className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-40 flex items-center gap-1"
                          style={{ background: '#E3A854', color: '#241F19' }}
                        >
                          <UserPlus size={11}/> Viewer
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs" style={{ color: '#E8735F' }}>{error}</p>}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9C8F7C' }}>
              People with access
            </p>
            {loadingMembers ? (
              <p className="text-xs" style={{ color: '#6E6355' }}>Loading…</p>
            ) : (
              <div className="space-y-1">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#322A21' }}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: '#453B2F', color: '#C7BCA9' }}
                    >
                      {m.users?.avatar_url
                        ? <img src={m.users.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/>
                        : initialsOf(m.users?.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#E8DFD0' }}>
                        {m.users?.display_name ?? 'Unknown user'}{m.user_id === user?.id ? ' (you)' : ''}
                      </p>
                      <p className="text-xs capitalize" style={{ color: '#6E6355' }}>{m.role}</p>
                    </div>
                    {isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(m.user_id)}
                        className="p-1 rounded transition-colors"
                        style={{ color: '#6E6355' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#E8735F'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6E6355'}
                      >
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isOwner && !loadingMembers && (
            <p className="text-xs" style={{ color: '#6E6355' }}>Only the owner can add or remove people.</p>
          )}
        </div>
      </div>
    </div>
  );
}
