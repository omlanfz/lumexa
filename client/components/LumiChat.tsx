// FILE PATH: client/components/LumiChat.tsx
//
// ─── Lumi — Neon Space Cat Chatbot Widget ────────────────────────────────────
//
// Matches the Lumexa logo: glowing neon space cat in navy/blue/cyan/purple.
//
// Architecture:
//   1. Calls POST /lumi/chat on the NestJS backend (JWT-authenticated)
//   2. Backend applies: FAQ rule engine → Ollama AI fallback
//   3. Coding/homework questions are blocked server-side (guardrail)
//
// Usage:
//   import LumiChat from "@/components/LumiChat";
//   <LumiChat variant="teacher" />           // purple Pilot theme
//   <LumiChat variant="student" />           // cyan Cadet theme (default)
//   <LumiChat variant="parent" />            // blue Commander theme

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

// ── Config ─────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "faq" | "ollama" | "guardrail" | "fallback";
}

export interface LumiChatProps {
  variant?: "teacher" | "student" | "parent";
}

// ── Greeting per variant ───────────────────────────────────────────────────────

const GREETINGS: Record<string, string> = {
  teacher:
    "Mrrrow, Pilot! 🐱✨\nI'm Lumi — your Lumexa space guide!\nNeed help with scheduling, earnings, students, or platform setup? I'm your cat.",
  student:
    "Hi there, Cadet! 🐱✨\nI'm Lumi — your guide through the Lumexa galaxy!\nAsk me how to book a class, find your lessons, or anything about the platform 🚀",
  parent:
    "Hello, Commander! 🐱✨\nI'm Lumi — here to help you navigate Lumexa!\nBooking lessons, managing students, tracking progress — just ask!",
};

// ── Markdown-lite renderer ─────────────────────────────────────────────────────
// Converts **bold**, *italic*, bullet lists, and newlines to JSX.

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    // Bullet
    const isBullet =
      line.trim().startsWith("• ") || line.trim().startsWith("- ");
    const content = isBullet ? line.trim().replace(/^[•\-]\s*/, "") : line;

    // Bold + inline
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pi} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={pi}>{part.slice(1, -1)}</em>;
      }
      return <span key={pi}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div key={li} className="flex gap-2 my-0.5">
          <span className="text-cyan-400 flex-shrink-0 mt-0.5">›</span>
          <span>{rendered}</span>
        </div>
      );
    }
    return (
      <div key={li} className={li > 0 && lines[li - 1] !== "" ? "mt-1" : ""}>
        {rendered}
      </div>
    );
  });
}

// ── SVG Space Cat Avatar ───────────────────────────────────────────────────────
// Simplified neon cat in a space helmet — matches the Lumexa logo aesthetic.

function LumiCatAvatar({
  size = 40,
  glowing = false,
}: {
  size?: number;
  glowing?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="helmet" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="bodyGrad" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="tailGrad" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#67e8f9" />
        </radialGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={glowing ? "3" : "1.5"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.5"
        opacity="0.3"
        filter="url(#glow)"
      />
      <circle
        cx="40"
        cy="40"
        r="33"
        fill="none"
        stroke="#818cf8"
        strokeWidth="0.75"
        opacity="0.2"
      />

      {/* Body / main circle */}
      <circle
        cx="40"
        cy="45"
        r="22"
        fill="url(#bodyGrad)"
        filter="url(#glow)"
      />

      {/* Helmet dome */}
      <ellipse
        cx="40"
        cy="34"
        rx="18"
        ry="18"
        fill="url(#helmet)"
        stroke="#22d3ee"
        strokeWidth="1.5"
        opacity="0.9"
        filter="url(#glow)"
      />
      {/* Helmet shine */}
      <ellipse
        cx="35"
        cy="28"
        rx="5"
        ry="3"
        fill="white"
        opacity="0.12"
        transform="rotate(-20 35 28)"
      />

      {/* Ears */}
      <polygon points="28,22 24,12 33,20" fill="#818cf8" filter="url(#glow)" />
      <polygon points="52,22 56,12 47,20" fill="#818cf8" filter="url(#glow)" />
      {/* Inner ears */}
      <polygon points="29,21 26,15 33,20" fill="#f0abfc" opacity="0.6" />
      <polygon points="51,21 54,15 47,20" fill="#f0abfc" opacity="0.6" />

      {/* Cat face */}
      {/* Eyes */}
      <ellipse
        cx="34"
        cy="33"
        rx="2.5"
        ry="2"
        fill="#0ea5e9"
        filter="url(#softGlow)"
      />
      <ellipse
        cx="46"
        cy="33"
        rx="2.5"
        ry="2"
        fill="#0ea5e9"
        filter="url(#softGlow)"
      />
      {/* Pupils */}
      <ellipse cx="34.5" cy="33" rx="1" ry="1.8" fill="#0c1445" />
      <ellipse cx="46.5" cy="33" rx="1" ry="1.8" fill="#0c1445" />
      {/* Eye shine */}
      <circle cx="35.5" cy="32" r="0.6" fill="white" opacity="0.8" />
      <circle cx="47.5" cy="32" r="0.6" fill="white" opacity="0.8" />

      {/* Nose */}
      <path d="M40 37 L38.5 39 L41.5 39 Z" fill="#f0abfc" opacity="0.9" />
      {/* Mouth */}
      <path
        d="M38.5 39 Q40 41 41.5 39"
        stroke="#f0abfc"
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
      {/* Whiskers */}
      <line
        x1="28"
        y1="37"
        x2="37"
        y2="38"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.5"
      />
      <line
        x1="28"
        y1="39"
        x2="37"
        y2="39.5"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.5"
      />
      <line
        x1="43"
        y1="38"
        x2="52"
        y2="37"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.5"
      />
      <line
        x1="43"
        y1="39.5"
        x2="52"
        y2="39"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.5"
      />

      {/* Tail */}
      <path
        d="M55 55 Q70 45 65 62 Q62 70 55 63"
        fill="url(#tailGrad)"
        opacity="0.85"
        filter="url(#glow)"
      />

      {/* Tiny stars */}
      <circle
        cx="62"
        cy="28"
        r="1.2"
        fill="#f0abfc"
        opacity="0.8"
        filter="url(#softGlow)"
      />
      <circle
        cx="18"
        cy="30"
        r="0.9"
        fill="#67e8f9"
        opacity="0.7"
        filter="url(#softGlow)"
      />
      <circle cx="65" cy="40" r="0.7" fill="white" opacity="0.6" />

      {/* Small planet */}
      <circle
        cx="64"
        cy="22"
        r="3"
        fill="#818cf8"
        opacity="0.7"
        filter="url(#glow)"
      />
      <ellipse
        cx="64"
        cy="22"
        rx="5"
        ry="1.5"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="0.8"
        opacity="0.6"
        transform="rotate(-20 64 22)"
      />

      {/* Helmet collar */}
      <ellipse cx="40" cy="50" rx="12" ry="3" fill="#1e3a8a" opacity="0.6" />
      <ellipse
        cx="40"
        cy="50"
        rx="12"
        ry="3"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}

// ── TypingDots ─────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-cyan-400"
          style={{
            animation: `lumiDot 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LumiChat({ variant = "student" }: LumiChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── On open: show greeting ────────────────────────────────────────────────

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: GREETINGS[variant] ?? GREETINGS.student,
          source: "faq",
        },
      ]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Send message ──────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setIsSpeaking(false);

    const tok = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${API}/lumi/chat`,
        { message: text, history, variant },
        tok ? { headers: { Authorization: `Bearer ${tok}` } } : {},
      );

      const reply: Message = {
        role: "assistant",
        content: res.data.reply,
        source: res.data.source,
      };

      setMessages((prev) => [...prev, reply]);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Oops! My signal got lost in space 🛸\nPlease try again — or email **support@lumexa.app** if this keeps happening!",
          source: "fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, variant]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: GREETINGS[variant] ?? GREETINGS.student,
        source: "faq",
      },
    ]);
  };

  // ── Source badge ──────────────────────────────────────────────────────────

  const sourceBadge = (source?: string) => {
    if (!source || source === "faq" || source === "fallback") return null;
    if (source === "guardrail") return null;
    if (source === "ollama")
      return (
        <span className="text-[9px] text-cyan-500/50 ml-1 font-mono select-none">
          AI
        </span>
      );
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Keyframe styles injected once ─────────────────────────────────── */}
      <style>{`
        @keyframes lumiFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes lumiPulse {
          0%, 100% { box-shadow: 0 0 16px 4px rgba(34,211,238,0.4), 0 0 32px 8px rgba(99,102,241,0.2); }
          50% { box-shadow: 0 0 28px 8px rgba(34,211,238,0.65), 0 0 56px 16px rgba(99,102,241,0.4); }
        }
        @keyframes lumiPulseSpeaking {
          0%, 100% { box-shadow: 0 0 20px 6px rgba(34,211,238,0.5), 0 0 40px 12px rgba(167,139,250,0.35); }
          50% { box-shadow: 0 0 40px 14px rgba(34,211,238,0.85), 0 0 70px 24px rgba(167,139,250,0.6); }
        }
        @keyframes lumiDot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes lumiSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lumiMessageIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lumiStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes lumiOrbitRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lumiGlowRing {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
        .lumi-msg-in { animation: lumiMessageIn 0.3s ease forwards; }
        .lumi-panel { animation: lumiSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .lumi-scroll::-webkit-scrollbar { width: 4px; }
        .lumi-scroll::-webkit-scrollbar-track { background: transparent; }
        .lumi-scroll::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.2); border-radius: 4px; }
        .lumi-scroll::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }
      `}</style>

      {/* ── Fixed container ────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3"
        aria-live="polite"
      >
        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        {open && (
          <div
            ref={panelRef}
            className="lumi-panel flex flex-col overflow-hidden"
            style={{
              width: "min(92vw, 380px)",
              maxHeight: "min(540px, calc(100svh - 120px))",
              // Dark navy panel with neon border
              background:
                "linear-gradient(160deg, #060d1f 0%, #0a1628 60%, #0d1b33 100%)",
              border: "1px solid rgba(34,211,238,0.25)",
              borderRadius: "20px",
              boxShadow:
                "0 0 0 1px rgba(99,102,241,0.15), 0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(34,211,238,0.08)",
            }}
            role="dialog"
            aria-label="Lumi AI assistant"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(14,22,50,0.95) 0%, rgba(10,30,70,0.95) 100%)",
                borderBottom: "1px solid rgba(34,211,238,0.15)",
              }}
            >
              {/* Header background stars */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white pointer-events-none"
                  style={{
                    width: Math.random() * 1.5 + 0.5 + "px",
                    height: Math.random() * 1.5 + 0.5 + "px",
                    top: Math.random() * 100 + "%",
                    left: 60 + Math.random() * 35 + "%",
                    animation: `lumiStarTwinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: Math.random() * 2 + "s",
                  }}
                />
              ))}

              {/* Avatar (small, in header) */}
              <div
                className="flex-shrink-0 relative"
                style={{
                  animation: "lumiFloat 3s ease-in-out infinite",
                  filter: isSpeaking
                    ? "drop-shadow(0 0 6px rgba(34,211,238,0.9))"
                    : "drop-shadow(0 0 4px rgba(34,211,238,0.5))",
                  transition: "filter 0.5s ease",
                }}
              >
                <LumiCatAvatar size={36} glowing={isSpeaking} />
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className="font-bold text-sm tracking-wide"
                    style={{
                      background:
                        "linear-gradient(90deg, #22d3ee, #818cf8, #f0abfc)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Lumi
                  </p>
                  {/* Live dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"
                    style={{ boxShadow: "0 0 4px 2px rgba(34,211,238,0.6)" }}
                  />
                </div>
                <p className="text-[10px] text-cyan-400/60 leading-none mt-0.5">
                  {isSpeaking ? "✨ Thinking..." : "Lumexa Space Guide 🐱"}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    className="text-[10px] px-2 py-1 rounded-lg transition-all"
                    style={{
                      color: "rgba(34,211,238,0.5)",
                      background: "rgba(34,211,238,0.05)",
                    }}
                    title="Clear chat"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-lg leading-none"
                  style={{ color: "rgba(34,211,238,0.5)" }}
                  aria-label="Close Lumi"
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      "rgba(34,211,238,0.9)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      "rgba(34,211,238,0.5)")
                  }
                >
                  ×
                </button>
              </div>
            </div>

            {/* ── Stars background in message area ────────────────────────── */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              {/* Fixed star decorations */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(14)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full bg-white"
                    style={{
                      width: Math.random() * 1.5 + 0.5 + "px",
                      height: Math.random() * 1.5 + 0.5 + "px",
                      top: Math.random() * 100 + "%",
                      left: Math.random() * 100 + "%",
                      animation: `lumiStarTwinkle ${2.5 + Math.random() * 3}s ease-in-out infinite`,
                      animationDelay: Math.random() * 3 + "s",
                      opacity: 0.3,
                    }}
                  />
                ))}
              </div>

              {/* ── Messages ─────────────────────────────────────────────── */}
              <div
                className="flex-1 overflow-y-auto lumi-scroll px-4 py-4 space-y-3 min-h-0"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`lumi-msg-in flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {/* Lumi avatar (assistant side) */}
                    {msg.role === "assistant" && (
                      <div
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          filter: "drop-shadow(0 0 3px rgba(34,211,238,0.4))",
                        }}
                      >
                        <LumiCatAvatar size={26} />
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                      style={
                        msg.role === "user"
                          ? {
                              background:
                                "linear-gradient(135deg, #1e40af 0%, #4338ca 100%)",
                              color: "#e0f2fe",
                              borderBottomRightRadius: "4px",
                              boxShadow:
                                "0 0 16px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
                            }
                          : {
                              background:
                                "linear-gradient(135deg, rgba(14,30,70,0.9) 0%, rgba(10,25,60,0.9) 100%)",
                              color: "#bae6fd",
                              borderBottomLeftRadius: "4px",
                              border: "1px solid rgba(34,211,238,0.18)",
                              boxShadow:
                                "0 0 12px rgba(34,211,238,0.06), inset 0 1px 0 rgba(34,211,238,0.06)",
                            }
                      }
                    >
                      {/* Source badge for guardrail */}
                      {msg.source === "guardrail" && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: "rgba(251,191,36,0.15)",
                              color: "#fbbf24",
                              border: "1px solid rgba(251,191,36,0.3)",
                            }}
                          >
                            Platform only
                          </span>
                        </div>
                      )}
                      <div className="text-sm leading-relaxed">
                        {renderMarkdown(msg.content)}
                      </div>
                      {sourceBadge(msg.source)}
                    </div>

                    {/* User avatar (right side) */}
                    {msg.role === "user" && (
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{
                          background:
                            "linear-gradient(135deg, #1d4ed8, #4f46e5)",
                          color: "#bae6fd",
                          border: "1px solid rgba(34,211,238,0.2)",
                        }}
                      >
                        ✦
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="lumi-msg-in flex gap-2.5 justify-start">
                    <div
                      className="flex-shrink-0 mt-0.5"
                      style={{
                        filter: "drop-shadow(0 0 3px rgba(34,211,238,0.4))",
                      }}
                    >
                      <LumiCatAvatar size={26} glowing />
                    </div>
                    <div
                      className="rounded-2xl rounded-bl-sm"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(14,30,70,0.9) 0%, rgba(10,25,60,0.9) 100%)",
                        border: "1px solid rgba(34,211,238,0.18)",
                      }}
                    >
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* ── Input area ──────────────────────────────────────────── */}
              <div
                className="flex-shrink-0 px-3 py-3"
                style={{
                  borderTop: "1px solid rgba(34,211,238,0.12)",
                  background:
                    "linear-gradient(0deg, rgba(6,13,31,0.95) 0%, rgba(8,18,42,0.8) 100%)",
                }}
              >
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask Lumi anything about Lumexa…"
                    disabled={loading}
                    maxLength={400}
                    className="flex-1 text-sm outline-none disabled:opacity-50 placeholder:text-cyan-900/60 bg-transparent"
                    style={{
                      background: "rgba(34,211,238,0.04)",
                      border: "1px solid rgba(34,211,238,0.2)",
                      borderRadius: "14px",
                      padding: "10px 14px",
                      color: "#bae6fd",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(34,211,238,0.5)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(34,211,238,0.08)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(34,211,238,0.2)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    aria-label="Message Lumi"
                  />

                  {/* Send button */}
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    aria-label="Send"
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background:
                        "linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #a855f7 100%)",
                      boxShadow: input.trim()
                        ? "0 0 16px rgba(14,165,233,0.5)"
                        : "none",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (input.trim())
                        (e.currentTarget as HTMLElement).style.transform =
                          "scale(1.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform =
                        "scale(1)";
                    }}
                  >
                    {/* Arrow up icon */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M8 13V3M3 8l5-5 5 5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <p
                  className="text-center mt-2 text-[10px] select-none"
                  style={{ color: "rgba(34,211,238,0.25)" }}
                >
                  Lumi guides · doesn't tutor · Enter to send
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Toggle button ──────────────────────────────────────────────── */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close Lumi" : "Open Lumi space cat assistant"}
          aria-expanded={open}
          className="relative flex items-center gap-2.5 select-none"
          style={{
            background: "linear-gradient(135deg, #060d1f 0%, #0c1a3d 100%)",
            border: "1px solid rgba(34,211,238,0.35)",
            borderRadius: "50px",
            padding: "8px 18px 8px 10px",
            animation: `lumiFloat 3.5s ease-in-out infinite, ${isSpeaking ? "lumiPulseSpeaking" : "lumiPulse"} 2.5s ease-in-out infinite`,
            cursor: "pointer",
            transition: "transform 0.2s, border-color 0.3s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.transform = "scale(1.04)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
          }
        >
          {/* Orbit ring decoration */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "1px solid rgba(34,211,238,0.12)",
              margin: "-4px",
              borderRadius: "54px",
              animation: "lumiGlowRing 2s ease-in-out infinite",
            }}
          />

          {/* Cat avatar */}
          <div
            style={{
              filter: `drop-shadow(0 0 ${open || isSpeaking ? "8px" : "4px"} rgba(34,211,238,0.7)) drop-shadow(0 0 16px rgba(129,140,248,0.4))`,
              transition: "filter 0.4s ease",
            }}
          >
            <LumiCatAvatar size={32} glowing={isSpeaking} />
          </div>

          {/* Label */}
          <div className="flex flex-col leading-none">
            <span
              className="text-sm font-bold tracking-wide"
              style={{
                background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {open ? "Close" : "Ask Lumi"}
            </span>
            {!open && (
              <span
                className="text-[9px] mt-0.5"
                style={{ color: "rgba(34,211,238,0.45)" }}
              >
                Space guide 🐱
              </span>
            )}
          </div>
        </button>
      </div>
    </>
  );
}
