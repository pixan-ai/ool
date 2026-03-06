'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// WEBGL SHADERS — Aurora / Cosmic Nebula
// ─────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_t;
uniform vec2 u_res;
uniform float u_intensity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p + vec2(100.0); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_t * (0.1 + u_intensity * 0.04);

  float n1 = fbm(uv * 2.5 + vec2(t * 0.3, t * 0.1));
  float n2 = fbm(uv * 2.0 + vec2(-t * 0.2, t * 0.15) + n1 * 0.6);
  float n3 = fbm(uv * 3.5 + vec2(t * 0.1, -t * 0.2) + n2 * 0.4);
  float n4 = fbm(uv * 1.5 + vec2(t * 0.05, t * 0.08) + n3 * 0.3);

  float g1 = exp(-abs(uv.y - 0.62 - n1 * 0.18) * 7.5) * (1.8 + u_intensity * 0.6);
  float g2 = exp(-abs(uv.y - 0.38 - n2 * 0.12) * 11.0) * (1.3 + u_intensity * 0.4);
  float g3 = exp(-abs(uv.y - 0.5 - n4 * 0.1) * 5.0) * 0.5;

  vec3 col = vec3(0.008, 0.002, 0.03);

  col += vec3(0.45, 0.02, 1.0) * g1 * (n3 * 0.65 + 0.38);
  col += vec3(0.0, 0.85, 1.0) * g1 * smoothstep(0.48, 0.88, n2) * 0.78;
  col += vec3(0.28, 0.0, 0.72) * g2 * (n2 * 0.55 + 0.28);
  col += vec3(0.0, 0.55, 0.75) * g2 * smoothstep(0.55, 0.85, n3) * 0.45;
  col += vec3(1.0, 0.78, 0.12) * smoothstep(0.86, 1.0, n1) * g1 * (0.38 + u_intensity * 0.15);
  col += vec3(0.18, 0.0, 0.45) * g3 * (n4 * 0.4 + 0.3);
  col += vec3(0.1, 0.0, 0.22) * n1 * 0.55;
  col += vec3(0.0, 0.03, 0.16) * n2 * 0.48;
  col += vec3(0.02, 0.0, 0.08) * n4 * 0.35;

  // Stars
  vec2 sv = floor(uv * 750.0);
  float star = pow(hash(sv + 3.71), 235.0) * 5.5;
  float twinkle = 0.65 + 0.35 * sin(t * 3.5 + hash(sv + 1.3) * 6.2832);
  col += vec3(0.88, 0.94, 1.0) * star * twinkle;

  // Bright core stars
  vec2 sv2 = floor(uv * 200.0);
  float bstar = pow(hash(sv2 + 9.13), 280.0) * 3.0;
  col += vec3(0.7, 0.85, 1.0) * bstar;

  // Vignette
  vec2 v = (uv - 0.5) * 2.0;
  col *= pow(max(1.0 - dot(v * 0.45, v * 0.45), 0.0), 0.55) * 0.82 + 0.18;

  // Tone map + gamma
  col = col / (col + vec3(0.55));
  col = pow(clamp(col, 0.0, 1.0), vec3(0.72));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

// ─────────────────────────────────────────────
// SYNTAX HIGHLIGHTING
// ─────────────────────────────────────────────

function highlightCode(code: string): string {
  let h = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  h = h.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g,
    '<span class="sh-cmt">$1</span>');
  h = h.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g,
    '<span class="sh-str">$1$2$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="sh-num">$1</span>');
  h = h.replace(
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|default|class|extends|async|await|new|this|typeof|instanceof|true|false|null|undefined|from|of|in|try|catch|finally|throw|type|interface|enum|def|print|self|pass|yield|lambda|with|as|not|and|or|is|del|fn|pub|use|mod|struct|impl|trait|mut|move)\b/g,
    '<span class="sh-kw">$1</span>'
  );
  h = h.replace(/\b([a-zA-Z_$]\w*)\s*(?=\()/g, '<span class="sh-fn">$1</span>');

  return h;
}

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// ─────────────────────────────────────────────

function renderMarkdown(text: string): string {
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const hl = highlightCode(code.trim());
    const langLabel = lang || 'code';
    return `<div class="cb"><div class="cb-head"><span class="cb-lang">${langLabel}</span><button class="cb-copy" onclick="(()=>{const el=this.closest('.cb').querySelector('pre');navigator.clipboard.writeText(el.innerText);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})()">Copy</button></div><pre class="cb-pre">${hl}</pre></div>`;
  });

  text = text.replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="bd">$1</strong>');
  text = text.replace(/\*([^*\n]+)\*/g, '<em class="it">$1</em>');
  text = text.replace(/^### (.+)$/gm, '<h3 class="h3">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 class="h2">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 class="h1">$1</h1>');
  text = text.replace(/^---+$/gm, '<hr class="hr">');
  text = text.replace(/^[\-\*\+] (.+)$/gm, '<li class="li">$1</li>');
  text = text.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, '<ul class="ul">$&</ul>');

  text = text
    .split(/\n{2,}/)
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (/^<(h[123]|ul|div|pre|hr)/.test(trimmed)) return trimmed;
      return `<p class="p">${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return text;
}

// ─────────────────────────────────────────────
// WEBGL INIT
// ─────────────────────────────────────────────

function initGL(canvas: HTMLCanvasElement, intensityRef: { current: number }) {
  const gl = canvas.getContext('webgl', { alpha: false });
  if (!gl) return null;

  function compileShader(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uT = gl.getUniformLocation(prog, 'u_t');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uInt = gl.getUniformLocation(prog, 'u_intensity');

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  let raf: number;
  const t0 = performance.now();
  let currentIntensity = 0;

  const render = () => {
    const t = (performance.now() - t0) / 1000;
    currentIntensity += (intensityRef.current - currentIntensity) * 0.05;
    gl.uniform1f(uT, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uInt, currentIntensity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  };
  render();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const WELCOME: Message = {
  role: 'assistant',
  id: 'init',
  content: `## Welcome to ORACLE

I am your **omniscient developer intelligence** — built at the intersection of code, knowledge, and cosmic awareness.

I can help you with:
- Architecture decisions & system design
- Code generation, review, and debugging
- Performance optimization & best practices
- AI/ML, DevOps, databases, APIs, security
- **Real-time web search** for the latest docs and news

Enable **Web Search** for live context. Enable **Voice** to hear my responses.

*What would you like to know?*`,
};

const EXAMPLES = [
  'Explain TCP vs UDP with code examples',
  'Write a rate limiter in TypeScript',
  'How does React concurrent mode work?',
  'PostgreSQL query optimization best practices',
  'Implement JWT auth from scratch in Node.js',
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function SurprisePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intensityRef = useRef(0);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!canvasRef.current) return;
    return initGL(canvasRef.current, intensityRef) ?? undefined;
  }, []);

  useEffect(() => {
    intensityRef.current = isLoading ? 1 : 0;
  }, [isLoading]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, status]);

  const playVoice = useCallback(async (text: string) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const res = await fetch('/api/surprise/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const ab = await res.arrayBuffer();
      const buf = await audioCtxRef.current.decodeAudioData(ab);
      const src = audioCtxRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtxRef.current.destination);
      src.start();
    } catch { /* fail silently */ }
  }, []);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isLoading) return;

    setShowHints(false);
    const userMsg: Message = { role: 'user', content: trimmed, id: `u-${Date.now()}` };
    const aId = `a-${Date.now() + 1}`;
    const aMsg: Message = { role: 'assistant', content: '', id: aId };

    setMessages(prev => [...prev, userMsg, aMsg]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      let searchContext = '';
      if (searchEnabled) {
        setStatus('Searching the web...');
        try {
          const sr = await fetch('/api/surprise/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: trimmed }),
          });
          if (sr.ok) {
            const { results } = await sr.json();
            if (results?.length) {
              searchContext = (results as { title: string; snippet: string; url: string }[])
                .map(r => `**${r.title}**\n${r.snippet}\nSource: ${r.url}`)
                .join('\n\n');
            }
          }
        } catch { /* search failed silently */ }
      }

      setStatus('Consulting ORACLE...');

      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/surprise/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, searchContext: searchContext || undefined }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      setStatus('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => (m.id === aId ? { ...m, content: fullText } : m))
        );
      }

      if (voiceEnabled && fullText) {
        setStatus('Speaking...');
        await playVoice(fullText);
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === aId
            ? { ...m, content: '*The Oracle is momentarily unavailable. Please try again.*' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setStatus('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isLoading, messages, searchEnabled, voiceEnabled, playVoice]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([{ ...WELCOME, id: `init-${Date.now()}` }]);
    setShowHints(true);
  }, []);

  if (!mounted) return <div style={{ background: '#020008', width: '100vw', height: '100vh' }} />;

  return (
    <div style={{
      width: '100vw', height: '100dvh', overflow: 'hidden',
      background: '#020008',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
    }}>
      {/* WebGL Canvas */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0,
      }} />

      {/* Radial overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, rgba(2,0,8,0.55) 100%)',
      }} />

      {/* Main layout */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 16px 16px', boxSizing: 'border-box', gap: 12,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900,
            letterSpacing: '-2px', lineHeight: 1,
            background: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: 4,
            filter: isLoading ? 'drop-shadow(0 0 20px rgba(168,85,247,0.6))' : 'none',
            transition: 'filter 0.5s ease',
            animation: isLoading ? 'glow-pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            ORACLE
          </div>
          <div style={{
            color: '#374151', fontSize: 10, letterSpacing: 4,
            textTransform: 'uppercase', fontWeight: 500,
          }}>
            Developer Intelligence &middot; ool.dev/surprise
          </div>
        </div>

        {/* Chat window */}
        <div style={{
          width: '100%', maxWidth: 800, flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8, 4, 22, 0.75)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 20,
          border: `1px solid ${isLoading ? 'rgba(168,85,247,0.45)' : 'rgba(168,85,247,0.2)'}`,
          boxShadow: isLoading
            ? '0 0 80px rgba(168,85,247,0.12), 0 0 160px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 0 40px rgba(168,85,247,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
          overflow: 'hidden',
        }}>

          {/* Messages */}
          <div ref={messagesRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '20px 20px 8px',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            {messages.map((msg, idx) => {
              const isStreaming = isLoading && idx === messages.length - 1 && msg.role === 'assistant';
              return (
                <div key={msg.id} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'slide-in 0.3s ease',
                }}>
                  <div style={{
                    fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
                    fontWeight: 700, marginBottom: 5,
                    color: msg.role === 'user' ? '#f59e0b' : '#a855f7',
                  }}>
                    {msg.role === 'user' ? 'YOU' : 'ORACLE'}
                  </div>
                  <div style={{
                    maxWidth: '90%', padding: '11px 15px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.28), rgba(6,182,212,0.18))'
                      : 'rgba(255,255,255,0.035)',
                    border: msg.role === 'user'
                      ? '1px solid rgba(168,85,247,0.38)'
                      : '1px solid rgba(255,255,255,0.06)',
                    color: '#dde4f0', fontSize: 14, lineHeight: 1.72,
                    wordBreak: 'break-word',
                  }}>
                    {msg.role === 'user' ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    ) : isStreaming ? (
                      <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {msg.content || ''}
                        <span style={{ animation: 'cursor-blink 1s infinite', color: '#a855f7', fontWeight: 700 }}>|</span>
                      </span>
                    ) : (
                      <div
                        className="oracle-md"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {status && (
              <div style={{
                textAlign: 'center', color: '#4b5563', fontSize: 12,
                animation: 'fade-in 0.3s ease', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>&#9711;</span>
                {status}
              </div>
            )}

            {showHints && messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => sendMessage(ex)} style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12,
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    color: '#6b7280', cursor: 'pointer',
                    transition: 'all 0.2s', textAlign: 'left', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'rgba(168,85,247,0.18)';
                      el.style.color = '#c084fc';
                      el.style.borderColor = 'rgba(168,85,247,0.4)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'rgba(168,85,247,0.08)';
                      el.style.color = '#6b7280';
                      el.style.borderColor = 'rgba(168,85,247,0.2)';
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(168,85,247,0.12)', flexShrink: 0 }} />

          {/* Toolbar */}
          <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setSearchEnabled(v => !v)} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${searchEnabled ? 'rgba(6,182,212,0.55)' : 'rgba(255,255,255,0.09)'}`,
              background: searchEnabled ? 'rgba(6,182,212,0.14)' : 'transparent',
              color: searchEnabled ? '#06b6d4' : '#4b5563',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
            }}>
              {searchEnabled ? '🔍 Search ON' : '🔍 Search OFF'}
            </button>

            <button onClick={() => setVoiceEnabled(v => !v)} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${voiceEnabled ? 'rgba(168,85,247,0.55)' : 'rgba(255,255,255,0.09)'}`,
              background: voiceEnabled ? 'rgba(168,85,247,0.14)' : 'transparent',
              color: voiceEnabled ? '#a855f7' : '#4b5563',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
            }}>
              {voiceEnabled ? '🎙 Voice ON' : '🎙 Voice OFF'}
            </button>

            <button onClick={clearChat} style={{
              marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontFamily: 'inherit',
              border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
              color: '#374151', cursor: 'pointer', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
              onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
            >
              Clear
            </button>
          </div>

          {/* Input */}
          <div style={{ padding: '6px 16px 14px', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask the Oracle anything..."
              disabled={isLoading} rows={1} autoFocus
              style={{
                flex: 1, resize: 'none',
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(168,85,247,0.22)', borderRadius: 12,
                padding: '10px 14px', color: '#e2e8f0', fontSize: 14,
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.55,
                maxHeight: 140, overflowY: 'auto', transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,0.55)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.22)'; }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 140) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0, border: 'none',
                background: isLoading || !input.trim()
                  ? 'rgba(168,85,247,0.12)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 18, transition: 'all 0.2s', fontFamily: 'inherit',
                boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
              }}
              onMouseEnter={e => { if (!isLoading && input.trim()) (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {isLoading ? 'o' : '↑'}
            </button>
          </div>

          <div style={{
            textAlign: 'center', paddingBottom: 10, flexShrink: 0,
            color: '#1f2937', fontSize: 10, letterSpacing: 1.5,
          }}>
            ENTER to send &nbsp;&middot;&nbsp; SHIFT+ENTER for newline
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#1a1f2e', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', flexShrink: 0 }}>
          Claude &middot; Vercel AI Gateway &middot; ElevenLabs &middot; Brave Search
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 14px rgba(168,85,247,0.5)); }
          50%       { filter: drop-shadow(0 0 28px rgba(6,182,212,0.7)); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.28); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.5); }

        .oracle-md .p   { margin: 0.45em 0; }
        .oracle-md .h1  { font-size: 1.35em; font-weight: 800; color: #c084fc; margin: 0.9em 0 0.35em; }
        .oracle-md .h2  { font-size: 1.18em; font-weight: 700; color: #a78bfa; margin: 0.8em 0 0.3em; }
        .oracle-md .h3  { font-size: 1.05em; font-weight: 700; color: #818cf8; margin: 0.7em 0 0.25em; }
        .oracle-md .hr  { border: none; border-top: 1px solid rgba(168,85,247,0.2); margin: 0.8em 0; }
        .oracle-md .ul  { padding-left: 1.3em; margin: 0.4em 0; }
        .oracle-md .li  { margin: 0.25em 0; }
        .oracle-md .bd  { color: #c084fc; font-weight: 700; }
        .oracle-md .it  { color: #67e8f9; font-style: italic; }
        .oracle-md .ic  { background: rgba(168,85,247,0.18); color: #c084fc; padding: 1px 6px; border-radius: 4px; font-size: 0.87em; font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace; }
        .oracle-md .cb  { background: rgba(0,0,0,0.55); border: 1px solid rgba(168,85,247,0.18); border-radius: 10px; overflow: hidden; margin: 0.8em 0; }
        .oracle-md .cb-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(168,85,247,0.09); border-bottom: 1px solid rgba(168,85,247,0.13); }
        .oracle-md .cb-lang { font-size: 9px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        .oracle-md .cb-copy { font-size: 10px; color: #4b5563; background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 8px; cursor: pointer; transition: color 0.2s; font-family: inherit; }
        .oracle-md .cb-copy:hover { color: #e2e8f0; }
        .oracle-md .cb-pre { padding: 14px; overflow-x: auto; font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace; font-size: 13px; line-height: 1.65; color: #e2e8f0; }
        .sh-kw  { color: #c084fc; font-weight: 600; }
        .sh-str { color: #86efac; }
        .sh-num { color: #fb923c; }
        .sh-fn  { color: #60a5fa; }
        .sh-cmt { color: #4b5563; font-style: italic; }
      `}</style>
    </div>
  );
}
