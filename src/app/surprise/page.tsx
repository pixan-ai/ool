"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── WebGL Shaders ────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Domain-warped fBm nebula shader — Inigo Quilez technique
const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_intensity;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i), f), dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * gnoise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * (0.07 + u_intensity * 0.05);

  vec2 q = vec2(fbm(uv * 2.0 + t * 0.6), fbm(uv * 2.0 + vec2(5.2, 1.3) + t * 0.45));
  vec2 r = vec2(
    fbm(uv * 2.5 + 2.2 * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(uv * 2.5 + 2.2 * q + vec2(8.3, 2.8) + t * 0.13)
  );
  float f = fbm(uv * 2.5 + 3.0 * r) * 0.5 + 0.5;

  vec3 col = mix(
    mix(vec3(0.02, 0.01, 0.09), vec3(0.42, 0.07, 0.78), smoothstep(0.25, 0.55, f)),
    mix(vec3(0.02, 0.55, 0.95), vec3(0.75, 0.60, 0.05), smoothstep(0.60, 0.88, f)),
    smoothstep(0.45, 0.75, f)
  );

  float vg = 1.0 - length((uv - 0.5) * vec2(1.5, 1.1));
  col *= clamp(vg * 0.88 + 0.08, 0.0, 1.0);
  col = pow(max(col, vec3(0.0)), vec3(0.82));
  gl_FragColor = vec4(col, 1.0);
}
`;

function initWebGL(canvas: HTMLCanvasElement, getIntensity: () => number) {
  const gl = canvas.getContext("webgl");
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const pos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "u_time");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uIntensity = gl.getUniformLocation(prog, "u_intensity");

  const resize = () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize);

  let raf: number;
  const start = performance.now();
  const draw = (now: number) => {
    gl.uniform1f(uTime, (now - start) * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uIntensity, getIntensity());
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

function highlight(code: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let h = esc(code);
  h = h.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)/g,
    '<span style="color:#c3e88d">$1</span>'
  );
  h = h.replace(
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|class|extends|import|export|from|default|async|await|new|this|typeof|instanceof|interface|type|enum|void|null|undefined|true|false|try|catch|finally|throw|static|public|private|protected|readonly|in|of|yield|super|declare)\b/g,
    '<b style="color:#c792ea;font-weight:normal">$1</b>'
  );
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f78c6c">$1</span>');
  h = h.replace(/\b([A-Z][a-zA-Z0-9_]*)/g, '<span style="color:#ffcb6b">$1</span>');
  h = h.replace(
    /([a-zA-Z_$][\w$]*)(?=\s*\()/g,
    '<span style="color:#82aaff">$1</span>'
  );
  h = h.replace(/(\/\/[^\n]*)/g, '<em style="color:#546e7a;font-style:normal">$1</em>');
  return h;
}

// ─── Message renderer ─────────────────────────────────────────────────────────

function renderContent(text: string) {
  const parts: React.ReactNode[] = [];
  const RE = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0,
    key = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={key++} style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
          {text.slice(last, m.index)}
        </span>
      );
    }
    const lang = m[1] || "code";
    const raw = m[2].trim();
    parts.push(
      <div
        key={key++}
        style={{
          margin: "12px 0",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(124,58,237,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 12px",
            background: "rgba(124,58,237,0.18)",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#a78bfa",
          }}
        >
          <span>{lang}</span>
          <button
            onClick={() => navigator.clipboard.writeText(raw)}
            style={{
              background: "none",
              border: "none",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: 11,
              padding: 0,
            }}
          >
            copy
          </button>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "14px 16px",
            background: "rgba(0,0,0,0.5)",
            overflowX: "auto",
            fontSize: 12.5,
            lineHeight: 1.65,
            fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
          }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlight(raw) }} />
        </pre>
      </div>
    );
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push(
      <span key={key++} style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
        {text.slice(last)}
      </span>
    );
  }
  return parts;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Explain React Server Components vs Client Components",
  "Write a WebSocket server in Bun.js with rooms",
  "Best rate limiting strategies for a Next.js API",
  "Debug: useEffect runs twice in React 19",
  "Design a multi-tenant SaaS database schema",
  "Stream LLM responses with Vercel AI SDK v6",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OraclePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isLoadingRef = useRef(false);
  const voiceOnRef = useRef(false);
  const searchOnRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [searchOn, setSearchOn] = useState(false);

  isLoadingRef.current = isLoading;

  // WebGL — intensity increases when AI is thinking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return initWebGL(canvas, () => (isLoadingRef.current ? 1.0 : 0.0)) ?? undefined;
  }, []);

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const speakText = useCallback(async (text: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const res = await fetch("/api/surprise/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      // Voice is optional
    }
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoadingRef.current) return;

      const userMsg: Message = { role: "user", content: userText };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      // Placeholder for streaming assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/surprise/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            useSearch: searchOnRef.current,
          }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: "Error: could not reach ORACLE." },
          ]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          // Update last message in place
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: full },
          ]);
        }

        if (voiceOnRef.current && full) {
          await speakText(full);
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, speakText]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleVoice = () => {
    voiceOnRef.current = !voiceOnRef.current;
    setVoiceOn(voiceOnRef.current);
  };

  const toggleSearch = () => {
    searchOnRef.current = !searchOnRef.current;
    setSearchOn(searchOnRef.current);
  };

  return (
    <>
      <style>{`
        @keyframes oracle-pulse {
          0%,100% { box-shadow:0 0 28px rgba(124,58,237,0.45),0 0 56px rgba(6,182,212,0.2); transform:scale(1); }
          50%      { box-shadow:0 0 48px rgba(124,58,237,0.75),0 0 96px rgba(6,182,212,0.38); transform:scale(1.07); }
        }
        @keyframes oracle-bounce {
          0%,100% { transform:translateY(0); opacity:0.55; }
          50%      { transform:translateY(-5px); opacity:1; }
        }
        @keyframes oracle-fade {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .o-scroll::-webkit-scrollbar { width:3px; }
        .o-scroll::-webkit-scrollbar-track { background:transparent; }
        .o-scroll::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.4); border-radius:2px; }
        .o-scroll { scrollbar-width:thin; scrollbar-color:rgba(124,58,237,0.4) transparent; }
        .o-sug { transition:all 0.17s; }
        .o-sug:hover { background:rgba(124,58,237,0.18)!important; border-color:rgba(124,58,237,0.4)!important; color:rgba(255,255,255,0.95)!important; }
        .o-send { transition:all 0.17s; }
        .o-send:hover:not(:disabled) { opacity:0.85; transform:translateY(-1px); }
        .o-tog  { transition:all 0.17s; }
        .o-tog:hover { opacity:0.82; }
        .o-msg  { animation:oracle-fade 0.22s ease forwards; }
        * { box-sizing:border-box; }
      `}</style>

      {/* WebGL canvas — full viewport */}
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
      />

      {/* Radial dark overlay */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, rgba(3,3,8,0.42) 0%, rgba(3,3,8,0.80) 100%)",
        }}
      />

      {/* Scanline texture */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.022,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)",
        }}
      />

      {/* Main UI */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 10,
          display: "flex", flexDirection: "column",
          maxWidth: 840, margin: "0 auto",
          padding: "18px 16px 12px",
          fontFamily: "'Inter',system-ui,sans-serif",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 16, flexShrink: 0 }}>
          <div
            style={{
              width: 50, height: 50, borderRadius: "50%", margin: "0 auto 10px",
              background:
                "radial-gradient(circle at 35% 35%, rgba(200,150,255,0.9), rgba(6,182,212,0.5) 55%, transparent 80%)",
              animation: "oracle-pulse 3.5s ease-in-out infinite",
              border: "1px solid rgba(124,58,237,0.5)",
            }}
          />
          <h1
            style={{
              margin: 0, lineHeight: 1, fontSize: "clamp(1.9rem,5vw,3rem)",
              fontWeight: 900, letterSpacing: "-0.04em",
              background: "linear-gradient(135deg,#c4b5fd 0%,#06b6d4 52%,#fbbf24 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}
          >
            ORACLE
          </h1>
          <p
            style={{
              margin: "5px 0 0", fontSize: 10, color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.22em", textTransform: "uppercase",
            }}
          >
            AI Developer Intelligence &nbsp;&middot;&nbsp;
            {voiceOn && "🎙 Voice"}
            {voiceOn && searchOn && " · "}
            {searchOn && "🔍 Live Search"}
            {!voiceOn && !searchOn && "Claude · ElevenLabs · Brave Search"}
          </p>
        </div>

        {/* Messages */}
        <div className="o-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 2px" }}>
          {messages.length === 0 && (
            <div style={{ paddingTop: 4, paddingBottom: 10 }}>
              <p
                style={{
                  textAlign: "center", color: "rgba(255,255,255,0.36)",
                  fontSize: 13.5, marginBottom: 18,
                }}
              >
                Ask me anything, developer.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))",
                  gap: 8,
                }}
              >
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="o-sug"
                    onClick={() => setInput(s)}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 13px",
                      color: "rgba(255,255,255,0.58)", fontSize: 12,
                      cursor: "pointer", textAlign: "left",
                      backdropFilter: "blur(12px)", lineHeight: 1.45,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className="o-msg"
              style={{
                marginBottom: 14, display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-start", gap: 9,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 27, height: 27, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10.5, fontWeight: 800,
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                      : "linear-gradient(135deg,#0891b2,#7c3aed)",
                  boxShadow:
                    msg.role === "assistant"
                      ? "0 0 14px rgba(124,58,237,0.6)"
                      : "none",
                }}
              >
                {msg.role === "user" ? "Y" : "O"}
              </div>

              {/* Bubble */}
              <div
                style={{
                  maxWidth: "82%", fontSize: 13.5,
                  background:
                    msg.role === "user"
                      ? "rgba(79,70,229,0.2)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    msg.role === "user"
                      ? "rgba(124,58,237,0.35)"
                      : "rgba(255,255,255,0.07)"
                  }`,
                  borderRadius:
                    msg.role === "user"
                      ? "16px 4px 16px 16px"
                      : "4px 16px 16px 16px",
                  padding: "10px 14px",
                  backdropFilter: "blur(16px)",
                  color: "rgba(255,255,255,0.9)",
                  minHeight: msg.role === "assistant" && !msg.content ? 44 : undefined,
                }}
              >
                {msg.content ? (
                  renderContent(msg.content)
                ) : (
                  // Streaming placeholder — show bouncing dots while empty
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 0.2, 0.4].map((delay, j) => (
                      <div
                        key={j}
                        style={{
                          width: 6, height: 6, borderRadius: "50%", background: "#a78bfa",
                          animation: `oracle-bounce 1.1s ease-in-out ${delay}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input panel */}
        <form ref={formRef} onSubmit={handleSubmit} style={{ flexShrink: 0, marginTop: 10 }}>
          <div
            style={{
              background: "rgba(8,6,18,0.78)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: "12px 14px",
              backdropFilter: "blur(28px)",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.12), 0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              placeholder="Ask anything... (Enter to send · Shift+Enter for newline)"
              rows={1}
              style={{
                width: "100%", background: "transparent", border: "none",
                outline: "none", color: "rgba(255,255,255,0.9)", fontSize: 14,
                resize: "none", fontFamily: "inherit", lineHeight: 1.6,
                minHeight: 44, maxHeight: 130,
              }}
            />
            <div
              style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginTop: 6,
              }}
            >
              {/* Feature toggles */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="o-tog"
                  onClick={toggleVoice}
                  title="ElevenLabs voice synthesis"
                  style={{
                    background: voiceOn ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${voiceOn ? "rgba(124,58,237,0.55)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, padding: "5px 11px", cursor: "pointer",
                    color: voiceOn ? "#c4b5fd" : "rgba(255,255,255,0.35)",
                    fontSize: 11.5, display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  🎙 Voice
                </button>
                <button
                  type="button"
                  className="o-tog"
                  onClick={toggleSearch}
                  title="Live web search via Brave"
                  style={{
                    background: searchOn ? "rgba(6,182,212,0.18)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${searchOn ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, padding: "5px 11px", cursor: "pointer",
                    color: searchOn ? "#06b6d4" : "rgba(255,255,255,0.35)",
                    fontSize: 11.5, display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  🔍 Web
                </button>
              </div>

              {/* Send */}
              <button
                type="submit"
                className="o-send"
                disabled={isLoading || !input.trim()}
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#0891b2)",
                  border: "none", borderRadius: 10, padding: "8px 22px",
                  color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: input.trim() && !isLoading ? 1 : 0.32,
                  letterSpacing: "0.02em",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
                }}
              >
                {isLoading ? "Thinking…" : "Send \u21b5"}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            textAlign: "center", marginTop: 7, fontSize: 9.5,
            color: "rgba(255,255,255,0.17)", letterSpacing: "0.13em",
          }}
        >
          ORACLE · OOL.DEV/SURPRISE · PIXAN.AI · CLAUDE SONNET 4.6 · ELEVENLABS · BRAVE
        </div>
      </div>
    </>
  );
}
