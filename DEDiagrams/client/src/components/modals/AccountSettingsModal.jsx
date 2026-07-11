import { X, Moon, Sun } from 'lucide-react';
import useStore from '../../store';
import { useTheme } from '../../theme';

function Toggle({ checked, onToggle, P }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none',
        background: checked ? P.amber : P.divider,
        cursor: 'pointer', padding: 3, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background 0.2s, justify-content 0s',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(23,19,16,0.3)',
        transition: 'none',
      }}/>
    </button>
  );
}

export default function AccountSettingsModal() {
  const { isAccountSettingsOpen, closeAccountSettings, darkMode, toggleDarkMode } = useStore();
  const P = useTheme();

  if (!isAccountSettingsOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(23,19,16,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) closeAccountSettings(); }}
    >
      <div style={{
        width: 420, background: P.bg, borderRadius: 6,
        border: `1px solid ${P.divider}`,
        boxShadow: '0 16px 48px rgba(23,19,16,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: `1px solid ${P.divider}`,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Account Settings</h2>
          <button
            onClick={closeAccountSettings}
            style={{
              padding: 5, borderRadius: 4, border: 'none',
              background: 'none', cursor: 'pointer', color: P.faint,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = P.text}
            onMouseLeave={e => e.currentTarget.style.color = P.faint}
          >
            <X size={15}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Appearance section */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: P.muted, marginBottom: 12,
            }}>
              Appearance
            </p>

            <div style={{
              padding: '12px 14px', borderRadius: 4,
              border: `1px solid ${P.divider}`,
              background: P.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: P.card, border: `1px solid ${P.divider}`,
                }}>
                  {darkMode
                    ? <Moon size={14} style={{ color: P.amber }}/>
                    : <Sun  size={14} style={{ color: P.amber }}/>}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: P.text }}>Dark Mode</p>
                  <p style={{ fontSize: 11, color: P.faint, marginTop: 1 }}>
                    {darkMode ? 'Using dark theme' : 'Using light theme'}
                  </p>
                </div>
              </div>
              <Toggle checked={darkMode} onToggle={toggleDarkMode} P={P}/>
            </div>
          </div>

          {/* More settings placeholder */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: P.muted, marginBottom: 12,
            }}>
              Account
            </p>
            <div style={{
              padding: '12px 14px', borderRadius: 4,
              border: `1px solid ${P.divider}`,
              background: P.surface,
            }}>
              <p style={{ fontSize: 13, color: P.faint }}>Profile settings coming soon.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: `1px solid ${P.divider}`,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={closeAccountSettings}
            style={{
              padding: '7px 18px', borderRadius: 4, fontSize: 13, fontWeight: 500,
              border: `1px solid ${P.divider}`, background: P.surface,
              color: P.text, cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = P.hover}
            onMouseLeave={e => e.currentTarget.style.background = P.surface}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
