import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { MakeupOverlay } from "@/components/MakeupOverlay";
import { useCamera } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { analyzeFace, type FaceAnalysis } from "@/lib/beau.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beau AI — Live Face Analysis & AR Makeup Preview" },
      {
        name: "description",
        content:
          "Beau AI reads your skin tone, face shape and features live, then shows an AR preview of the makeup that flatters you most.",
      },
      { property: "og:title", content: "Beau AI — Your Cosmetic Legend" },
      {
        property: "og:description",
        content: "Live AI face analysis, AR makeup preview and expert beauty coaching for every skin tone.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <LiveAnalyze />
      </BeauShell>
    </AuthGate>
  ),
});

import { speak } from "@/lib/voice";


function LiveAnalyze() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const facing = settings.camera;
  const mirrorMode = facing === "user" && settings.mirror;
  const { videoRef, ready, error, start, capture } = useCamera(facing);
  const run = useServerFn(analyzeFace);
  const [shot, setShot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void start();
  }, [start]);

  const analyze = async () => {
    const frame = capture();
    if (!frame) {
      toast.error("Camera isn't ready yet.");
      return;
    }
    setShot(frame);
    setAnalysis(null);
    setLoading(true);
    try {
      const result = await run({ data: { image: frame } });
      setAnalysis(result);
      if (settings.voice && result.voice_script) speak(result.voice_script);
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveLook = async () => {
    if (!analysis || !user) return;
    const { error: dbError } = await supabase.from("looks").insert({
      user_id: user.id,
      title: analysis.face_shape ? `${analysis.skin_tone} · ${analysis.face_shape}` : "Live look",
      mode: "live",
      analysis: JSON.parse(JSON.stringify(analysis)),
    });
    if (dbError) toast.error("Couldn't save that look.");
    else toast.success("Saved to your vanity.");
  };

  return (
    <div>
      <BeauHeader title="Beau AI" subtitle="Your Cosmetic Legend" />

      <div className={`relative mx-5 overflow-hidden rounded-[2rem] surface-luxe ${mirrorMode ? "mirror-frame" : ""}`}>
        <div className="aspect-[3/4] w-full bg-secondary">
          {shot && analysis ? (
            <MakeupOverlay
              image={shot}
              analysis={analysis}
              enabled={settings.ar}
              className="size-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
          )}
        </div>
        {mirrorMode ? <span className="mirror-sheen pointer-events-none absolute inset-0" /> : null}
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Beau is reading your face…</p>
          </div>
        ) : null}
        {error ? (
          <p className="absolute inset-x-0 bottom-0 bg-background/85 p-3 text-center text-xs text-muted-foreground">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 px-6 text-xs text-muted-foreground">
        <span>{facing === "user" ? (mirrorMode ? "Vanity mirror" : "Front camera") : "Back camera"}</span>
        {shot ? (
          <button
            type="button"
            onClick={() => {
              setShot(null);
              setAnalysis(null);
              void start();
            }}
            className="flex items-center gap-1.5 text-primary"
          >
            <Camera className="size-4" /> Retake
          </button>
        ) : null}
      </div>

      <div className="px-5 pt-4">
        <Button
          size="lg"
          onClick={analyze}
          disabled={loading || (!ready && !shot)}
          className="bg-gilded glow-gold h-14 w-full text-base font-semibold tracking-[0.2em] text-primary-foreground uppercase hover:opacity-90"
        >
          <Wand2 className="mr-2 size-5" /> Analyze me
        </Button>
      </div>

      <div ref={resultRef} className="space-y-4 px-5 pt-6">
        {analysis ? <AnalysisPanel analysis={analysis} onSave={saveLook} /> : null}
      </div>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  onSave,
}: {
  analysis: FaceAnalysis;
  onSave?: () => void;
}) {
  const facts = [
    ["Skin tone", analysis.skin_tone],
    ["Undertone", analysis.undertone],
    ["Texture", analysis.skin_texture],
    ["Face shape", analysis.face_shape],
    ["Eyes", analysis.eye_shape],
    ["Lips", analysis.lip_shape],
    ["Symmetry", analysis.symmetry],
  ].filter(([, v]) => Boolean(v));

  return (
    <div className="space-y-4">
      {analysis.greeting ? (
        <p className="font-display text-xl leading-snug text-foreground">{analysis.greeting}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-2xl surface-luxe p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {analysis.problem_areas?.length ? (
        <div className="rounded-2xl surface-luxe p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Watch outs</p>
          <ul className="mt-2 space-y-1 text-sm">
            {analysis.problem_areas.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.steps?.length ? (
        <div className="rounded-2xl surface-luxe p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            To look better
          </p>
          <ol className="mt-2 space-y-2 text-sm">
            {analysis.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="text-gilded font-display text-lg leading-none">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {analysis.products?.length ? (
        <div className="rounded-2xl surface-luxe p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Shades for you
          </p>
          <ul className="mt-2 space-y-3 text-sm">
            {analysis.products.map((p) => (
              <li key={`${p.product}-${p.shade}`}>
                <p className="font-medium">
                  {p.product} <span className="text-primary">· {p.shade}</span>
                </p>
                <p className="text-xs text-muted-foreground">{p.why}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onSave ? (
        <Button variant="secondary" className="w-full" onClick={onSave}>
          <Save className="mr-2 size-4" /> Save look
        </Button>
      ) : null}
    </div>
  );
}
