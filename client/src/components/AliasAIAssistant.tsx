/**
 * client/src/components/AliasAIAssistant.tsx — ألياس (ALIAS AI) floating chat.
 *
 * Bilingual smart-assistant widget wired to trpc.aliasAi.chat. Degrades
 * gracefully: shows a clear state when the AI engine is disabled, or when a
 * request fails — it never blocks the app.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ALIAS_SUGGESTED_PROMPTS } from "../../../shared/aliasAi";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ActionChip = { labelAr: string; href: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "مرحباً! أنا ألياس (ALIAS AI)، مساعدك الذكي في المنصة.\nاسألني عن المحاسبة، المخزون، أو كيفية استخدام النظام — وأجيبك بالعربية أو الإنجليزية.",
};

export function AliasAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [chips, setChips] = useState<ActionChip[]>([]);
  const [, setLocation] = useLocation();

  // Auth state decides the mode: tenant expert vs public website expert.
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isAuthed = Boolean(meQuery.data);

  const statusQuery = trpc.aliasAi.status.useQuery(undefined, { retry: false });
  const avatar = statusQuery.data?.avatar ?? "/elias-avatar.jpg";
  const avatarSmall = statusQuery.data?.avatarSmall ?? "/elias-avatar-sm.jpg";

  const handleSuccess = (response: {
    content: string;
    suggestions?: ReadonlyArray<{ labelAr: string; href: string }>;
  }) => {
    setMessages(prev => [...prev, { role: "assistant", content: response.content }]);
    if (response.suggestions?.length) setChips([...response.suggestions]);
  };

  const handleError = () => {
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content:
          "تعذّر إرسال الرسالة الآن — تحقق من اتصالك ثم أعد المحاولة. لن أخمّن إجابة عن بياناتك المالية.",
      },
    ]);
  };

  const chatMutation = trpc.aliasAi.chat.useMutation({
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const publicMutation = trpc.aliasAi.publicChat.useMutation({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const pending = chatMutation.isPending || publicMutation.isPending;
  const starterPrompts: ActionChip[] = ALIAS_SUGGESTED_PROMPTS.map(p => ({
    labelAr: p,
    href: "",
  }));
  const visibleChips = chips.length > 0 ? chips : starterPrompts;

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const windowed: ChatMessage[] = [...messages, userMsg].slice(-30);
    setMessages(windowed);
    setInput("");
    setChips([]);
    const payload = windowed.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    // Tenant mode gets full grounded data; visitors get the platform expert.
    if (isAuthed) chatMutation.mutate({ messages: payload });
    else
      publicMutation.mutate({
        messages: payload.map(m => ({
          role: m.role,
          content: m.content.slice(0, 4000),
        })),
      });
  };

  return (
    <div
      className="fixed right-5 z-40 font-display bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* Trigger */}
      <Button
        onClick={() => setIsOpen(v => !v)}
        aria-label="فتح المساعد الذكي ألياس"
        className="bg-gradient-to-l from-[#2a1a08] to-[#3d2812] hover:from-[#3d2812] hover:to-[#4d3418] text-white font-black h-12 px-4 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 border-2 border-[#d4a574]/40"
      >
        <img
          src={avatarSmall}
          alt=""
          className="w-8 h-8 rounded-full object-cover ring-1 ring-[#d4a574]/60"
        />
        <span className="text-xs hidden sm:inline">اسأل ألياس</span>
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-[min(380px,calc(100vw-2.5rem))] h-[480px] max-h-[calc(100vh-7rem)] bg-ink text-white border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <img
                src={avatar}
                alt="ألياس"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#d4a574]/50"
              />
              <div>
                <div className="text-xs font-bold text-[#d4a574] leading-tight">
                  ألياس — ALIAS AI
                </div>
                <div className="text-[10px] text-white/50 leading-tight">
                  {isAuthed ? "متصل ببيانات مؤسستك" : "وضع الزائر — خبير المنصة"}
                  {statusQuery.data?.enabled === false && " • محرك الذكاء غير مهيأ"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1 rounded"
              aria-label="إغلاق ألياس"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-white/90 text-[#102a2b] font-medium"
                      : "bg-white/5 border border-white/10 text-white/90"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending || publicMutation.isPending ? (
              <div className="text-[11px] text-white/40 animate-pulse">ألياس يفكر…</div>
            ) : null}
          </div>

          {/* Contextual action chips — starter prompts or intent-driven links */}
          {(messages.length <= 1 || chips.length > 0) && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {visibleChips.map((s, i) => (
                <button
                  key={`${s.labelAr}-${i}`}
                  onClick={() => {
                    if (s.href) {
                      setLocation(s.href);
                      setIsOpen(false);
                    } else {
                      send(s.labelAr);
                    }
                  }}
                  disabled={pending}
                  className={`text-[10px] border rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 ${
                    s.href
                      ? "bg-[#d4a574]/10 hover:bg-[#d4a574]/20 border-[#d4a574]/30 text-[#e8c9a0]"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70"
                  }`}
                >
                  {s.labelAr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-white/10 p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب سؤالك لألياس…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#b87945]"
              maxLength={4000}
              aria-label="رسالتك إلى ألياس"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || chatMutation.isPending}
              className="bg-[#d4a574] hover:bg-[#b87945] text-[#2a1a08] h-9 px-3 rounded-xl"
              aria-label="إرسال"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
