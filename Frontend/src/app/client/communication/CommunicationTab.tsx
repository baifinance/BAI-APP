/**
 * ==============================================================================
 * COMPONENT: CommunicationTab.tsx
 * Path: src/app/client/communication/CommunicationTab.tsx
 * Description: Client Communication Chat Space UI for "BAI-SUPPORT".
 *              Wired to POST /api/ai/chat/ (IsAuthenticated, own-profile aware).
 * ==============================================================================
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Headphones, Send, Sparkles, MessageSquare, RotateCcw, PhoneOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { aiApi } from "@/lib/api";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  at: number;
}

const SUGGESTED = ["How to Start", "What are the needed Documents.", "What is my loan status?"];
const MAX_LEN = 2000;
const IDLE_MS = 15 * 60 * 1000;
const IDLE_WARN_MS = 14 * 60 * 1000;

function fmtTime(at: number) {
  try {
    return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function EmptyPanel({
  title,
  body,
  onStart,
  starting,
  active,
  activeLabel,
}: {
  title: string;
  body: string;
  onStart: () => void;
  starting: boolean;
  active: boolean;
  activeLabel?: string;
}) {
  return (
    <div className="h-full min-h-[320px] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-blue-50/60 border border-blue-100/80 flex items-center justify-center mb-4 text-[#0024A8]/30">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-400/40 tracking-tight leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-xs sm:text-sm font-medium text-slate-400/60 leading-relaxed">
          {body}
        </p>
        {active ? (
          <p className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeLabel ?? "Session active — type below to begin."}
          </p>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="mt-5 px-5 py-3 rounded-xl bg-[#0024A8] hover:bg-[#0A2881] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start new chat"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommunicationTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailed, setLastFailed] = useState("");
  const [convId, setConvId] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ended, setEnded] = useState<{ code: string; to?: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [idleWarn, setIdleWarn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastActivity = useRef<number>(0);

  const ensureSession = async () => {
    if (convId) return convId;
    setStarting(true);
    try {
      const res = await aiApi.startSession();
      setConvId(res.conversation_id);
      lastActivity.current = Date.now();
      return res.conversation_id;
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  const send = async (question: string) => {
    const q = question.trim().slice(0, MAX_LEN);
    if (!q || loading || ended) return;
    setError("");
    setLastFailed("");
    setIdleWarn(false);
    lastActivity.current = Date.now();
    setMessages((m) => [...m, { role: "user", text: q, at: Date.now() }]);
    setInput("");
    setLoading(true);
    try {
      const cid = await ensureSession();
      const res = await aiApi.chat(q, cid);
      if (res.conversation_id && res.conversation_id !== convId) setConvId(res.conversation_id);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, at: Date.now() }]);
      lastActivity.current = Date.now();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get response.";
      setError(msg);
      setLastFailed(q);
    } finally {
      setLoading(false);
    }
  };

  const endChat = async (reason: "manual" | "idle") => {
    if (!convId || ending || ended) return;
    setEnding(true);
    try {
      const res = await aiApi.endSession(convId, reason);
      setEnded({ code: res.conversation_id, to: res.to });
      setShowConfirm(false);
      setIdleWarn(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to end chat.");
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (ended || !convId || ending) return;
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_MS) void endChat("idle");
      else if (idleFor >= IDLE_WARN_MS) setIdleWarn(true);
    }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, ended, ending]);

  const startNew = async () => {
    if (loading || starting) return;
    setMessages([]);
    setError("");
    setSessionError("");
    setLastFailed("");
    setEnded(null);
    setShowConfirm(false);
    setIdleWarn(false);
    setConvId("");
    setStarting(true);
    try {
      const res = await aiApi.startSession();
      setConvId(res.conversation_id);
      lastActivity.current = Date.now();
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Unable to start chat session.");
    } finally {
      setStarting(false);
    }
  };

  const started = messages.length > 0;

  return (
    <div className="w-full flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100vh-7.5rem)] min-h-[480px] max-h-[880px] bg-white border-0 sm:border sm:border-blue-100 rounded-none sm:rounded-3xl shadow-soft-xl overflow-hidden">
      <header className="px-4 sm:px-6 py-3.5 bg-white border-b border-blue-100/90 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#0024A8] text-white flex items-center justify-center shadow-sm shadow-[#0024A8]/20 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-extrabold text-[#0024A8] tracking-tight leading-tight">
              BAI-SUPPORT
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">
                {convId ? `${convId} · knows your profile` : "Customer Support"}
              </span>
            </div>
          </div>
        </div>
        {!ended && convId && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={ending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0 disabled:opacity-50"
            aria-label="End chat and email transcript"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{ending ? "Ending…" : "End chat"}</span>
          </button>
        )}
      </header>

      {sessionError && (
        <p className="px-4 sm:px-6 py-2 text-center text-xs font-semibold text-rose-600 bg-rose-50 border-b border-rose-100">
          {sessionError}
        </p>
      )}
      {idleWarn && !ended && (
        <div className="px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3 text-xs font-semibold text-amber-800">
          <span>Ending in ~60s due to inactivity. Transcript will be emailed.</span>
          <button
            type="button"
            onClick={() => {
              lastActivity.current = Date.now();
              setIdleWarn(false);
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-amber-200 font-bold hover:bg-amber-100"
          >
            Stay
          </button>
        </div>
      )}

      <div ref={scrollRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto bg-gradient-to-b from-white via-white to-blue-50/20">
        {ended ? (
          <EmptyPanel
            title="Chat ended"
            body={`Transcript ${ended.code} sent to ${ended.to ?? "your email"}.`}
            onStart={() => void startNew()}
            starting={starting || loading}
            active={false}
          />
        ) : !started ? (
          <EmptyPanel
            title="No chat available"
            body="No conversation is created until you start — nothing is wasted."
            onStart={() => void startNew()}
            starting={starting || loading}
            active={convId !== ""}
            activeLabel={convId ? `Session ${convId} active — type below to begin.` : undefined}
          />
        ) : (
          <div className="w-full px-4 sm:px-8 py-6 space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#0024A8]/10 border border-[#0024A8]/15 text-[#0024A8] flex items-center justify-center shrink-0 text-[10px] font-extrabold">
                    AI
                  </div>
                )}
                <div className="max-w-[92%] sm:max-w-[75%] lg:max-w-[70%] min-w-0">
                  <div
                    className={`px-4 py-3 text-[13px] sm:text-sm leading-6 break-words ${
                      m.role === "user"
                        ? "bg-[#0024A8] text-white font-medium rounded-2xl rounded-br-md whitespace-pre-wrap"
                        : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md shadow-xs"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-[#0A2881] prose-headings:font-extrabold prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-a:text-[#0024A8] prose-a:font-semibold break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                  <p className={`mt-1 text-[10px] font-medium text-slate-400 ${m.role === "user" ? "text-right" : "text-left"}`}>
                    {fmtTime(m.at)}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#0024A8]/10 border border-[#0024A8]/15 flex items-center justify-center shrink-0">
                  <span className="w-3 h-3 border-2 border-slate-300 border-t-[#0024A8] rounded-full animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-xs text-slate-500 font-medium flex items-center gap-2">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}
        {error && !ended && (
          <div className="w-full px-4 sm:px-8 pb-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              <span className="min-w-0 truncate">{error}</span>
              {lastFailed && (
                <button
                  type="button"
                  onClick={() => void send(lastFailed)}
                  className="inline-flex items-center gap-1 shrink-0 font-bold hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!ended && (
      <div className="px-3 sm:px-6 pt-3 shrink-0">
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl px-3 py-2.5 flex items-center gap-2 overflow-x-auto snap-x">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0024A8]/70 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0024A8]" />
            <span>Suggested</span>
          </div>
          {SUGGESTED.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading || !!ended}
              onClick={() => void send(q)}
              className="shrink-0 snap-start px-3 py-2.5 rounded-xl bg-white border border-blue-200/80 text-xs font-semibold text-[#0024A8] hover:bg-blue-50 hover:border-[#0024A8]/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      )}

      {!ended && (
      <footer className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 bg-white border border-blue-200/90 rounded-2xl p-2 shadow-xs focus-within:border-[#0024A8] focus-within:ring-2 focus-within:ring-[#0024A8]/20 transition-all"
        >
          <label htmlFor="bai-chat-input" className="sr-only">
            Type your question
          </label>
          <textarea
            id="bai-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={convId ? "Type your question… (Enter to send, Shift+Enter for newline)" : "Starting chat session…"}
            maxLength={MAX_LEN}
            disabled={loading || !convId}
            className="flex-1 bg-transparent px-3 py-2 text-[13px] sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 resize-none leading-6 max-h-[120px]"
          />
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              type="submit"
              disabled={loading || !input.trim() || !convId}
              aria-label="Send message"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0024A8] hover:bg-[#0A2881] text-white shadow-sm transition-all gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <p className={`mt-1.5 text-right text-[10px] font-medium ${input.length >= MAX_LEN ? "text-rose-500" : "text-slate-400"}`}>
          {input.length}/{MAX_LEN}
        </p>
      </footer>
      )}

      {showConfirm && !ended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" role="dialog" aria-modal="true" aria-labelledby="end-chat-title">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 id="end-chat-title" className="text-lg font-extrabold text-slate-900">End chat?</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {convId} will be closed and the full transcript emailed to you.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Keep chatting
              </button>
              <button
                type="button"
                disabled={ending}
                onClick={() => void endChat("manual")}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {ending ? "Ending…" : "End + email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
