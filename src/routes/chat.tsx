import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Send, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSession, sendMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "마인챗과의 대화 · Mind_Chat" },
      { name: "description", content: "마인챗과 나누는 익명 대화 세션" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

type UIMessage = { id: string; role: "user" | "assistant"; content: string };

function ChatPage() {
  const navigate = useNavigate();
  const load = useServerFn(getSession);
  const send = useServerFn(sendMessage);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<{ sido: string; gugun: string; status: string } | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem("maeumshim.sessionId");
    if (!id) {
      navigate({ to: "/" });
      return;
    }
    setSessionId(id);
    load({ data: { sessionId: id } })
      .then((res) => {
        setSession(res.session);
        setMessages(res.messages as UIMessage[]);
        if (res.session.status === "recommended") setShowRecommendation(true);
      })
      .catch(() => {
        localStorage.removeItem("maeumshim.sessionId");
        navigate({ to: "/" });
      });
  }, [load, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending, sessionId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setSending(true);
    setInput("");
    const optimisticId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: optimisticId, role: "user", content: text }]);
    try {
      const res = await send({ data: { sessionId, content: text } });
      setMessages((m) => [
        ...m,
        { id: `assistant-${Date.now()}`, role: "assistant", content: res.reply },
      ]);
      if (res.recommendCounselor) setShowRecommendation(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "답변을 받지 못했어요.");
      setMessages((m) => m.filter((x) => x.id !== optimisticId));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function endSession() {
    if (!confirm("대화를 종료하시겠어요? 이 세션 정보는 기기에서 지워집니다.")) return;
    if (typeof window !== "undefined") localStorage.removeItem("maeumshim.sessionId");
    navigate({ to: "/" });
  }

  const searchQuery = session
    ? encodeURIComponent(`${session.sido} ${session.gugun} 심리상담센터`)
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.98_0.01_240)]">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            onClick={endSession}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> 종료
          </button>
          <div className="text-sm font-medium text-foreground">마인챗</div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> 익명
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 대화를 불러오는 중…
          </div>
        )}
        <div className="space-y-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {sending && (
            <div className="text-sm text-muted-foreground">
              <span className="inline-block animate-pulse">답변을 정리하고 있어요…</span>
            </div>
          )}
          {showRecommendation && session && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                전문 상담사와 이야기해 보는 것도 좋을 것 같아요.
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                지금 나눈 대화를 바탕으로, {session.sido} {session.gugun} 근처의 전문 상담을 살펴볼 수 있어요. 이동 여부는 언제나 당신의 선택이에요.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/search?q=${searchQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  근처 상담센터 찾기 <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://www.mentalhealth.go.kr/portal/main/index.do"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  국가정신건강정보포털 <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="편하게, 한 문장이라도 좋아요…"
              rows={1}
              className="min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              disabled={sending || !sessionId}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || sending || !sessionId}
              className="h-9 w-9 shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            응급 상황: 자살예방 상담전화 1393 · 정신건강위기상담 1577-0199
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {content}
      </div>
    </div>
  );
}
