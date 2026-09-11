import { corsHeaders, getUserId, callGroq, parseJson, jsonResponse, BEAU_PERSONA } from "../_shared/shared.ts";

const EMPTY = { stages: [] as { stage: string; product: string; brand: string; shade: string; tool: string; how: string }[] };

const SCHEMA = `Return ONLY JSON:
{"stages": [
  {"stage": string (e.g. "Base", "Eyes", "Brows", "Lips", "Finish"),
   "brand": string, "product": string, "shade": string, "tool": string,
   "how": string (1 short imperative sentence)}
]}
Give exactly 5 stages, in application order: base, eyes, brows, lips, finishing touch.
Be specific with real product types, real-sounding brands, and shade families suited to this person.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await getUserId(req);
    const { image, context } = await req.json();
    if (!image || typeof image !== "string") return jsonResponse({ error: "Bad image." }, 400);
    const json = await callGroq({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: `${BEAU_PERSONA}\n${SCHEMA}` },
        {
          role: "user",
          content: [
            { type: "text", text: `Build my exact makeup routine, stage by stage.${context ? ` Context: ${context}` : ""}` },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    });
    const routine = parseJson(json.choices?.[0]?.message?.content, EMPTY);
    return jsonResponse({ stages: routine.stages?.length ? routine.stages : EMPTY.stages });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
