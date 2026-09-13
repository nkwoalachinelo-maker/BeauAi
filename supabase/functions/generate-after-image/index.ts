import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, getUserId, jsonResponse } from "../_shared/shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    const { image, instructions } = await req.json();
    if (!image || typeof image !== "string") return jsonResponse({ error: "Bad image." }, 400);

    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!hfKey) throw new Error("AI is not configured yet.");

    const base64 = image.includes(",") ? image.split(",")[1] : image;

    const hfRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/timbrooks/instruct-pix2pix",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: base64,
          parameters: { prompt: instructions || "apply flattering natural makeup" },
        }),
      },
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      if (hfRes.status === 503) throw new Error("The image model is warming up — try again in ~20 seconds.");
      throw new Error(`Image generation failed (${hfRes.status}): ${text.slice(0, 200)}`);
    }

    const imageBytes = new Uint8Array(await hfRes.arrayBuffer());

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("beau-media")
      .upload(path, imageBytes, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error(`Couldn't save the result: ${uploadError.message}`);

    const { data } = supabaseAdmin.storage.from("beau-media").getPublicUrl(path);
    return jsonResponse({ image: data.publicUrl });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
