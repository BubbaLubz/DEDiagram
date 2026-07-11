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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(23,19,16,0.7)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: '#262019', border: '1px solid #453B2F' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #453B2F' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E3A854' }}>
              <Save size={15} style={{ color: '#241F19' }}/>
            </div>
            <h2 className="text-base font-bold" style={{ color: '#E8DFD0' }}>Save Diagram</h2>
          </div>
          <button
            onClick={closeSaveModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9C8F7C' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#322A21'; e.currentTarget.style.color = '#E8DFD0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9C8F7C'; }}
          >
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#C7BCA9' }}>Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="My Pipeline Architecture"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ border: '1px solid #453B2F', background: '#322A21', color: '#E8DFD0' }}
              onFocus={e => e.currentTarget.style.borderColor = '#E3A854'}
              onBlur={e => e.currentTarget.style.borderColor = '#453B2F'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#C7BCA9' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this pipeline architecture..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none"
              style={{ border: '1px solid #453B2F', background: '#322A21', color: '#E8DFD0' }}
              onFocus={e => e.currentTarget.style.borderColor = '#E3A854'}
              onBlur={e => e.currentTarget.style.borderColor = '#453B2F'}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setIsTemplate(!isTemplate)}
              className="w-9 h-5 rounded-full transition-colors"
              style={{ background: isTemplate ? '#E3A854' : '#453B2F' }}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.75 transition-transform m-0.75 ${isTemplate ? 'translate-x-4' : 'translate-x-0'}`}/>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#C7BCA9' }}>
                <Star size={13} style={{ color: isTemplate ? '#E3A854' : '#6E6355' }}/>
                Save as reusable template
              </div>
              <p className="text-xs" style={{ color: '#9C8F7C' }}>Templates appear in the Templates tab for future use</p>
            </div>
          </label>

          {error && <p className="text-sm" style={{ color: '#E8735F' }}>{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={closeSaveModal}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#E3A854', color: '#241F19' }}
          >
            <Save size={14}/>
            {saving ? 'Saving...' : 'Save Diagram'}
          </button>
        </div>
      </div>
    </div>
  );
}
