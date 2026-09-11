import { corsHeaders, getUserId, callGroq, parseJson, jsonResponse, BEAU_PERSONA } from "../_shared/shared.ts";

const EMPTY = {
  greeting: "", skin_tone: "", undertone: "", skin_texture: "",
  face_shape: "", eye_shape: "", lip_shape: "", symmetry: "",
  problem_areas: [] as string[], steps: [] as string[],
  products: [] as { product: string; shade: string; why: string }[],
  voice_script: "",
  makeup: {
    lipstick: "#B3403F", blush: "#D2695C", brow: "#4A4550",
    contour: "#A8909A", eyeshadow: "#C3AFC0", highlight: "#F6EFF7",
  },
};

const SCHEMA = `Be concise. Medium length — never an essay.
Return ONLY JSON:
{
 "greeting": string (1 short warm line),
 "skin_tone": string, "undertone": string, "skin_texture": string,
 "face_shape": string, "eye_shape": string, "lip_shape": string, "symmetry": string,
   — each 2-5 words max,
 "problem_areas": string[] (max 3, short phrases),
 "steps": string[] (exactly 4, one short sentence each),
 "products": [{"product": string, "shade": string, "why": string (max 10 words)}] (exactly 3),
 "voice_script": string (2-3 short spoken sentences, warm and direct),
 "makeup": {"lipstick": hex, "blush": hex, "brow": hex, "contour": hex, "eyeshadow": hex, "highlight": hex}
   — hex colors that flatter THIS person, matching the advice above.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await getUserId(req);
    const { image, prompt } = await req.json();
    if (!image || typeof image !== "string" || image.length < 20) {
      return jsonResponse({ error: "Bad image." }, 400);
    }
    const json = await callGroq({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: `${BEAU_PERSONA}\n${SCHEMA}` },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this face and tell me exactly what to do to look better.${prompt ? ` Context: ${prompt}` : ""}` },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    });
    const analysis = parseJson(json.choices?.[0]?.message?.content, EMPTY);
    return jsonResponse({ ...EMPTY, ...analysis, makeup: { ...EMPTY.makeup, ...(analysis.makeup ?? {}) } });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
