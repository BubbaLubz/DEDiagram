import { useState } from 'react';
import { X, Save, Star } from 'lucide-react';
import useStore from '../../store';

export default function SaveModal() {
  const { isSaveModalOpen, closeSaveModal, saveDiagram, currentDiagramName } = useStore();
  const [name, setName] = useState(currentDiagramName);
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isSaveModalOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a name'); return; }
    setSaving(true);
    setError('');
    try {
      await saveDiagram(name.trim(), description.trim(), isTemplate);
      closeSaveModal();
    } catch {
      setError('Failed to save. Is the server running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md" style={{ background: '#161b22' }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Save size={15} className="text-white"/>
            </div>
            <h2 className="text-base font-bold text-white">Save Diagram</h2>
          </div>
          <button onClick={closeSaveModal} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="My Pipeline Architecture"
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this pipeline architecture..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setIsTemplate(!isTemplate)}
              className={`w-9 h-5 rounded-full transition-colors ${isTemplate ? 'bg-indigo-600' : 'bg-slate-600'}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.75 transition-transform m-0.75 ${isTemplate ? 'translate-x-4' : 'translate-x-0'}`}/>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Star size={13} className={isTemplate ? 'text-amber-400' : 'text-slate-500'}/>
                Save as reusable template
              </div>
              <p className="text-xs text-slate-500">Templates appear in the Templates tab for future use</p>
            </div>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={closeSaveModal}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={14}/>
            {saving ? 'Saving...' : 'Save Diagram'}
          </button>
        </div>
      </div>
    </div>
  );
}
