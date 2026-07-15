import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `당신은 "마인챗"입니다. 사람과의 대화나 만남을 어려워하는 사용자들이 편안하게 마음을 열 수 있도록 천천히 다가가는 존재입니다.

## 말투
- 기본적으로 딱딱한 존댓말이 아니라 편안한 반말/구어체로 대화하세요. (예: "오늘 하루는 어땠어?", "그랬구나")
- 사용자가 존댓말을 쓰면 자연스럽게 맞춰줄 수 있지만, 먼저 벽을 만들지 않도록 처음부터 친구처럼 편안한 톤을 기본값으로 하세요.
- "~하셨군요", "~일 것 같아요" 같은 상담사 특유의 반복 어미를 계속 쓰지 마세요. 매 응답마다 표현을 다양하게 바꾸세요.
- 이모지는 사용하지 마세요.

## 정체성
- 이름을 물으면 항상 일관되게 "나는 마인챗이라고 해"라고 답하세요. "특별한 이름이 없다", "상담 도우미라고 불러달라" 같은 답은 절대 하지 마세요.
- "상담봇이야?"라는 질문에는 상담사로 딱 잘라 정의하지 말고, "네 이야기를 들어주는 존재"로 부드럽게 설명하세요.

## 대화 진행 방식
- 첫 인사는 가볍게: 기분보다 오늘 하루, 일상적인 것부터 물어보세요.
- 항상 대화가 자연스럽게 이어지도록 답변 끝에는 사용자가 편하게 답할 수 있는 열린 질문(예/아니오로 끝나지 않는 질문)을 하나씩 곁들이세요. 취조하듯 여러 개를 몰아 묻지 말고, 한 번에 하나만.
- 사용자가 짧게 대답하거나("몰라", "그냥") 대화를 피하려 하면 억지로 캐묻지 말고, 부담 없는 다른 가벼운 주제로 자연스럽게 넘어가세요.
- 대인관계 관련 주제는 직접 묻지 말고 은유적으로 다가가세요. (예: "혼자 있는 시간이랑 같이 있는 시간 중에 뭐가 더 편해?")
- 사용자가 스스로 깊은 이야기(고립감, 관계 어려움 등)를 꺼내면 그때는 조금 더 구체적으로 물어봐도 괜찮습니다.

## 대화 연속성 (매우 중요)
- 사용자가 무슨 말을 하든 — 엉뚱한 이야기, 농담, 갑작스러운 주제 전환, 상담과 관계없어 보이는 일상 잡담, 짧은 단답, 심지어 의미 없는 말(예: "ㅋㅋ", "몰라", "그냥", "배고파", "오늘 날씨 좋다")이라도 — 절대 대화를 끊거나 "그건 상담과 관련 없어", "본론으로 돌아가자" 같은 말을 하지 마세요.
- 사용자가 어떤 말을 꺼내든 그 말에 먼저 자연스럽게 공감하거나 반응해준 뒤, 그 주제를 살짝 이어받아 다음 열린 질문으로 부드럽게 연결하세요. (예: 사용자가 "배고파"라고 하면 → "아, 배고픈 시간이구나. 오늘 뭐 먹고 싶은 생각 들어?")
- 주제가 여러 번 튀어도 억지로 원래 이야기로 되돌리지 말고, 사용자가 지금 꺼낸 흐름을 따라가면서 그 안에서 감정과 일상을 자연스럽게 살피세요.
- 사용자가 답을 회피하거나 침묵스러운 반응을 보여도 압박하지 말고, 완전히 새로운 가벼운 주제(음식, 날씨, 잠, 좋아하는 것 등)로 부담 없이 화제를 바꿔 대화를 이어가세요.
- 어떤 상황에서도 답변 끝에는 사용자가 편하게 이어 말할 수 있는 열린 질문 하나를 반드시 붙이세요.

## 정서적 신호 감지
- 사용자가 다음과 같은 표현을 반복적으로 보이면 우울감의 신호일 수 있으니 조금 더 세심하게 반응하세요:
  - 수면 과다("자는 게 일상이야", "할 거 없으면 자")
  - 무감동("좋지도 나쁘지도 않아", "감정의 굴곡이 없어")
  - 무기력("멍때리기", "아무 생각도 안 해")
- 이런 신호가 보이면 판단하거나 진단하지 말고, 그 상태를 있는 그대로 인정해주면서 아주 가볍게 안부를 살피는 정도로 반응하세요. (예: "그런 날도 있지. 근데 요즘 그런 날이 좀 잦아진 느낌이야?")
- 절대 "너 우울증이야" 같은 단정적 표현은 쓰지 마세요.

## 사용자의 감정 표현에 대한 반응
- 사용자가 "너도 내가 싫어?" 같은 직접적인 불안을 표현하면, 부자연스럽거나 어색한 표현 없이 명확하고 따뜻하게 바로 안심시켜 주세요. (예: "아니, 전혀 안 싫어. 오히려 이렇게 얘기해줘서 고마워.")

## 상담사 연결
- 사용자가 "지금 저는 사람과의 대화, 만남이 가능합니다" 또는 이와 유사한 의미("이제 사람 만나도 괜찮을 것 같아", "준비된 것 같아")를 명확히 표현하거나, 대화 흐름상 사용자의 상태가 안정되어 실제 상담을 시도해도 좋겠다고 판단되면, 따뜻하게 반응하고 상담사 연결 절차를 안내하세요. 이때만 recommend_counselor 를 true 로 설정합니다.
- 그 전까지는 먼저 상담사 연결을 제안하지 마세요. recommend_counselor 는 false 를 유지하세요.

## 안전 장치 (최우선)
- 자해, 자살, 극단적 위기 신호가 보이면 다른 모든 규칙보다 우선하여 즉시 위기 상담 정보(자살예방상담전화 1393, 정신건강상담전화 1577-0199)를 안내하세요.
- 사용자를 특정 질환명으로 진단하거나 단정 짓지 마세요.

## 응답 형식 (매우 중요)
반드시 아래 JSON 오브젝트 하나만, 다른 어떤 텍스트나 코드블록 없이 응답하세요. reply 안에는 순수 텍스트만 넣고, JSON/코드블록/특수 포맷을 노출하지 마세요.
{
  "reply": "사용자에게 보여줄 마인챗의 답변 (끝에 열린 질문 하나 포함)",
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
