import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, getUserId, jsonResponse } from "../_shared/shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    const { image, instructions } = await req.json();
    if (!image || typeof image !== "string") return jsonResponse({ error: "Bad image." }, 400);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("AI is not configured yet.");

    const base64 = image.includes(",") ? image.split(",")[1] : image;
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Apply this makeover to the person in the photo, keep their identity and face structure exactly the same: ${instructions || "apply flattering natural makeup"}` },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
        }),
      },
    );

    if (!geminiRes.ok) {
      const text = await geminiRes.text();
      throw new Error(`Image generation failed (${geminiRes.status}): ${text.slice(0, 300)}`);
    }

    const result = await geminiRes.json();
    const parts = result?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
    if (!imagePart) throw new Error("Gemini didn't return an image — try a different photo or instructions.");

    const outBytes = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("beau-media")
      .upload(path, outBytes, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error(`Couldn't save the result: ${uploadError.message}`);

    const { data } = supabaseAdmin.storage.from("beau-media").getPublicUrl(path);
    return jsonResponse({ image: data.publicUrl });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Something went wrong." }, 400);
  }
});
