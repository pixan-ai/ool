"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AiAction } from "@/lib/types";

interface AiModel {
  id: string;
  label: string;
  provider: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  noteContent: string;
  selection: string;
  onInsert: (text: string) => void;
}

const AI_ACTIONS: { id: AiAction; label: string; icon: string; hint: string }[] = [
  { id: "continue",  label: "Continue",  icon: "\u7D9A", hint: "Continue writing from where you left off" },
  { id: "improve",   label: "Improve",   icon: "\u78E8", hint: "Polish and refine the text" },
  { id: "summarize", label: "Summarize", icon: "\u7D04", hint: "Distill into key points" },
  { id: "brainstorm",label: "Brainstorm", icon: "\u82BD", hint: "Generate related ideas" },
  { id: "haiku",     label: "Haiku",     icon: "\u4FF3", hint: "Transform into a haiku" },
  { id: "translate",  label: "Translate",  icon: "\u8A33", hint: "Translate to Japanese" },
];

const MODEL_KEY = "ool-ai-model";

export default function AiPanel({ open, onClose, noteContent, selection, onInsert }: Props) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-flash-3.0");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Load models from API and saved preference
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
      setActiveAction(null);
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
    if (!showModelPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker]);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem(MODEL_KEY, modelId);
    setShowModelPicker(false);
  };

  const callAi = useCallback(async (action: AiAction, prompt?: string) => {
    if (loading) return;
    setLoading(true);
    setResponse("");
    setError(null);
    setActiveAction(action);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content: noteContent,
          selection,
          customPrompt: prompt,
          model: selectedModel,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResponse(text);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [noteContent, selection, loading, selectedModel]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    callAi("custom", customPrompt);
  };

  const handleInsert = () => {
    if (response) {
      onInsert(response);
      onClose();
    }
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
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
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="ai-orb" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Koan</h2>
              <span className="text-[10px] text-[var(--text-tertiary)]">zen writing companion</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative" ref={modelPickerRef}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md hover:border-[var(--border)] hover:text-[var(--text-secondary)] transition-all font-mono"
              >
                {modelLabel}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showModelPicker && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden animate-fade-in" style={{ minWidth: 200 }}>
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                    Model
                  </div>
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

        {/* Actions grid */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {AI_ACTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => callAi(a.id)}
                disabled={loading}
                className={`ai-action-btn ${activeAction === a.id && loading ? "active" : ""}`}
                title={a.hint}
              >
                <span className="text-base leading-none">{a.icon}</span>
                <span className="text-[11px]">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt */}
        <form onSubmit={handleCustomSubmit} className="px-4 pb-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ask anything about your note..."
              className="search-input text-[13px]"
              style={{ paddingLeft: "12px" }}
              disabled={loading}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="ai-spinner" />
              </div>
            )}
          </div>
        </form>

        {/* Response */}
        {(response || error) && (
          <div className="border-t border-[var(--border-subtle)]">
            <div
              ref={responseRef}
              className="px-5 py-4 max-h-64 overflow-y-auto"
            >
              {error ? (
                <div className="text-[var(--danger)] text-sm">{error}</div>
              ) : (
                <div className="ai-response prose prose-sm max-w-none">
                  {response.split("\n").map((line, i) => (
                    <p key={i} className={`${!line.trim() ? "h-2" : ""} leading-relaxed`}>
                      {line}
                    </p>
                  ))}
                  {loading && <span className="ai-cursor" />}
                </div>
              )}
            </div>

            {/* Actions */}
            {response && !loading && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border-subtle)]">
                <button
                  onClick={handleInsert}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
                >
                  Insert into note
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--text-tertiary)] transition-colors"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty hint */}
        {!response && !error && !loading && (
          <div className="px-5 pb-4 text-center">
            <p className="text-[11px] text-[var(--text-tertiary)] italic leading-relaxed">
              {selection ? "Text selected \u2014 actions will focus on selection" : "Choose an action or ask a question"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
