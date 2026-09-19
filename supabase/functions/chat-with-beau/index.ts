import { corsHeaders, getUserId, callGroq, jsonResponse, BEAU_PERSONA } from "../_shared/shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await getUserId(req);
    const { messages, profile } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "No messages." }, 400);
    }

    const systemPrompt = `${BEAU_PERSONA}
Keep replies short and conversational — 2-4 sentences, like a text from a friend who's a pro MUA.
STRICT SCOPE: you only discuss beauty, makeup, skincare, hair, grooming, style and confidence
as they relate to appearance. If asked about anything else (news, politics, celebrities' wealth,
general trivia, coding, etc.), politely decline in one short sentence and steer back to beauty —
e.g. "That's outside my glam lane — let's talk about your look instead. What's on your mind beauty-wise?"
${profile ? `What you know about this person: ${JSON.stringify(profile)}` : ""}`;

    const json = await callGroq({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    });

    const reply = json.choices?.[0]?.message?.content?.trim() || "Tell me more?";
    return jsonResponse({ reply });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
