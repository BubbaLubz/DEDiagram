import { useState, useRef, useEffect } from 'react';
import { X, Wand2, Loader2, CheckCircle, AlertCircle, PencilLine, Sparkles } from 'lucide-react';
import useStore from '../../store';

const GENERATE_PROMPTS = [
  "Real-time fraud detection system for financial transactions processing 5,000 events/sec from our PostgreSQL OLTP database",
  "E-commerce analytics platform syncing Shopify + MySQL into a data warehouse for daily business reporting with Tableau dashboards",
  "IoT sensor pipeline ingesting telemetry from 50,000 devices, with anomaly detection and a real-time ops dashboard",
  "Customer 360 lakehouse — merge CRM, billing, and support data into a medallion architecture for ML feature engineering",
  "Streaming CDC pipeline migrating a legacy Oracle database to Snowflake with sub-minute latency",
  "Log analytics platform processing 100k events/sec from microservices, storing 90 days of history for ad-hoc querying",
];

const EDIT_PROMPTS = [
  "Add a Redis caching layer between the processing stage and the serving layer",
  "Replace the batch ingestion with real-time CDC using Debezium and Kafka",
  "Add an Airflow orchestration layer to schedule the existing batch jobs",
  "Add a data quality check step using dbt between raw storage and the warehouse",
  "Split the warehouse into a Bronze/Silver/Gold medallion architecture using Delta Lake",
  "Add an AI enrichment step using the Anthropic API before serving to the dashboard",
];

// This modal is a permanently-dark focused surface (like the canvas
// workspace), independent of the app's light/dark chrome toggle — matching
// how it already behaved before this redesign. Re-themed warm per DESIGN.md.
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
        background: '#171310',
        border: '1px solid #4A3B2C',
        maxHeight: 120,
        padding: '8px 12px',
      }}
    >
      <pre
        className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
        style={{ color: '#D9BE95', margin: 0 }}
      >
        {text}<span className="animate-pulse" style={{ color: '#E3A854' }}>▌</span>
      </pre>
    </div>
  );
}

export default function GenerateModal() {
  const { isGenerateModalOpen, closeGenerateModal, loadTemplate, nodes, edges } = useStore();
  const [mode, setMode] = useState('generate'); // 'generate' | 'edit'
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [statusMsg, setStatusMsg] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState(null);
  const [clarifyQuestions, setClarifyQuestions] = useState(null);
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [otherMode, setOtherMode] = useState({});
  const [basePrompt, setBasePrompt] = useState('');
  const OTHER_ANSWER_MAX_LEN = 150;
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  const hasCanvas = nodes.length > 0;

  if (!isGenerateModalOpen) return null;

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setPrompt('');
    setStatus('idle');
    setStreamingText('');
    setResult(null);
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setOtherMode({});
  };

  const handleGenerate = async (overrides = {}) => {
    const promptToSend = overrides.promptOverride ?? prompt;
    if (!promptToSend.trim()) return;
    if (mode === 'edit' && !hasCanvas) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setStatusMsg('Connecting to Claude…');
    setStreamingText('');
    setResult(null);
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setOtherMode({});

    const url = mode === 'edit' ? '/api/edit' : '/api/generate';
    const body = mode === 'edit'
      ? { prompt: promptToSend.trim(), currentDiagram: { nodes, edges }, skipClarification: !!overrides.skipClarification }
      : { prompt: promptToSend.trim(), skipClarification: !!overrides.skipClarification };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

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
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'delta') {
            accumulated += event.text;
            setStreamingText(accumulated.length > 350 ? accumulated.slice(-350) : accumulated);
            setStatusMsg(mode === 'edit' ? 'Applying edits…' : 'Generating pipeline…');
          } else if (event.type === 'done') {
            setStreamingText('');
            setResult(event.pipeline);
            setStatus('success');
            setStatusMsg(
              `${mode === 'edit' ? 'Updated to' : 'Generated'} ${event.pipeline.nodes?.length ?? 0} components · ${event.pipeline.edges?.length ?? 0} connections`
            );
          } else if (event.type === 'clarify') {
            setStreamingText('');
            setBasePrompt(promptToSend.trim());
            setClarifyQuestions(event.questions);
            setStatus('clarify');
            setStatusMsg('A few quick questions before we build this…');
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
    setMode('generate');
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setOtherMode({});
  };

  const handleClose = () => {
    abortRef.current?.abort();
    closeGenerateModal();
    setStatus('idle');
    setStreamingText('');
    setResult(null);
    setMode('generate');
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setOtherMode({});
  };

  const handleSelectAnswer = (questionIndex, option) => {
    setClarifyAnswers(prev => ({ ...prev, [questionIndex]: option }));
    setOtherMode(prev => ({ ...prev, [questionIndex]: false }));
  };

  const handleToggleOther = (questionIndex) => {
    setOtherMode(prev => ({ ...prev, [questionIndex]: true }));
    setClarifyAnswers(prev => ({ ...prev, [questionIndex]: '' }));
  };

  const handleCustomAnswerChange = (questionIndex, text) => {
    setClarifyAnswers(prev => ({ ...prev, [questionIndex]: text.slice(0, OTHER_ANSWER_MAX_LEN) }));
  };

  const handleSubmitClarification = () => {
    const answerLines = clarifyQuestions
      .map((q, i) => (clarifyAnswers[i] && clarifyAnswers[i] !== 'Not sure') ? `${q.question} ${clarifyAnswers[i]}` : null)
      .filter(Boolean);
    const enrichedPrompt = answerLines.length
      ? `${basePrompt}\n\nAdditional context:\n${answerLines.join('\n')}`
      : basePrompt;
    handleGenerate({ promptOverride: enrichedPrompt, skipClarification: true });
  };

  const allClarificationAnswered = clarifyQuestions?.every((_, i) => clarifyAnswers[i]?.trim()) ?? false;

  const examplePrompts = mode === 'edit' ? EDIT_PROMPTS : GENERATE_PROMPTS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(23,19,16,0.75)' }}>
      <div
        className="rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ background: '#262019', border: '1px solid #453B2F', maxWidth: 640, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #453B2F' }}>
          <div className="flex items-center gap-3">
            <div className="bg-washi w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F7F2E7', border: '1px solid #453B2F' }}>
              <Wand2 size={16} style={{ color: '#2B2926' }}/>
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#E8DFD0' }}>AI Pipeline Assistant</h2>
              <p className="text-xs" style={{ color: '#9C8F7C' }}>Generate a new diagram or edit the current one</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9C8F7C' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#322A21'; e.currentTarget.style.color = '#E8DFD0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9C8F7C'; }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(23,19,16,0.4)', border: '1px solid #453B2F' }}>
            <button
              onClick={() => handleModeSwitch('generate')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
              style={mode === 'generate'
                ? { background: '#E3A854', color: '#241F19' }
                : { color: '#9C8F7C' }}
            >
              <Sparkles size={13}/>
              Generate New
            </button>
            <button
              onClick={() => handleModeSwitch('edit')}
              disabled={!hasCanvas}
              title={!hasCanvas ? 'Add components to the canvas first' : undefined}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={mode === 'edit'
                ? { background: '#E3A854', color: '#241F19' }
                : { color: '#9C8F7C' }}
            >
              <PencilLine size={13}/>
              Edit Current
            </button>
          </div>

          {/* Edit mode canvas stats banner */}
          {mode === 'edit' && hasCanvas && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ border: '1px solid #6B4B23', background: 'rgba(227,168,84,0.1)', color: '#E3A854' }}>
              <PencilLine size={12}/>
              Editing current canvas — <span className="font-semibold">{nodes.length} components, {edges.length} connections</span>
            </div>
          )}

          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#C7BCA9' }}>
              {mode === 'edit' ? 'Describe your changes' : 'Describe your data pipeline'}
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
              placeholder={
                mode === 'edit'
                  ? 'e.g. Add a Redis caching layer between Spark and Tableau, and replace batch ingestion with real-time Kafka streaming...'
                  : 'e.g. Real-time fraud detection pipeline for banking transactions, processing 10k events/sec from our PostgreSQL database into Snowflake, with Airflow orchestration and Tableau dashboards...'
              }
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none leading-relaxed"
              style={{ border: '1px solid #453B2F', background: 'rgba(23,19,16,0.4)', color: '#E8DFD0' }}
              onFocus={e => e.currentTarget.style.borderColor = '#E3A854'}
              onBlur={e => e.currentTarget.style.borderColor = '#453B2F'}
            />
            <p className="text-xs mt-1.5" style={{ color: '#6E6355' }}>
              {mode === 'edit'
                ? 'Describe what to add, remove, or change. Existing components will be preserved where possible. Press Ctrl+Enter to apply.'
                : 'Mention your source systems, scale, cloud provider preference, and use case. Press Ctrl+Enter to generate.'
              }
            </p>
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9C8F7C' }}>
              {mode === 'edit' ? 'Example edits' : 'Example prompts'}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {examplePrompts.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                  className="text-left text-xs px-3 py-2 rounded-lg transition-all leading-relaxed"
                  style={{ border: '1px solid #453B2F', color: '#9C8F7C' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#E8DFD0'; e.currentTarget.style.borderColor = '#6E6355'; e.currentTarget.style.background = 'rgba(69,59,47,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9C8F7C'; e.currentTarget.style.borderColor = '#453B2F'; e.currentTarget.style.background = 'none'; }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Status / Result area */}
          {status !== 'idle' && (
            <div
              className="rounded-xl p-4"
              style={{
                border: `1px solid ${
                  status === 'loading' ? '#453B2F' :
                  status === 'success' ? '#38492C' :
                  status === 'clarify' ? '#622E12' : '#4D1C17'
                }`,
                background:
                  status === 'loading' ? 'rgba(23,19,16,0.3)' :
                  status === 'success' ? 'rgba(92,122,74,0.12)' :
                  status === 'clarify' ? 'rgba(163,80,43,0.12)' : 'rgba(162,58,46,0.12)',
              }}
            >
              <div className="flex items-start gap-3">
                {status === 'loading' && <Loader2 size={16} className="animate-spin mt-0.5 flex-shrink-0" style={{ color: '#C7BCA9' }}/>}
                {status === 'success' && <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#7FA366' }}/>}
                {status === 'clarify'  && <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#C97B4E' }}/>}
                {status === 'error'   && <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#E8735F' }}/>}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: status === 'loading' ? '#C7BCA9' :
                        status === 'success' ? '#A3C48D' :
                        status === 'clarify' ? '#D59A7D' : '#F09A8D',
                    }}
                  >{statusMsg}</p>

                  {status === 'loading' && streamingText && (
                    <StreamingPreview text={streamingText}/>
                  )}

                  {status === 'success' && result && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold" style={{ color: '#C7BCA9' }}>{result.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9C8F7C' }}>{result.description}</p>
                    </div>
                  )}
                  {status === 'error' && (
                    <p className="text-xs mt-1" style={{ color: '#9C8F7C' }}>Check your prompt and try again.</p>
                  )}

                  {status === 'clarify' && clarifyQuestions && (
                    <div className="mt-3 space-y-4">
                      {clarifyQuestions.map((q, qi) => (
                        <div key={qi}>
                          <p className="text-xs font-medium mb-1.5" style={{ color: '#C7BCA9' }}>{q.question}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(q.options || []).map((opt, oi) => {
                              const isActive = !otherMode[qi] && clarifyAnswers[qi] === opt;
                              return (
                                <button
                                  key={oi}
                                  onClick={() => handleSelectAnswer(qi, opt)}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                                  style={isActive
                                    ? { border: '1px solid #A3502B', background: 'rgba(163,80,43,0.25)', color: '#D59A7D' }
                                    : { border: '1px solid #453B2F', color: '#9C8F7C' }}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handleToggleOther(qi)}
                              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                              style={otherMode[qi]
                                ? { border: '1px solid #A3502B', background: 'rgba(163,80,43,0.25)', color: '#D59A7D' }
                                : { border: '1px solid #453B2F', color: '#9C8F7C' }}
                            >
                              Other — describe it
                            </button>
                          </div>
                          {otherMode[qi] && (
                            <div className="mt-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={clarifyAnswers[qi] || ''}
                                onChange={e => handleCustomAnswerChange(qi, e.target.value)}
                                maxLength={OTHER_ANSWER_MAX_LEN}
                                placeholder="Type a short answer…"
                                className="w-full text-xs px-3 py-1.5 rounded-lg outline-none"
                                style={{ border: '1px solid #622E12', background: 'rgba(23,19,16,0.4)', color: '#E8DFD0' }}
                              />
                              <p className="text-[10px] mt-1" style={{ color: '#6E6355' }}>{(clarifyAnswers[qi] || '').length}/{OTHER_ANSWER_MAX_LEN}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex-shrink-0 pt-4" style={{ borderTop: '1px solid #453B2F' }}>
          {status === 'success' && result ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
              >
                Discard
              </button>
              <button
                onClick={() => handleApply(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid #E3A854', color: '#E3A854' }}
              >
                Apply to Canvas
              </button>
              <button
                onClick={() => handleApply(true)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                style={{ background: '#E3A854', color: '#241F19' }}
              >
                <Wand2 size={13}/>
                Apply + Auto-layout
              </button>
            </div>
          ) : status === 'clarify' ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClarification}
                disabled={!allClarificationAnswered}
                className="bg-washi flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#F7F2E7', color: '#2B2926', border: '1px solid #453B2F' }}
              >
                <Wand2 size={14}/> Continue
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid #453B2F', color: '#C7BCA9' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerate()}
                disabled={!prompt.trim() || status === 'loading' || (mode === 'edit' && !hasCanvas)}
                className="bg-washi flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#F7F2E7', color: '#2B2926', border: '1px solid #453B2F' }}
              >
                {status === 'loading'
                  ? <><Loader2 size={14} className="animate-spin"/> {mode === 'edit' ? 'Editing…' : 'Generating…'}</>
                  : mode === 'edit'
                    ? <><PencilLine size={14}/> Apply Edit</>
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
