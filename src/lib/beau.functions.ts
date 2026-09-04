import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const BEAU_PERSONA = `You are Beau AI, "The Cosmetic Legend" — a top celebrity makeup artist.
You are confident, warm, honest and encouraging. You are a world expert in ALL skin tones,
especially deep, rich and olive complexions, and you never default to fair-skin advice.
Be specific: name shade families, finishes, placement and technique. Never be vague.`;

async function callGateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Beau is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep using Beau AI.");
    throw new Error(`Beau couldn't finish that (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as {
    choices: {
      message: { content?: string | null; images?: { image_url: { url: string } }[] };
    }[];
  };
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return fallback;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

export type FaceAnalysis = {
  greeting: string;
  skin_tone: string;
  undertone: string;
  skin_texture: string;
  face_shape: string;
  eye_shape: string;
  lip_shape: string;
  symmetry: string;
  problem_areas: string[];
  steps: string[];
  products: { product: string; shade: string; why: string }[];
  voice_script: string;
  makeup: {
    lipstick: string;
    blush: string;
    brow: string;
    contour: string;
    eyeshadow: string;
    highlight: string;
  };
  regions?: {
    lips?: number[];
    left_cheek?: number[];
    right_cheek?: number[];
    left_brow?: number[];
    right_brow?: number[];
    left_eye?: number[];
    right_eye?: number[];
    jaw_left?: number[];
    jaw_right?: number[];
    nose?: number[];
  };
};

const EMPTY: FaceAnalysis = {
  greeting: "",
  skin_tone: "",
  undertone: "",
  skin_texture: "",
  face_shape: "",
  eye_shape: "",
  lip_shape: "",
  symmetry: "",
  problem_areas: [],
  steps: [],
  products: [],
  voice_script: "",
  makeup: {
    lipstick: "#B3403F",
    blush: "#D2695C",
    brow: "#4A4550",
    contour: "#A8909A",
    eyeshadow: "#C3AFC0",
    highlight: "#F6EFF7",
  },
};

const ANALYSIS_SCHEMA = `Be concise. Medium length — never an essay.
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
   — hex colors that flatter THIS person, matching the advice above,
 "regions": {"lips":[x,y,w,h], "left_cheek":[x,y,w,h], "right_cheek":[x,y,w,h],
   "left_brow":[x,y,w,h], "right_brow":[x,y,w,h], "left_eye":[x,y,w,h], "right_eye":[x,y,w,h],
   "jaw_left":[x,y,w,h], "jaw_right":[x,y,w,h]}
   — normalized 0-1 boxes of these features in the supplied image, as accurate as possible.`;


export const analyzeFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ image: z.string().min(20), prompt: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: `${BEAU_PERSONA}\n${ANALYSIS_SCHEMA}` },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this face and tell me exactly what to do to look better.${
                data.prompt ? ` Context: ${data.prompt}` : ""
              }`,
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    });
    const analysis = parseJson<FaceAnalysis>(json.choices?.[0]?.message?.content, EMPTY);
    return { ...EMPTY, ...analysis, makeup: { ...EMPTY.makeup, ...(analysis.makeup ?? {}) } };
  });

export const generateAfterImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ image: z.string().min(20), instructions: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: "google/gemini-3.1-flash-image",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Apply this makeup to the person in the photo, photorealistically. Keep their exact identity, skin tone and features — only add the makeup: ${data.instructions}. Professional beauty lighting, natural skin texture.`,
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
      modalities: ["image", "text"],
    });
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
    return { image: url };
  });

/* ---------------- Exact product routine, stage by stage ---------------- */

export type RoutineStage = {
  stage: string;
  product: string;
  brand: string;
  shade: string;
  tool: string;
  how: string;
};

export const buildRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ image: z.string().min(20), context: z.string().max(600).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: `${BEAU_PERSONA}
Name EXACT real, widely available products with the exact shade name/number for THIS person's skin tone.
Return ONLY JSON: {"stages":[{"stage":string (2-3 words, e.g. "Base"),
"product":string (real product name),"brand":string,"shade":string (exact shade name or number),
"tool":string (brush/sponge/finger),"how":string (max 18 words, exactly how to apply)}]}
Exactly 5 stages, in application order.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Give me my exact product routine, stage by stage.${
                data.context ? ` Context: ${data.context}` : ""
              }`,
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    });
    const parsed = parseJson<{ stages: RoutineStage[] }>(json.choices?.[0]?.message?.content, {
      stages: [],
    });
    return { stages: (parsed.stages ?? []).slice(0, 5) };
  });

export type ProductScan = {

  name: string;
  brand: string;
  category: string;
  shade: string;
  verdict: "great" | "okay" | "avoid" | string;
  reason: string;
  alternatives: { name: string; shade: string; why: string }[];
};

export const scanProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ image: z.string().min(20), skinContext: z.string().max(500).optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: `${BEAU_PERSONA}
Identify the cosmetic product in the photo and judge it for the user.
Return ONLY JSON: {"name":string,"brand":string,"category":string,"shade":string,
"verdict":"great"|"okay"|"avoid","reason":string (max 25 words),
"alternatives":[{"name":string,"shade":string,"why":string}] (3 items)}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `What is this product and will it work for me?${
                data.skinContext ? ` My skin: ${data.skinContext}` : ""
              }`,
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    });
    return parseJson<ProductScan>(json.choices?.[0]?.message?.content, {
      name: "Unknown product",
      brand: "",
      category: "",
      shade: "",
      verdict: "okay",
      reason: "Beau couldn't read the label clearly. Try a closer, brighter shot.",
      alternatives: [],
    });
  });

export const chatWithBeau = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
          .min(1)
          .max(30),
        profile: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content: `${BEAU_PERSONA}\nKeep it medium: 2-4 short lines max, no long paragraphs.${
            data.profile ? `\nWhat you know about this client: ${data.profile}` : ""
          }`,
        },
        ...data.messages,
      ],
    });
    return { reply: json.choices?.[0]?.message?.content ?? "Say that again for me, love." };
  });

/* ---------------- AI makeover video (Veo) ---------------- */

function splitDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("That photo couldn't be read. Try another one.");
  return { mimeType: match[1] as string, data: match[2] as string };
}

async function videoApi(path: string, init?: RequestInit) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  const res = await fetch(`${GATEWAY}/videos${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(init?.headers ?? {}) },
  });
  return res;
}

/** Starts a Veo image-to-video job that shows the makeup being applied to the user's own photo. */
export const startMakeoverVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ image: z.string().min(20), instructions: z.string().min(3).max(700) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { mimeType, data: b64 } = splitDataUrl(data.image);
    const prompt = `Beauty tutorial close-up: a makeup artist's hands apply makeup to this exact person, keeping their identity, skin tone and features unchanged. A brush sweeps blush onto the cheeks, lipstick glides across the lips, eyeshadow is blended on the lids, brows are shaped — the look builds on camera until finished. Soft professional beauty lighting, gentle camera push-in. Look applied: ${data.instructions}`;
    const res = await videoApi("", {
      method: "POST",
      body: JSON.stringify({
        model: "google/veo-3.1-fast",
        instances: [
          { prompt, image: { bytesBase64Encoded: b64, mimeType } },
        ],
        parameters: { durationSeconds: 8, resolution: "720p", sampleCount: 1, generateAudio: false },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 402) throw new Error("AI credits are exhausted — add credits to make videos.");
      if (res.status === 429) throw new Error("A video is already generating. Give it a moment.");
      throw new Error(`Beau couldn't start the video (${res.status}): ${text.slice(0, 160)}`);
    }
    const job = (await res.json()) as { id: string };
    return { id: job.id };
  });

/** Polls a makeover video job; stores the finished MP4 privately and returns a signed URL. */
export const pollMakeoverVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const res = await videoApi(`/${data.id}`);
    if (!res.ok) throw new Error("Couldn't check the video status.");
    const job = (await res.json()) as {
      status: string;
      progress?: number;
      error?: { message?: string };
    };
    if (job.status === "failed") {
      throw new Error(job.error?.message ?? "The video couldn't be generated. Try another photo.");
    }
    if (job.status !== "completed") {
      return { status: job.status, progress: job.progress ?? 0, url: null as string | null };
    }

    const content = await videoApi(`/${data.id}/content`);
    if (!content.ok) throw new Error("Couldn't download the finished video.");
    const bytes = new Uint8Array(await content.arrayBuffer());

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/videos/${data.id}.mp4`;
    await supabaseAdmin.storage
      .from("beau-photos")
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    const { data: signed, error } = await supabaseAdmin.storage
      .from("beau-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (error || !signed?.signedUrl) throw new Error("Couldn't save the finished video.");
    return { status: "completed", progress: 100, url: signed.signedUrl };
  });
