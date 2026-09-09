"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Bot, User, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw"; // <-- ADDED THIS
import { aiApi } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
  isAnimated?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Hello! 👋 Welcome to BAI Finance. How can I assist you with your mortgage, loan, legal, or remittance inquiry today?",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isAnimated: false,
  },
];

export const SUGGESTED_PROMPTS = [
  { 
    label: "Home Loans 🏠", 
    prompt: "How can Bai Finance help first-home buyers, and what other loan types (like SMSF or investment) do you offer?" 
  },
  { 
    label: "Bai Remittance 💸", 
    prompt: "How does Bai Remittance work for sending AUD to PHP, and what makes it secure?" 
  },
  { 
    label: "Legal & Migration ⚖️", 
    prompt: "What specific property conveyancing and visa migration services do Bai Lawyers provide?" 
  },
  { 
    label: "Why Bai Finance? 🤝", 
    prompt: "What makes Bai Finance Group unique for the Filipino-Australian community?" 
  },
];

/**
 * Component for smooth active typewriter text animation on the newest AI response,
 * parsed as Markdown/HTML for rich formatting.
 */
function ActiveTypewriterMessage({
  content,
  onTyping,
  onComplete,
}: {
  content: string;
  onTyping?: () => void;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let currentIndex = 0;
    const speed = Math.max(8, Math.min(20, Math.floor(1500 / (content.length || 1))));

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + 1));
        currentIndex++;
        onTypingRef.current?.();
      } else {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content]);

  return (
    // 'prose' activates the typography plugin styles
    <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]} // <-- ADDED THIS
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Typewriter message wrapper: renders static Markdown/HTML for past replies, 
 * or typewriter Markdown/HTML for the latest reply
 */
function TypewriterMessage({
  content,
  isAnimated,
  onTyping,
  onComplete,
}: {
  content: string;
  isAnimated?: boolean;
  onTyping?: () => void;
  onComplete?: () => void;
}) {
  if (!isAnimated) {
    return (
      <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeRaw]} // <-- ADDED THIS
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <ActiveTypewriterMessage
      content={content}
      onTyping={onTyping}
      onComplete={onComplete}
    />
  );
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleTypingComplete = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isAnimated: false } : msg))
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isAnimated: false,
    };

    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, isAnimated: false })),
      userMessage,
    ]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await aiApi.chat(query);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer || "I received your query but could not generate a response.",
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAnimated: true,
      };
      
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isAnimated: false })),
        assistantMessage,
      ]);
    } catch (err: unknown) {
      console.error("RAG Chat Error:", err);
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I encountered an issue connecting to the AI service. Please ensure the backend server is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAnimated: false,
      };
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isAnimated: false })),
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleResetConversation = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div
          className="mb-4 w-[90vw] sm:w-[400px] h-[550px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden transition-all duration-300 transform animate-in fade-in slide-in-from-bottom-5"
          style={{ boxShadow: "0 20px 50px -10px rgba(11, 35, 105, 0.25)" }}
        >
          <div className="bg-gradient-to-r from-[#0B2369] via-[#0D2A7F] to-[#1429A9] text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-amber-400 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide text-white">BAI A.I Assistant</h3>
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                    RAG
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-slate-200 font-medium">Online & Ready to Help</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetConversation}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Reset Conversation"
                aria-label="Reset Conversation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/70 flex flex-col gap-3.5 text-xs">
            {(() => {
              const lastAssistantId = messages
                .filter((m) => m.role === "assistant")
                .slice(-1)[0]?.id;

              return messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[88%] ${
                    msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="w-7 h-7 rounded-full bg-[#0B2369] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl shadow-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#0B2369] text-white rounded-tr-xs"
                        : "bg-white text-slate-700 rounded-tl-xs border border-slate-100"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <TypewriterMessage
                        content={msg.content}
                        isAnimated={msg.id === lastAssistantId && !!msg.isAnimated}
                        onTyping={scrollToBottom}
                        onComplete={() => handleTypingComplete(msg.id)}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <span
                      className={`block text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-blue-200 text-right" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ));
            })()}

            {isLoading && (
              <div className="flex items-start gap-2.5 max-w-[88%] self-start animate-in fade-in duration-300">
                <div className="w-7 h-7 rounded-full bg-[#0B2369] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm border border-slate-100 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">BAI A.I is typing</span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B2369] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B2369] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B2369] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 bg-slate-100/80 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Suggested:
            </span>
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isLoading}
                className="text-[11px] bg-white hover:bg-blue-50 text-[#0B2369] border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shrink-0 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2 bg-slate-100/90 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0B2369]/30 focus-within:bg-white transition-all border border-slate-200/70">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask A.I a question about Bai Finance..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1.5 disabled:opacity-60"
              />

              <button
                type="submit"
                className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  inputMessage.trim() && !isLoading
                    ? "bg-[#0B2369] text-white hover:bg-[#071644] shadow-sm"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                disabled={!inputMessage.trim() || isLoading}
                aria-label="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              BAI A.I is powered by Groq & Bai Finance Knowledge Base.
            </p>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#0B2369] via-[#0D2A7F] to-[#1429A9] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/30 focus:outline-none focus:ring-4 focus:ring-[#0B2369]/30 cursor-pointer"
        style={{ boxShadow: "0 10px 30px rgba(11, 35, 105, 0.4)" }}
        aria-label="Open A.I Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping opacity-75 pointer-events-none" />

        {isOpen ? (
          <X className="w-7 h-7 text-white transition-transform duration-200" />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none">
            <Sparkles className="w-4 h-4 text-amber-400 mb-0.5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
              A.I
            </span>
          </div>
        )}

        {!isOpen && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
        )}
      </button>
    </div>
  );
}