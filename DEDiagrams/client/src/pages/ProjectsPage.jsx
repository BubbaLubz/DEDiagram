import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, LogOut, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useStore from '../store';
import { useTheme } from '../theme';
import ProjectThumbnail from '../components/ProjectThumbnail';

function ProjectCard({ diagram, onOpen, onRename, onDelete, P }) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(diagram.name);

  const submitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== diagram.name) onRename(diagram.id, trimmed);
    else setNameValue(diagram.name);
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 6, border: `1px solid ${P.divider}`, overflow: 'hidden',
        background: P.card, cursor: editing ? 'default' : 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
        borderColor: hover ? P.amber + '88' : P.divider,
      }}
      onClick={() => !editing && onOpen(diagram.id)}
    >
      <div style={{ background: P.surface, borderBottom: `1px solid ${P.divider}` }}>
        <ProjectThumbnail nodes={diagram.nodes} edges={diagram.edges} width={280} height={140} background="transparent"/>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {editing ? (
            <input
              autoFocus
              value={nameValue}
              onClick={e => e.stopPropagation()}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') { setNameValue(diagram.name); setEditing(false); }
              }}
              style={{
                flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600,
                background: P.input, color: P.text, border: `1.5px solid ${P.amber}`,
                borderRadius: 3, padding: '2px 6px', outline: 'none',
              }}
            />
          ) : (
            <h3 style={{
              flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: P.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {diagram.name}
            </h3>
          )}

          {editing ? (
            <>
              <button onClick={e => { e.stopPropagation(); submitRename(); }} style={iconBtnStyle(P)}>
                <Check size={13}/>
              </button>
              <button onClick={e => { e.stopPropagation(); setNameValue(diagram.name); setEditing(false); }} style={iconBtnStyle(P)}>
                <X size={13}/>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 2, opacity: hover ? 1 : 0, transition: 'opacity 0.15s' }}>
              {diagram.role !== 'viewer' && (
                <button
                  onClick={e => { e.stopPropagation(); setNameValue(diagram.name); setEditing(true); }}
                  title="Rename"
                  style={iconBtnStyle(P)}
                >
                  <Pencil size={12}/>
                </button>
              )}
              {diagram.role === 'owner' && (
                <button
                  onClick={e => { e.stopPropagation(); onDelete(diagram.id, diagram.name); }}
                  title="Delete"
                  style={{ ...iconBtnStyle(P), color: P.danger }}
                >
                  <Trash2 size={12}/>
                </button>
              )}
            </div>
          )}
        </div>
        <p style={{ fontSize: 11, color: P.faint }}>
          {diagram.nodes?.length ?? 0} components · updated {new Date(diagram.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

const iconBtnStyle = (P) => ({
  padding: 5, borderRadius: 4, border: 'none', background: 'none',
  cursor: 'pointer', color: P.muted, display: 'flex', alignItems: 'center',
});

export default function ProjectsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const P = useTheme();
  const { savedDiagrams, fetchSavedDiagrams, loadDiagram, deleteDiagram, renameDiagram, createNewDiagram } = useStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchSavedDiagrams().finally(() => setLoading(false));
  }, []);

  const handleOpen = async (id) => {
    await loadDiagram(id);
    navigate('/app');
  };

  const handleNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await createNewDiagram();
      navigate('/app');
    } catch {
      alert('Failed to create a new project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await deleteDiagram(id);
  };

  if (authLoading || !user) return null;

  return (
    <div className="bg-grain" style={{ minHeight: '100vh', background: P.bg, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: `1px solid ${P.divider}`,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: P.text }}>
          <span style={{ color: P.amber }}>DE</span>Diagram
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user?.name && <span style={{ fontSize: 13, color: P.muted }}>{user.name}</span>}
          <button
            onClick={logout}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: P.muted,
              background: 'none', border: `1px solid ${P.divider}`, borderRadius: 6,
              padding: '6px 10px', cursor: 'pointer',
            }}
          >
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: P.text, marginBottom: 4 }}>Your projects</h1>
        <p style={{ fontSize: 13, color: P.muted, marginBottom: 24 }}>
          Pick up where you left off, or start a new pipeline diagram.
        </p>

        {loading ? (
          <p style={{ fontSize: 13, color: P.faint }}>Loading…</p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
          }}>
            <div
              onClick={handleNew}
              style={{
                borderRadius: 6, border: `1.5px dashed ${P.divider}`, minHeight: 220,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: creating ? 'default' : 'pointer', color: P.muted,
                opacity: creating ? 0.6 : 1, transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!creating) { e.currentTarget.style.borderColor = P.amber; e.currentTarget.style.color = P.amber; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.divider; e.currentTarget.style.color = P.muted; }}
            >
              <Plus size={22}/>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{creating ? 'Creating…' : 'New project'}</span>
            </div>

            {savedDiagrams.map(d => (
              <ProjectCard
                key={d.id}
                diagram={d}
                onOpen={handleOpen}
                onRename={renameDiagram}
                onDelete={handleDelete}
                P={P}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
