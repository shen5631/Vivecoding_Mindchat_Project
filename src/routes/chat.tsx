import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Send, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

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
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = gap < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    // double rAF to wait for layout after new bubble mounts
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }),
    );
  }, [messages, sending, showRecommendation]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending, sessionId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    stickToBottomRef.current = true; // 새 메시지 보낼 땐 항상 하단으로
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
        </div>
      </div>

      <Dialog open={showRecommendation} onOpenChange={setShowRecommendation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>전문 상담사와 이야기해 볼까?</DialogTitle>
            <DialogDescription>
              지금까지 나눈 이야기를 바탕으로 준비가 된 것 같아. 원하지 않으면 언제든 닫아도 괜찮아.
              {session && (
                <>
                  <br />
                  <span className="mt-2 block text-foreground">
                    아래 버튼을 누르면 <b>{session.sido} {session.gugun}</b> 지역 정보를 가지고 마인드인포로 이동해서 근처 상담센터를 확인할 수 있어.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {session && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="text-muted-foreground">선택된 지역</div>
              <div className="mt-0.5 font-medium text-foreground">
                {session.sido} {session.gugun}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setShowRecommendation(false)}>
              취소
            </Button>
            {session && (
              <Button asChild>
                <a
                  href={`https://www.mindinfo.kr/new/index.asp?sido=${encodeURIComponent(session.sido)}&gugun=${encodeURIComponent(session.gugun)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {session.sido} {session.gugun} 상담센터 찾기 <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
