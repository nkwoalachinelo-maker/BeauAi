import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, getUserId, jsonResponse } from "../_shared/shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    const { image } = await req.json();
    if (!image || typeof image !== "string") return jsonResponse({ error: "Bad image." }, 400);

    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!hfKey) throw new Error("AI is not configured yet.");

    const base64 = image.includes(",") ? image.split(",")[1] : image;

    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: base64 }),
      },
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      if (hfRes.status === 503) {
        return jsonResponse({ error: "The video model is warming up — try again in about a minute." }, 503);
      }
      throw new Error(`Video generation failed (${hfRes.status}): ${text.slice(0, 200)}`);
    }

    const videoBytes = new Uint8Array(await hfRes.arrayBuffer());

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `${userId}/${crypto.randomUUID()}.mp4`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("beau-media")
      .upload(path, videoBytes, { contentType: "video/mp4", upsert: true });
    if (uploadError) throw new Error(`Couldn't save the video: ${uploadError.message}`);

    const { data } = supabaseAdmin.storage.from("beau-media").getPublicUrl(path);
    return jsonResponse({ video: data.publicUrl, status: "complete" });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
