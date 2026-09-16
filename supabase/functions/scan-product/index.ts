import { corsHeaders, getUserId, callGroq, parseJson, jsonResponse, BEAU_PERSONA } from "../_shared/shared.ts";

const EMPTY = {
  name: "", brand: "", category: "", shade: "",
  verdict: "okay" as string, reason: "",
  alternatives: [] as { name: string; shade: string; why: string }[],
};

const SCHEMA = `Return ONLY JSON:
{"name": string, "brand": string, "category": string, "shade": string,
 "verdict": "great" | "okay" | "avoid",
 "reason": string (1-2 sentences),
 "alternatives": [{"name": string, "shade": string, "why": string}] (0-2 items, only if verdict isn't "great")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await getUserId(req);
    const { image, skinContext } = await req.json();
    if (!image || typeof image !== "string") return jsonResponse({ error: "Bad image." }, 400);
    const json = await callGroq({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: `${BEAU_PERSONA}\n${SCHEMA}` },
        {
          role: "user",
          content: [
            { type: "text", text: `Scan this product and tell me if it's right for me.${skinContext ? ` My skin: ${skinContext}` : ""}` },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    });
    const scan = parseJson(json.choices?.[0]?.message?.content, EMPTY);
    return jsonResponse({ ...EMPTY, ...scan });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
