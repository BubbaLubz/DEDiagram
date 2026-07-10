import { useState, useEffect } from 'react';
import { Send, Check, ChevronDown, ChevronRight } from 'lucide-react';
import axios from 'axios';
import useStore from '../../store';
import { useCurrentUser } from '../../hooks/useCurrentUser';

function CommentThread({ comment, replies, onReply, onResolve }) {
  const [expanded, setExpanded] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className={`rounded-lg border ${comment.resolved ? 'border-slate-800 opacity-50' : 'border-slate-700'} overflow-hidden`}>
      <div className="p-3 bg-slate-900/50">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
            {comment.users?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-300">{comment.users?.display_name ?? 'Unknown'}</span>
              <span className="text-xs text-slate-600">{new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-slate-200">{comment.body}</p>
          </div>
          <button
            onClick={() => onResolve(comment.id, !comment.resolved)}
            title={comment.resolved ? 'Unresolve' : 'Resolve'}
            className={`p-1 rounded transition-colors ${comment.resolved ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Check size={14}/>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setShowReply(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reply
          </button>
          {replies.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        {showReply && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
              placeholder="Write a reply..."
              className="flex-1 px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="p-1 rounded text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Send size={12}/>
            </button>
          </div>
        )}
      </div>
      {expanded && replies.length > 0 && (
        <div className="border-t border-slate-700 divide-y divide-slate-700">
          {replies.map(r => (
            <div key={r.id} className="p-3 pl-6 flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                {r.users?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-0.5">{r.users?.display_name ?? 'Unknown'}</p>
                <p className="text-sm text-slate-300">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsPanel({ nodeId }) {
  const { currentDiagramId } = useStore();
  const { user } = useCurrentUser();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentDiagramId || !nodeId) return;
    axios
      .get(`/api/diagrams/${currentDiagramId}/comments`, { params: { nodeId } })
      .then(r => setComments(r.data))
      .catch(() => {});
  }, [currentDiagramId, nodeId]);

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  const handleAdd = async () => {
    if (!newComment.trim() || !currentDiagramId) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/diagrams/${currentDiagramId}/comments`, {
        nodeId,
        body: newComment,
      });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (parentId, body) => {
    if (!currentDiagramId) return;
    try {
      const { data } = await axios.post(`/api/diagrams/${currentDiagramId}/comments`, {
        nodeId,
        body,
        parentId,
      });
      setComments(prev => [...prev, data]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (commentId, resolved) => {
    try {
      await axios.patch(`/api/comments/${commentId}`, { resolved });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved } : c));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Comments</p>

      {topLevel.length === 0 && (
        <p className="text-sm text-slate-500 italic">No comments yet.</p>
      )}

      <div className="space-y-2">
        {topLevel.map(comment => (
          <CommentThread
            key={comment.id}
            comment={comment}
            replies={getReplies(comment.id)}
            onReply={handleReply}
            onResolve={handleResolve}
            currentUserId={user?.id}
          />
        ))}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-accent resize-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newComment.trim() || loading}
          className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40 mt-0.5"
        >
          <Send size={14}/>
        </button>
      </div>
    </div>
  );
}
