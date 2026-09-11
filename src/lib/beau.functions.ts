import { supabase } from "@/integrations/supabase/client";

async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message || "That didn't work.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) message = parsed.error;
      } catch {
        // response wasn't JSON, keep the generic message
      }
    }
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
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
};

export type RoutineStage = {
  stage: string;
  product: string;
  brand: string;
  shade: string;
  tool: string;
  how: string;
};

export type ProductScan = {
  name: string;
  brand: string;
  category: string;
  shade: string;
  verdict: "great" | "okay" | "avoid" | string;
  reason: string;
  alternatives: { name: string; shade: string; why: string }[];
};

export function analyzeFace(args: { data: { image: string; prompt?: string } }) {
  return invoke<FaceAnalysis>("analyze-face", args.data);
}

export function buildRoutine(args: { data: { image: string; context?: string } }) {
  return invoke<{ stages: RoutineStage[] }>("build-routine", args.data);
}

export function scanProduct(args: { data: { image: string; skinContext?: string } }) {
  return invoke<ProductScan>("scan-product", args.data);
}

export function chatWithBeau(args: {
  data: { messages: { role: "user" | "assistant"; content: string }[]; profile?: string };
}) {
  return invoke<{ reply: string }>("chat-with-beau", args.data);
}

export function generateAfterImage(args: { data: { image: string; instructions: string } }) {
  return invoke<{ image: string }>("generate-after-image", args.data);
}

export async function startMakeoverVideo(args: {
  data: { image: string; instructions: string };
}): Promise<{ id: string }> {
  const result = await invoke<{ video: string; status: string }>("makeover-video", {
    image: args.data.image,
  });
  return { id: result.video };
}

export async function pollMakeoverVideo(args: {
  data: { id: string };
}): Promise<{ status: string; progress: number; url: string | null }> {
  return { status: "completed", progress: 100, url: args.data.id };
}
