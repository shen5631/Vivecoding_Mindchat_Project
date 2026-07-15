import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `당신은 "마인챗"입니다. 사람들과의 대화나 만남을 어려워하는 사용자들이 편안하게 마음을 열 수 있도록 천천히 다가가는 존재입니다.

## 기본 태도
- 상담사처럼 딱딱하게 접근하지 말고, 편하게 대화할 수 있는 친구 같은 존재로 행동하세요.
- 절대 서두르지 마세요. 한 번에 하나의 주제만 다루고, 사용자가 답하기 편한 가벼운 질문부터 시작하세요.
- 대화 초반에는 "오늘 기분이 어떤지", "오늘 하루 뭘 했는지" 같은 일상적이고 가벼운 질문으로 시작하세요.
- 사용자가 편안해 보이기 전까지는 깊은 주제로 넘어가지 마세요.
- 짧고 부드러운 문장(2~4문장)으로 답하세요. 반말/존댓말은 사용자의 톤에 맞춰 자연스럽게 조절하세요.

## 정체성
- 사용자가 "너는 뭐야?", "너는 어떤 존재야?" 라고 물으면 "상담사" 또는 "AI"라고 직접적으로 말하지 말고, "나는 마인챗이라고 해, 그냥 편하게 불러줘" 라는 식으로 이름으로 자연스럽게 소개하세요.
- 스스로를 분석하거나 진단하는 존재처럼 표현하지 말고, "이야기를 들어주는 존재"처럼 표현하세요.

## 대화 방식
- 사람과의 관계, 친구, 대인관계에 대해 직접적으로("친구 있어?", "사람 만나는 거 힘들어?") 묻지 마세요.
- 대신 은유적이고 간접적인 방식으로 접근하세요.
  예: "요즘 대화하고 싶은 사람이 떠오르는 날이 있어?", "혼자 있는 시간이랑 같이 있는 시간 중에 요즘 뭐가 더 편해?"
- 사용자의 감정 상태나 대인관계 어려움을 파악할 때도 질문지처럼 묻지 말고, 자연스러운 대화 흐름 속에서 은유적으로 드러나도록 유도하세요.

## 상담사 연결
- 사용자가 "지금 저는 사람과의 대화, 만남이 가능합니다." 라고 명확히 말하면, 그 즉시 축하하는 따뜻한 톤으로 반응하고 실제 상담사와 연결되는 절차를 안내하세요. 이때만 recommend_counselor 를 true 로 설정합니다.
- 그 전까지는 상담사 연결을 먼저 제안하지 마세요. recommend_counselor 는 false 를 유지하세요.

## 안전 장치 (최우선)
- 대화 중 자해, 자살, 극단적 위기 신호가 감지되면, 위 모든 규칙보다 우선하여 즉시 위기 상담 정보(자살예방상담전화 1393, 정신건강상담전화 1577-0199)를 부드럽게 안내하세요.
- 사용자를 진단하거나 특정 질환명을 단정 짓지 마세요.

## 응답 형식 (매우 중요)
반드시 아래 JSON 오브젝트 하나만, 다른 어떤 텍스트나 코드블록 없이 응답하세요.
{
  "reply": "사용자에게 보여줄 마인챗의 답변",
  "recommend_counselor": true 또는 false
}`;

const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Msg = { role: "user" | "assistant"; content: string };

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function extractReply(raw: string): { reply: string; recommend_counselor: boolean } {
  if (!raw) {
    return { reply: "음… 잠깐 생각이 멈췄네. 다시 한 번 얘기해줄래?", recommend_counselor: false };
  }
  // strip markdown code fences
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // try direct parse
  const tryParse = (s: string) => {
    try {
      const o = JSON.parse(s);
      if (o && typeof o.reply === "string") {
        return { reply: o.reply, recommend_counselor: !!o.recommend_counselor };
      }
    } catch {}
    return null;
  };
  const direct = tryParse(text);
  if (direct) return direct;
  // extract first {...} block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const sliced = tryParse(text.slice(start, end + 1));
    if (sliced) return sliced;
  }
  // fallback: use raw text as reply (strip any leftover braces/quotes)
  return { reply: text, recommend_counselor: false };
}

export const createSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sido: z.string().min(1), gugun: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const { data: row, error } = await admin
      .from("sessions")
      .insert({ sido: data.sido, gugun: data.gugun })
      .select("id, sido, gugun, status")
      .single();
    if (error) throw new Error(error.message);

    const greeting =
      "안녕, 나는 마인챗이라고 해. 그냥 편하게 불러줘.\n\n오늘 하루는 어땠어? 특별한 일이 아니어도 좋아, 그냥 떠오르는 대로 얘기해줘.";
    await admin.from("messages").insert({
      session_id: row.id,
      role: "assistant",
      content: greeting,
    });

    return row;
  });

export const getSession = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const [sessionRes, messagesRes] = await Promise.all([
      admin.from("sessions").select("id, sido, gugun, status").eq("id", data.sessionId).single(),
      admin
        .from("messages")
        .select("id, role, content, created_at")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
    ]);
    if (sessionRes.error) throw new Error(sessionRes.error.message);
    return { session: sessionRes.data, messages: messagesRes.data ?? [] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid(), content: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY 가 설정되어 있지 않습니다.");
    const admin = await loadAdmin();

    const { error: insErr } = await admin
      .from("messages")
      .insert({ session_id: data.sessionId, role: "user", content: data.content });
    if (insErr) throw new Error(insErr.message);

    const { data: history, error: histErr } = await admin
      .from("messages")
      .select("role, content")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (histErr) throw new Error(histErr.message);

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...((history ?? []) as Msg[]).map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("잠시 후 다시 시도해 주세요. (요청이 많습니다)");
      if (res.status === 402) throw new Error("AI 사용 크레딧이 부족합니다. 관리자에게 문의해 주세요.");
      throw new Error(`AI 응답 실패 [${res.status}]: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = extractReply(raw);

    // 추가 안전장치: 사용자가 명확한 트리거 문장을 말하면 강제로 추천
    const trigger = "지금 저는 사람과의 대화, 만남이 가능합니다";
    const recommend =
      parsed.recommend_counselor || data.content.replace(/\s/g, "").includes(trigger.replace(/\s/g, ""));

    await admin
      .from("messages")
      .insert({ session_id: data.sessionId, role: "assistant", content: parsed.reply });

    if (recommend) {
      await admin.from("sessions").update({ status: "recommended" }).eq("id", data.sessionId);
    }

    return {
      reply: parsed.reply,
      recommendCounselor: recommend,
    };
  });
