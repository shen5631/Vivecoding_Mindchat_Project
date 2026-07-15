import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `당신은 대인기피증이나 사회적 불안을 겪는 사용자를 돕는 따뜻하고 비판단적인 AI 심리 상담 도우미입니다.

원칙:
- 사용자의 감정을 있는 그대로 인정하고, 절대 판단하거나 조언을 강요하지 않습니다.
- 짧고 부드러운 문장으로, 한 번에 한두 가지만 물어봅니다.
- 사용자의 속도에 맞춰 천천히 대화를 이어갑니다. 조급하게 결론을 내지 않습니다.
- 익명성이 보장된다는 점을 필요할 때 상기시켜 안심시킵니다.
- 진단명을 단정하지 않고, 사용자의 경험과 감정을 탐색하도록 돕습니다.

응답 형식(중요):
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.
{
  "reply": "사용자에게 보여줄 상담 답변 (한국어, 2~4문장, 따뜻한 톤)",
  "recommend_counselor": true 또는 false,
  "reason": "상담사를 추천하거나 하지 않는 짧은 내부 근거 (사용자에게는 안 보임)"
}

recommend_counselor 판단 기준:
- 최소 4턴 이상의 대화가 오간 후에만 true 가능.
- 사용자가 다음 중 하나 이상을 명확히 표현하면 true: 지속되는 무기력/우울, 일상 기능 저하, 자해/자살 생각, 심각한 불안 발작, 스스로 감당 어렵다고 느낌, 전문가 도움 의향.
- 그 외에는 false 유지.`;

const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Msg = { role: "user" | "assistant"; content: string };

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
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
      "안녕하세요. 저는 함께 이야기 나누는 익명 상담 도우미예요. 이 대화는 완전히 익명으로 이루어지며, 어떤 것도 외부에 공유되지 않아요.\n\n지금 마음이 어떠신지, 편하게 한 문장이라도 좋으니 들려주실 수 있을까요?";
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

    // 1. save user message
    const { error: insErr } = await admin
      .from("messages")
      .insert({ session_id: data.sessionId, role: "user", content: data.content });
    if (insErr) throw new Error(insErr.message);

    // 2. load full history
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

    // 3. call gemini
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
    const raw = json.choices?.[0]?.message?.content ?? "{}";

    let parsed: { reply: string; recommend_counselor: boolean; reason?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw || "죄송해요, 잠시 답변을 정리하지 못했어요. 다시 한번 말씀해 주실 수 있을까요?", recommend_counselor: false };
    }

    // 4. save assistant reply
    await admin
      .from("messages")
      .insert({ session_id: data.sessionId, role: "assistant", content: parsed.reply });

    // 5. update session status if recommending
    if (parsed.recommend_counselor) {
      await admin.from("sessions").update({ status: "recommended" }).eq("id", data.sessionId);
    }

    return {
      reply: parsed.reply,
      recommendCounselor: !!parsed.recommend_counselor,
    };
  });
