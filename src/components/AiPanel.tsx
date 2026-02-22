"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  open: boolean;
  onClose: () => void;
  noteContent: string;
  selection: string;
  onInsert: (text: string) => void;
}

const MODEL_KEY = "ool-ai-model";

export default function AiPanel({ open, onClose, noteContent, selection, onInsert }: Props) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-flash-3.0");
  const [models, setModels] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [showModels, setShowModels] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Load models
  useEffect(() => {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved) setSelectedModel(saved);

    fetch("/api/ai")
      .then(r => r.json())
      .then(data => {
        if (data.models) setModels(data.models);
        if (!saved && data.default) setSelectedModel(data.default);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setResponse("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      if (abortRef.current) abortRef.current.abort();
    }
  }, [open]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  // Close model picker on outside click
  useEffect(() => {
    if (!showModels) return;
    const h = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModels(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showModels]);

  const handleModelChange = (id: string) => {
    setSelectedModel(id);
    localStorage.setItem(MODEL_KEY, id);
    setShowModels(false);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse("");
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent || "",
          selection: selection || "",
          prompt: prompt.trim(),
          model: selectedModel,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream available");

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResponse(text);
      }

      if (!text.trim()) setError("No response received. Check AI configuration.");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [prompt, noteContent, selection, loading, selectedModel]);

  const handleInsert = () => {
    if (response) {
      onInsert(response);
      setResponse("");
      setPrompt("");
    }
  };

  if (!open) return null;

  const currentModel = models.find(m => m.id === selectedModel);
  const modelLabel = currentModel?.label || selectedModel.split("/").pop() || "AI";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 150ms ease-out" }}
      />

      {/* Panel */}
      <div className="ai-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="ai-orb" />
            <span className="text-sm font-semibold tracking-tight">Koan</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative" ref={modelRef}>
              <button
                onClick={() => setShowModels(p => !p)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md hover:border-[var(--border)] hover:text-[var(--text-secondary)] transition-all font-mono"
              >
                {modelLabel}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showModels && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden animate-fade-in" style={{ minWidth: 200 }}>
                  {models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleModelChange(m.id)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                        m.id === selectedModel
                          ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-[9px] text-[var(--text-tertiary)]">{m.provider}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="toolbar-btn" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Prompt input */}
        <form onSubmit={handleSubmit} className="px-4 py-3">
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={selection ? "Ask about selection..." : "Ask anything about your note..."}
              className="search-input text-[13px] flex-1"
              style={{ paddingLeft: "12px", paddingRight: "12px" }}
              disabled={loading}
            />
            {loading ? (
              <div className="shrink-0"><div className="ai-spinner" /></div>
            ) : (
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--bg)] disabled:opacity-30 hover:opacity-90 transition-opacity"
                title="Send"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
          {selection && !loading && (
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 px-1 italic">
              Using selected text as context
            </p>
          )}
        </form>

        {/* Response */}
        {(response || error) && (
          <div className="border-t border-[var(--border-subtle)]">
            <div ref={responseRef} className="px-5 py-4 max-h-64 overflow-y-auto">
              {error ? (
                <div className="text-[var(--danger)] text-sm">{error}</div>
              ) : (
                <div className="ai-response prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
                  {loading && <span className="ai-cursor" />}
                </div>
              )}
            </div>

            {/* Insert / Copy */}
            {response && !loading && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border-subtle)]">
                <button
                  onClick={handleInsert}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
                >
                  Insert into note
                </button>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(response); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--text-tertiary)] transition-colors"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
