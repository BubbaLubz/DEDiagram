import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import useStore from '../../store';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function ConfirmClearModal() {
  const { isConfirmClearOpen, pendingTemplate, confirmLoadTemplate, cancelLoadTemplate } = useStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isConfirmClearOpen) { setVisible(false); return; }
    if (prefersReducedMotion()) { setVisible(true); return; }
    // Mount in the pre-transition state first, then flip on the next frame
    // so the browser actually paints the "from" state before animating.
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [isConfirmClearOpen]);

  if (!isConfirmClearOpen) return null;

  const reduced = prefersReducedMotion();
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-28 px-4"
      style={{
        background: 'rgba(23,19,16,0.45)',
        opacity: reduced ? 1 : (visible ? 1 : 0),
        transition: reduced ? 'none' : `opacity 200ms ${ease}`,
      }}
      onClick={cancelLoadTemplate}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-clear-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl shadow-2xl"
        style={{
          background: '#262019',
          border: '1px solid #453B2F',
          transform: reduced ? 'none' : (visible ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.96)'),
          opacity: reduced ? 1 : (visible ? 1 : 0),
          transition: reduced ? 'none' : `transform 240ms ${ease}, opacity 200ms ${ease}`,
        }}
      >
        <div className="flex gap-3 p-5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(227,168,84,0.15)' }}
          >
            <AlertTriangle size={16} style={{ color: '#E3A854' }}/>
          </div>
          <div>
            <h2 id="confirm-clear-title" className="text-sm font-bold" style={{ color: '#E8DFD0' }}>
              Replace current canvas?
            </h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C8F7C' }}>
              Loading "{pendingTemplate?.name || 'this template'}" will clear everything currently on the
              canvas{'—'}including for anyone else viewing this diagram live.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={cancelLoadTemplate}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
          >
            Cancel
          </button>
          <button
            onClick={confirmLoadTemplate}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#E3A854', color: '#241F19' }}
          >
            Clear &amp; load
          </button>
        </div>
      </div>
    </div>
  );
}
