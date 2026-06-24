import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Palette ─────────────────────────────────────────────────────────────────
// Derived from the reference image: Japanese concrete box house at dusk.
// Cool structural exterior (concrete frame) ↔ warm glowing interior.
const C = {
  bg:       '#F7F4EF',   // warm parchment
  surface:  '#EDE9E2',   // warm cream (inside the frame)
  frame:    '#1C1814',   // deep charcoal — the concrete structure
  text:     '#1C1814',
  muted:    '#7A726A',
  faint:    '#B0A89E',
  divider:  '#D9D3CB',
  cta:      '#1C1814',
  ctaHover: '#2E2822',
  amber:    '#B87040',   // warm amber — the interior glow
};

const GITHUB_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const FEATURES = [
  {
    label: 'AI Generation',
    desc: 'Describe a pipeline in plain language. Claude returns a complete, positioned diagram.',
  },
  {
    label: 'Visual Canvas',
    desc: 'Drag, connect, and annotate 30+ data engineering components on an infinite canvas.',
  },
  {
    label: 'Cost Estimator',
    desc: 'Rough infrastructure cost modelling built into every node — no spreadsheet required.',
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, skip the landing page
  useEffect(() => {
    if (!loading && user) navigate('/app');
  }, [user, loading, navigate]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: `1px solid ${C.divider}`,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <span style={{ color: C.amber }}>DE</span>Diagram
        </span>
        <a
          href="/auth/github"
          style={{
            fontSize: 13, color: C.muted, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          Sign in <span style={{ fontSize: 11 }}>→</span>
        </a>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px 60px',
        minHeight: 'calc(100vh - 61px)',
      }}>

        {/* The concrete frame — fades in on load */}
        <div style={{
          border: `3px solid ${C.frame}`,
          maxWidth: 660,
          width: '100%',
          padding: '56px 56px 48px',
          background: C.surface,
          position: 'relative',
          opacity: 0,
          animation: 'frameIn 0.7s ease-out 0.1s forwards',
        }}>

          {/* Corner accent — warm amber, like interior light catching the frame edge */}
          <div style={{
            position: 'absolute', top: -1, left: -1,
            width: 40, height: 3, background: C.amber,
          }}/>
          <div style={{
            position: 'absolute', top: -1, left: -1,
            width: 3, height: 40, background: C.amber,
          }}/>

          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: C.amber, marginBottom: 24,
          }}>
            Data Engineering Diagrams
          </p>

          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 300,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: C.text,
            marginBottom: 20,
          }}>
            Every pipeline<br />
            has a structure.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Draw yours.</em>
          </h1>

          <p style={{
            fontSize: 15, color: C.muted, lineHeight: 1.7,
            marginBottom: 40, maxWidth: 480,
          }}>
            A visual canvas for data engineering architecture — with AI generation,
            modern tooling, and cost estimation built in.
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <GithubButton />
            <GoogleButton />
            <p style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
              Free to use during beta.
            </p>
          </div>
        </div>

        {/*
          ── Features ──
          Outer wrapper has overflow:hidden so cells start clipped above it.
          Each cell begins at translateY(-100%) — hidden behind the main frame's
          bottom edge — then falls into position one by one.
        */}
        <div style={{ maxWidth: 660, width: '100%', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            borderLeft: `1px solid ${C.divider}`,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '28px 24px',
                borderTop: `1px solid ${C.divider}`,
                borderRight: `1px solid ${C.divider}`,
                borderBottom: `1px solid ${C.divider}`,
                opacity: 0,
                animation: 'fallOut 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                animationDelay: `${0.75 + i * 0.17}s`,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text, marginBottom: 8 }}>
                  {f.label}
                </p>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '20px 40px',
        borderTop: `1px solid ${C.divider}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: C.faint }}>DEDiagram</span>
        <span style={{ fontSize: 12, color: C.faint }}>Built with Claude</span>
      </footer>

      <style>{`
        @keyframes frameIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fallOut {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function GithubButton() {
  const [hover, setHover] = useState(false);
  return (
    <a
      href="/auth/github"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 24px',
        background: hover ? C.ctaHover : C.cta,
        color: '#F7F4EF',
        textDecoration: 'none',
        fontSize: 14, fontWeight: 500,
        transition: 'background 0.15s',
        cursor: 'pointer',
        width: 240, boxSizing: 'border-box',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {GITHUB_ICON}
      Continue with GitHub
    </a>
  );
}

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

function GoogleButton() {
  const [hover, setHover] = useState(false);
  return (
    <a
      href="/auth/google"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '11px 24px',
        background: hover ? C.surface : '#fff',
        color: C.text,
        textDecoration: 'none',
        fontSize: 14, fontWeight: 500,
        border: `1px solid ${C.divider}`,
        transition: 'background 0.15s',
        cursor: 'pointer',
        width: 240, boxSizing: 'border-box',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {GOOGLE_ICON}
      Continue with Google
    </a>
  );
}
