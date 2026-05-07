import { useState, useRef, useEffect } from 'react';
import { X, Wand2, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight, KeyRound } from 'lucide-react';
import useStore from '../../store';

const EXAMPLE_PROMPTS = [
  "Real-time fraud detection system for financial transactions processing 5,000 events/sec from our PostgreSQL OLTP database",
  "E-commerce analytics platform syncing Shopify + MySQL into a data warehouse for daily business reporting with Tableau dashboards",
  "IoT sensor pipeline ingesting telemetry from 50,000 devices, with anomaly detection and a real-time ops dashboard",
  "Customer 360 lakehouse — merge CRM, billing, and support data into a medallion architecture for ML feature engineering",
  "Streaming CDC pipeline migrating a legacy Oracle database to Snowflake with sub-minute latency",
  "Log analytics platform processing 100k events/sec from microservices, storing 90 days of history for ad-hoc querying",
];

function StreamingPreview({ text }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div
      ref={scrollRef}
      className="mt-3 rounded-lg overflow-y-auto"
      style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        maxHeight: 120,
        padding: '8px 12px',
      }}
    >
      <pre
        className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
        style={{ color: '#7dd3fc', margin: 0 }}
      >
        {text}<span className="animate-pulse" style={{ color: '#6366f1' }}>▌</span>
      </pre>
    </div>
  );
}

export default function GenerateModal() {
  const { isGenerateModalOpen, closeGenerateModal, loadTemplate } = useStore();
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('de_anthropic_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('de_anthropic_key'));
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [statusMsg, setStatusMsg] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  if (!isGenerateModalOpen) return null;

  const saveKey = (key) => {
    setApiKey(key);
    if (key.trim()) localStorage.setItem('de_anthropic_key', key.trim());
    else localStorage.removeItem('de_anthropic_key');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!apiKey.trim()) { setShowKeyInput(true); return; }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setStatusMsg('Connecting to Claude…');
    setStreamingText('');
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), apiKey: apiKey.trim() }),
        signal: controller.signal,
      });

      // Pre-SSE validation errors come back as plain JSON 400
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // hold the last incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'delta') {
            accumulated += event.text;
            // Show a rolling window of the last 350 chars so the preview stays compact
            setStreamingText(accumulated.length > 350 ? accumulated.slice(-350) : accumulated);
            setStatusMsg('Generating pipeline…');
          } else if (event.type === 'done') {
            setStreamingText('');
            setResult(event.pipeline);
            setStatus('success');
            setStatusMsg(
              `Generated ${event.pipeline.nodes?.length ?? 0} components · ${event.pipeline.edges?.length ?? 0} connections`
            );
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      const msg = err.message || 'Generation failed';
      if (err instanceof TypeError && msg.includes('fetch')) {
        setStatusMsg('Cannot reach the backend server. Make sure "npm run dev" is running and port 3001 is available.');
      } else {
        setStatusMsg(msg);
      }
      setStreamingText('');
    }
  };

  const handleApply = (autoLayout = false) => {
    if (!result) return;
    loadTemplate(result);
    if (autoLayout) setTimeout(() => window.__deAutoLayout?.(), 100);
    closeGenerateModal();
    setStatus('idle');
    setResult(null);
    setPrompt('');
  };

  const handleClose = () => {
    abortRef.current?.abort();
    closeGenerateModal();
    setStatus('idle');
    setStreamingText('');
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="rounded-2xl border border-slate-700 shadow-2xl w-full flex flex-col"
        style={{ background: '#161b22', maxWidth: 640, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Wand2 size={16} className="text-white"/>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate Pipeline with AI</h2>
              <p className="text-xs text-slate-500">Describe your data application → instant architecture</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Describe your data pipeline</label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
              placeholder="e.g. Real-time fraud detection pipeline for banking transactions, processing 10k events/sec from our PostgreSQL database into Snowflake, with Airflow orchestration and Tableau dashboards..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800/60 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Mention your source systems, scale, cloud provider preference, and use case. Press Ctrl+Enter to generate.
            </p>
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example prompts</p>
            <div className="grid grid-cols-1 gap-1.5">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all hover:bg-slate-700/30 leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* API Key section */}
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <KeyRound size={13} className={apiKey ? 'text-emerald-400' : 'text-slate-500'}/>
                <span className="text-sm font-medium text-slate-300">Anthropic API Key</span>
                {apiKey && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700">configured</span>
                )}
              </div>
              {showKeyInput ? <ChevronDown size={14} className="text-slate-500"/> : <ChevronRight size={14} className="text-slate-500"/>}
            </button>

            {showKeyInput && (
              <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => saveKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white placeholder-slate-600 text-sm font-mono outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your key is stored in browser localStorage and sent directly to our local server for API calls. It never leaves your machine.
                  Get a key at <span className="text-indigo-400">console.anthropic.com</span>
                </p>
              </div>
            )}
          </div>

          {/* Status / Result area */}
          {status !== 'idle' && (
            <div className={`rounded-xl border p-4 ${
              status === 'loading' ? 'border-indigo-700 bg-indigo-900/20' :
              status === 'success' ? 'border-emerald-700 bg-emerald-900/20' :
              'border-red-700 bg-red-900/20'
            }`}>
              <div className="flex items-start gap-3">
                {status === 'loading' && <Loader2 size={16} className="text-indigo-400 animate-spin mt-0.5 flex-shrink-0"/>}
                {status === 'success' && <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0"/>}
                {status === 'error'   && <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    status === 'loading' ? 'text-indigo-300' :
                    status === 'success' ? 'text-emerald-300' : 'text-red-300'
                  }`}>{statusMsg}</p>

                  {/* Live streaming preview */}
                  {status === 'loading' && streamingText && (
                    <StreamingPreview text={streamingText}/>
                  )}

                  {status === 'success' && result && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 font-semibold">{result.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{result.description}</p>
                    </div>
                  )}
                  {status === 'error' && (
                    <p className="text-xs text-slate-500 mt-1">Check your API key and prompt, then try again.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex-shrink-0 border-t border-slate-700 pt-4">
          {status === 'success' && result ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => handleApply(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-600 text-indigo-300 hover:text-white hover:bg-indigo-600/20 text-sm font-medium transition-colors"
              >
                Apply to Canvas
              </button>
              <button
                onClick={() => handleApply(true)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Wand2 size={13}/>
                Apply + Auto-layout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || status === 'loading'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {status === 'loading'
                  ? <><Loader2 size={14} className="animate-spin"/> Generating…</>
                  : <><Wand2 size={14}/> Generate Pipeline</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
