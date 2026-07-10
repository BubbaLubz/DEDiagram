import { useState, useEffect } from 'react';
import { X, Link, Copy, Check, UserPlus, Trash2 } from 'lucide-react';
import axios from 'axios';
import useStore from '../../store';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export default function ShareModal({ onClose }) {
  const { currentDiagramId } = useStore();
  const { user } = useCurrentUser();
  const [members, setMembers] = useState([]);
  const [shareLink, setShareLink] = useState(null);
  const [shareRole, setShareRole] = useState('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentDiagramId) return;
    axios
      .get(`/api/diagrams/${currentDiagramId}/members`)
      .then(r => setMembers(r.data))
      .catch(() => {});
  }, [currentDiagramId]);

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/diagrams/${currentDiagramId}/share-link`, {
        role: shareRole,
      });
      const origin = window.location.origin;
      setShareLink(`${origin}/join/${data.share_link_token}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableLink = async () => {
    await axios.post(`/api/diagrams/${currentDiagramId}/share-link`, { role: null });
    setShareLink(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      alert('Email invites require Supabase to be configured and a user lookup endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    await axios.delete(`/api/diagrams/${currentDiagramId}/members/${memberId}`);
    setMembers(prev => prev.filter(m => m.user_id !== memberId));
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-surface shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-base font-bold text-slate-100">Share Diagram</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Share link */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Share Link</p>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={shareRole}
                onChange={e => setShareRole(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
              >
                <Link size={12}/> Generate Link
              </button>
            </div>
            {shareLink && (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-400 truncate"
                />
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                </button>
                <button
                  onClick={handleDisableLink}
                  className="p-1.5 rounded-lg hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={14}/>
                </button>
              </div>
            )}
          </div>

          {/* Email invite */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Invite by Email</p>
            <div className="flex items-center gap-2">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-accent"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || loading}
                className="p-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40"
              >
                <UserPlus size={14}/>
              </button>
            </div>
          </div>

          {/* Members list */}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Members</p>
              <div className="space-y-1">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {m.users?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{m.users?.display_name ?? m.user_id}</p>
                      <p className="text-xs text-slate-500">{m.role}</p>
                    </div>
                    {m.role !== 'owner' && m.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
