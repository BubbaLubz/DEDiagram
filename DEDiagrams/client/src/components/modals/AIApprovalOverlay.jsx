import { useState } from 'react';
import { Check, X, Eye } from 'lucide-react';

/**
 * Shown when an AI generation completes and needs editor approval.
 * In collaborative mode, all editors see this and vote.
 * In solo mode (only editor), auto-applies after a brief preview.
 */
export default function AIApprovalOverlay({ pipeline, onAccept, onReject }) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-surface shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-bold text-slate-100">AI Generated: {pipeline.name}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{pipeline.description}</p>
        </div>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between text-sm text-slate-300">
          <span>{pipeline.nodes?.length ?? 0} nodes · {pipeline.edges?.length ?? 0} edges</span>
          <button
            onClick={() => setPreviewMode(v => !v)}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Eye size={12}/> {previewMode ? 'Hide' : 'Preview'} JSON
          </button>
        </div>
        {previewMode && (
          <pre className="p-4 text-xs text-slate-400 overflow-auto max-h-48 bg-slate-900/80">
            {JSON.stringify(pipeline, null, 2)}
          </pre>
        )}
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}
          >
            <Check size={16}/> Apply to Canvas
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <X size={16}/> Discard
          </button>
        </div>
      </div>
    </div>
  );
}
