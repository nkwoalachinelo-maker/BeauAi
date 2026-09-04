import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, ScanLine, Save } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { fileToDataUrl } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scanProduct, type ProductScan } from "@/lib/beau.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Product Scanner — Beau AI Shade Match" },
      {
        name: "description",
        content:
          "Snap any lipstick, foundation or palette and Beau AI identifies the shade and tells you if it suits your skin tone.",
      },
      { property: "og:title", content: "Product Scanner — Beau AI" },
      {
        property: "og:description",
        content: "Identify any cosmetic, get an honest verdict and three better alternatives.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <Scan />
      </BeauShell>
    </AuthGate>
  ),
});

function Scan() {
  const { user } = useAuth();
  const run = useServerFn(scanProduct);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [result, setResult] = useState<ProductScan | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async (image: string) => {
    setLoading(true);
    setResult(null);
    try {
      setResult(await run({ data: { image, skinContext: context } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!result || !user) return;
    const { error } = await supabase.from("vanity_products").insert({
      user_id: user.id,
      name: result.name,
      brand: result.brand,
      category: result.category,
      shade: result.shade,
      verdict: result.verdict,
      reason: result.reason,
      alternatives: JSON.parse(JSON.stringify(result.alternatives ?? [])),
    });
    if (error) toast.error("Couldn't save that product.");
    else toast.success("Added to My Vanity.");
  };

  const verdictTone =
    result?.verdict === "avoid"
      ? "text-destructive"
      : result?.verdict === "great"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div>
      <BeauHeader title="Product Scanner" subtitle="Is it your shade? Beau will be honest." />

      <div className="space-y-4 px-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl surface-luxe"
        >
          {photo ? (
            <img src={photo} alt="Scanned product" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="size-8 text-primary" />
              Snap the product or its label
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const image = await fileToDataUrl(file);
            setPhoto(image);
            await scan(image);
          }}
        />

        <Input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Your skin, e.g. deep neutral, oily T-zone"
        />

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading the label…
          </p>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl surface-luxe p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {result.brand || "Product"} · {result.category}
              </p>
              <h2 className="mt-1 font-display text-2xl">{result.name}</h2>
              {result.shade ? <p className="text-sm text-primary">Shade: {result.shade}</p> : null}
              <p className={`mt-3 text-sm font-medium uppercase tracking-widest ${verdictTone}`}>
                {result.verdict}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{result.reason}</p>
            </div>

            {result.alternatives?.length ? (
              <div className="rounded-2xl surface-luxe p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Better for you
                </p>
                <ul className="mt-2 space-y-3 text-sm">
                  {result.alternatives.map((a) => (
                    <li key={`${a.name}-${a.shade}`}>
                      <p className="font-medium">
                        {a.name} <span className="text-primary">· {a.shade}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{a.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button variant="secondary" className="w-full" onClick={save}>
              <Save className="mr-2 size-4" /> Add to My Vanity
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
