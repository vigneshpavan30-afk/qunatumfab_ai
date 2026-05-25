import React, { useState, useRef, useEffect } from 'react';

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  bg:       '#05080f',
  panel:    '#090d18',
  border:   '#1a2640',
  accent:   '#00d4ff',
  accent2:  '#7b2fff',
  green:    '#00ff9d',
  yellow:   '#ffd93d',
  red:      '#ff4d6d',
  text:     '#c8daf0',
  muted:    '#4a6080',
  white:    '#eaf4ff',
};

// ── Chip SVG Renderer ───────────────────────────────────────────────────────
function ChipDiagram({ chip }) {
  if (!chip) return null;
  const { qubits = [], couplers = [], resonators = [], width = 800, height = 600, name } = chip;

  const qubitMap = {};
  qubits.forEach(q => { qubitMap[q.id] = q; });

  const freqs = qubits.map(q => q.frequency_ghz || 5);
  const minF = Math.min(...freqs), maxF = Math.max(...freqs);

  function qubitColor(f) {
    if (maxF === minF) return C.accent;
    const t = (f - minF) / (maxF - minF);
    // interpolate accent→accent2
    const r = Math.round(0 + t * 123);
    const g = Math.round(212 - t * 212);
    const b = Math.round(255 - t * 128);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div style={{ background: '#060a14', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.accent, fontFamily: 'Share Tech Mono', fontSize: 11, letterSpacing: 2 }}>DIE VIEW</span>
        <span style={{ color: C.muted, fontFamily: 'Share Tech Mono', fontSize: 11 }}>—</span>
        <span style={{ color: C.white, fontFamily: 'Share Tech Mono', fontSize: 11 }}>{name}</span>
        <span style={{ marginLeft: 'auto', color: C.muted, fontFamily: 'Share Tech Mono', fontSize: 10 }}>
          {qubits.length}Q · {couplers.length} COUPLERS · {resonators.length} READOUT
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="qglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e1a2e" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="#05080f" />
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Die border */}
        <rect x="10" y="10" width={width-20} height={height-20}
          fill="none" stroke={C.border} strokeWidth="1.5" rx="6"
          strokeDasharray="8 4" opacity="0.6"/>

        {/* Couplers */}
        {couplers.map((c, i) => {
          const a = qubitMap[c.from], b = qubitMap[c.to];
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={C.accent2} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3"/>
              {/* coupler strength label */}
              <text x={mx} y={my - 6} textAnchor="middle"
                fill={C.accent2} fontSize="9" fontFamily="Share Tech Mono" opacity="0.8">
                {c.strength_mhz ? `${c.strength_mhz} MHz` : c.type}
              </text>
            </g>
          );
        })}

        {/* Resonators */}
        {resonators.map((r, i) => {
          const q = qubitMap[r.qubit];
          if (!q) return null;
          const rx = q.x + 40, ry = q.y - 30;
          return (
            <g key={i}>
              <line x1={q.x} y1={q.y} x2={rx} y2={ry}
                stroke={C.green} strokeWidth="1" opacity="0.5" strokeDasharray="3 2"/>
              <rect x={rx - 18} y={ry - 12} width={36} height={22}
                fill="#001a0d" stroke={C.green} strokeWidth="1" rx="3" opacity="0.9"/>
              <text x={rx} y={ry - 2} textAnchor="middle"
                fill={C.green} fontSize="8" fontFamily="Share Tech Mono">{r.id}</text>
              <text x={rx} y={ry + 7} textAnchor="middle"
                fill={C.green} fontSize="7" fontFamily="Share Tech Mono" opacity="0.7">
                {r.frequency_ghz} GHz
              </text>
            </g>
          );
        })}

        {/* Qubits */}
        {qubits.map((q, i) => {
          const col = qubitColor(q.frequency_ghz || 5);
          return (
            <g key={i} filter="url(#glow)">
              <circle cx={q.x} cy={q.y} r={22} fill="#05080f" stroke={col} strokeWidth="2"/>
              <circle cx={q.x} cy={q.y} r={14} fill={col} opacity="0.15"/>
              <circle cx={q.x} cy={q.y} r={6} fill={col} opacity="0.9"/>
              <text x={q.x} y={q.y - 27} textAnchor="middle"
                fill={col} fontSize="10" fontFamily="Share Tech Mono" fontWeight="600">
                {q.id}
              </text>
              {q.frequency_ghz && (
                <text x={q.x} y={q.y + 36} textAnchor="middle"
                  fill={C.muted} fontSize="8" fontFamily="Share Tech Mono">
                  {q.frequency_ghz} GHz
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Message Parser ──────────────────────────────────────────────────────────
function parseMessage(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  let chip = null;
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      chip = parsed.chip || null;
    } catch (_) {}
  }
  const cleaned = text.replace(/```json[\s\S]*?```/, '').trim();
  return { chip, text: cleaned };
}

// ── Markdown-lite renderer ──────────────────────────────────────────────────
function MsgText({ content }) {
  const lines = content.split('\n');
  return (
    <div style={{ lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} style={{ color: C.accent, margin: '12px 0 4px', fontSize: 13, fontFamily: 'Exo 2', letterSpacing: 1 }}>{line.slice(4)}</h3>;
        if (line.startsWith('## '))  return <h2 key={i} style={{ color: C.accent, margin: '14px 0 4px', fontSize: 14, fontFamily: 'Exo 2' }}>{line.slice(3)}</h2>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ color: C.white, fontWeight: 600, margin: '4px 0' }}>{line.slice(2,-2)}</p>;
        if (line.startsWith('- ')) return <p key={i} style={{ margin: '2px 0', paddingLeft: 12, color: C.text }}>• {line.slice(2)}</p>;
        if (line.trim() === '') return <br key={i}/>;
        return <p key={i} style={{ margin: '3px 0', color: C.text }}>{line}</p>;
      })}
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '14px 0 6px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: C.accent, opacity: 0.7,
          animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
        }}/>
      ))}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `**Welcome to QuantumFab AI** — your quantum chip design assistant.\n\nI can help you:\n- Design transmon qubit arrays with heavy-hex, grid, or custom topologies\n- Calculate coherence times and gate fidelities\n- Plan fabrication processes for Josephson junctions\n- Optimize readout resonator frequencies\n\nTry: *"Design a 5-qubit transmon chip with heavy-hex topology"*` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const newMessages = [...messages.filter(m => m.role !== 'system-intro' || true), { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    const apiMessages = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const { text: t } = JSON.parse(data);
              accumulated += t;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                return updated;
              });
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nCheck that the backend is running: \`cd backend && node server.js\``
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const SUGGESTIONS = [
    '5-qubit heavy-hex transmon chip',
    'Compare T1 times for different substrates',
    'Readout resonator design for 5.2 GHz qubit',
    '9-qubit surface code layout',
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Exo 2', sans-serif", color: C.text }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1e; }
        ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 3px; }
        textarea { resize: none; outline: none; }
        textarea::placeholder { color: #3a5070; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', gap: 14,
        background: C.panel,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>⚛</div>
        <div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>QUANTUMFAB AI</div>
          <div style={{ color: C.muted, fontSize: 10, fontFamily: 'Share Tech Mono', letterSpacing: 2 }}>QUANTUM CHIP DESIGN ASSISTANT · GLM-4-7</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }}/>
          <span style={{ color: C.muted, fontSize: 10, fontFamily: 'Share Tech Mono' }}>CONNECTED</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 180px' }}>
        {messages.map((msg, i) => {
          const { chip, text } = parseMessage(msg.content);
          const isUser = msg.role === 'user';
          return (
            <div key={i} style={{
              marginBottom: 24,
              animation: 'fadeIn 0.3s ease',
              display: 'flex', flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
            }}>
              {!isUser && (
                <div style={{ color: C.accent, fontSize: 9, fontFamily: 'Share Tech Mono', letterSpacing: 2, marginBottom: 6, paddingLeft: 2 }}>
                  QUANTUMFAB AI
                </div>
              )}
              {isUser && (
                <div style={{ color: C.muted, fontSize: 9, fontFamily: 'Share Tech Mono', letterSpacing: 2, marginBottom: 6, paddingRight: 2 }}>
                  YOU
                </div>
              )}
              <div style={{
                maxWidth: isUser ? '75%' : '100%',
                background: isUser ? `linear-gradient(135deg, ${C.accent2}22, ${C.accent}18)` : C.panel,
                border: `1px solid ${isUser ? C.accent2 + '55' : C.border}`,
                borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '14px 18px',
                fontSize: 13,
              }}>
                {isUser
                  ? <p style={{ margin: 0, color: C.white }}>{msg.content}</p>
                  : <MsgText content={text} />
                }
              </div>
              {chip && (
                <div style={{ width: '100%', marginTop: 16, animation: 'fadeIn 0.5s ease' }}>
                  <ChipDiagram chip={chip} />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ color: C.accent, fontSize: 9, fontFamily: 'Share Tech Mono', letterSpacing: 2, marginBottom: 6, paddingLeft: 2 }}>QUANTUMFAB AI</div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '4px 16px 16px 16px', padding: '4px 18px' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        padding: '12px 20px 20px',
      }}>
        {/* Suggestions */}
        <div style={{ maxWidth: 900, margin: '0 auto 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setInput(s)} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 20, padding: '4px 12px',
              color: C.muted, fontSize: 11, fontFamily: 'Share Tech Mono',
              cursor: 'pointer', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
              onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}>
              {s}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your quantum chip design…"
            rows={2}
            style={{
              flex: 1, background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '12px 16px',
              color: C.white, fontSize: 13, fontFamily: "'Exo 2', sans-serif",
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = C.accent}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            width: 48, height: 48, borderRadius: 12,
            background: loading || !input.trim()
              ? C.border
              : `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 20, transition: 'all .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ↑
          </button>
        </div>
        <div style={{ maxWidth: 900, margin: '8px auto 0', textAlign: 'center' }}>
          <span style={{ color: C.muted, fontSize: 10, fontFamily: 'Share Tech Mono' }}>ENTER TO SEND · SHIFT+ENTER FOR NEW LINE</span>
        </div>
      </div>
    </div>
  );
}
