import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Lock, EyeOff, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { createSession } from "@/lib/chat.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mind_Chat · 마인챗과 편하게 시작하는 대화" },
      {
        name: "description",
        content:
          "사람과의 대화가 부담스러운 순간, 마인챗과 익명으로 편하게 이야기해요. 준비가 되면 근처 전문 상담사와도 연결됩니다.",
      },
      { property: "og:title", content: "Mind_Chat · 마인챗과 편하게 시작하는 대화" },
      {
        property: "og:description",
        content: "사람과의 대화가 부담스러운 순간, 마인챗과 익명으로 편하게 이야기해요.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  const [agreed, setAgreed] = useState(false);
  const [sido, setSido] = useState<string>("");
  const [gugun, setGugun] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const create = useServerFn(createSession);

  const canStart = agreed && sido && gugun && !loading;
  const gugunList = sido ? (REGIONS[sido] ?? []) : [];

  async function handleStart() {
    if (!canStart) return;
    setLoading(true);
    try {
      const row = await create({ data: { sido, gugun } });
      if (typeof window !== "undefined") {
        localStorage.setItem("maeumshim.sessionId", row.id);
      }
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "세션을 시작하지 못했어요.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.98_0.02_240)] to-[oklch(0.94_0.04_220)] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Mind_Chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            혼자 담아둔 마음, 마인챗과 편하게 한 마디부터 시작해요.
          </p>
        </header>

        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">이용 전 안내</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <b className="text-foreground">완전한 익명 보장.</b> 이름·전화번호·이메일 등 신원 정보를 수집하지 않습니다.
              </span>
            </li>
            <li className="flex gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <b className="text-foreground">기록은 오직 상담 목적.</b> 대화 내용은 진단 흐름을 이어가기 위해서만 저장되며 외부에 공유되지 않습니다.
              </span>
            </li>
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <b className="text-foreground">전문가 연계는 동의 시에만.</b> AI가 상담사 연계를 제안해도 최종 결정은 항상 당신의 몫이에요.
              </span>
            </li>
          </ul>

          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} id="agree" />
            <span className="text-foreground">위 안내를 읽고 익명 상담을 시작하는 데 동의합니다.</span>
          </label>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">시/도</label>
              <Select
                value={sido}
                onValueChange={(v) => {
                  setSido(v);
                  setGugun("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {SIDO_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">구/군</label>
              <Select value={gugun} onValueChange={setGugun} disabled={!sido}>
                <SelectTrigger>
                  <SelectValue placeholder={sido ? "선택" : "시/도 먼저 선택"} />
                </SelectTrigger>
                <SelectContent>
                  {gugunList.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            지역 정보는 나중에 근처 전문 상담사를 추천하기 위해서만 사용돼요.
          </p>

          <Button
            className="mt-6 h-11 w-full text-base"
            disabled={!canStart}
            onClick={handleStart}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 준비 중…
              </>
            ) : (
              <>
                익명 상담 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          위급한 상황이시라면 즉시 자살예방 상담전화 <b className="text-foreground">1393</b> 으로 연락해 주세요.
        </p>
      </div>
    </div>
  );
}
