import { useState, useEffect } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';
import axios from 'axios';
import useStore from '../../store';

const TRIGGER_LABELS = {
  manual: '📌 Manual',
  ai_apply: '🤖 AI Apply',
  save: '💾 Save',
  migration: '📦 Migration',
};

export default function SnapshotBrowser({ onClose }) {
  const { currentDiagramId, loadTemplate, currentDiagramName } = useStore();
  const [snapshots, setSnapshots] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (!currentDiagramId) return;
    axios
      .get(`/api/diagrams/${currentDiagramId}/snapshots`)
      .then(r => setSnapshots(r.data))
      .catch(() => {});
  }, [currentDiagramId]);

  const handleCreate = async () => {
    if (!newName.trim() || !currentDiagramId) return;
    setCreating(true);
    const { nodes, edges } = useStore.getState();
    try {
      const { data } = await axios.post(`/api/diagrams/${currentDiagramId}/snapshots`, {
        name: newName,
        trigger: 'manual',
        nodes,
        edges,
      });
      setSnapshots(prev => [data, ...prev]);
      setNewName('');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (snap) => {
    if (!confirm(`Restore snapshot "${snap.name}"? The current canvas will be replaced.`)) return;
    setRestoring(snap.id);
    try {
      const { data } = await axios.get(`/api/snapshots/${snap.id}`);
      loadTemplate({ name: currentDiagramName, nodes: data.nodes, edges: data.edges });
      onClose?.();
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-surface shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Camera size={16}/> Snapshots
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <p className="text-xs text-slate-400 mb-2">Save a named checkpoint you can restore later</p>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Snapshot name..."
              className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {snapshots.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-4">No snapshots yet.</p>
          )}
          {snapshots.map(snap => (
            <div
              key={snap.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{snap.name}</p>
                <p className="text-xs text-slate-500">
                  {TRIGGER_LABELS[snap.trigger] ?? snap.trigger} · {new Date(snap.created_at).toLocaleString()}
                </p>
                {snap.users && (
                  <p className="text-xs text-slate-600">{snap.users.display_name}</p>
                )}
              </div>
              <button
                onClick={() => handleRestore(snap)}
                disabled={restoring === snap.id}
                title="Restore this snapshot"
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
              >
                <RotateCcw size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
