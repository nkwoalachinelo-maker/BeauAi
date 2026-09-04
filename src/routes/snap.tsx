import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Sparkles, Clapperboard, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { fileToDataUrl } from "@/components/CameraCapture";
import { AnalysisPanel } from "@/routes/index";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeFace,
  generateAfterImage,
  startMakeoverVideo,
  pollMakeoverVideo,
  buildRoutine,
  type RoutineStage,
  type FaceAnalysis,
} from "@/lib/beau.functions";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/snap")({
  head: () => ({
    meta: [
      { title: "Snap & Prompt — Beau AI Makeover Preview" },
      {
        name: "description",
        content:
          "Upload a photo, tell Beau AI the occasion, and get step-by-step advice plus an AI-generated after preview.",
      },
      { property: "og:title", content: "Snap & Prompt — Beau AI" },
      {
        property: "og:description",
        content: "Photo in, glow-up plan out: steps, shades and an AI after-preview of your look.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <Snap />
      </BeauShell>
    </AuthGate>
  ),
});

function Snap() {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeFace);
  const makeAfter = useServerFn(generateAfterImage);
  const startVideo = useServerFn(startMakeoverVideo);
  const pollVideo = useServerFn(pollMakeoverVideo);
  const routineFn = useServerFn(buildRoutine);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [stages, setStages] = useState<RoutineStage[]>([]);
  const [stageImages, setStageImages] = useState<(string | null)[]>([]);
  const [routineStatus, setRoutineStatus] = useState<string | null>(null);

  const reset = () => {
    setAnalysis(null);
    setAfter(null);
    setVideoUrl(null);
    setVideoStatus(null);
    setStages([]);
    setStageImages([]);
    setRoutineStatus(null);
  };

  const pick = async (file?: File) => {
    if (!file) return;
    setPhoto(await fileToDataUrl(file));
    reset();
  };


  const submit = async () => {
    if (!photo) {
      toast.error("Add a photo first.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setAfter(null);
    try {
      const result = await analyze({ data: { image: photo, prompt } });
      setAnalysis(result);
      const instructions = [
        result.steps?.join(" "),
        `Lipstick ${result.makeup.lipstick}, blush ${result.makeup.blush}, eyeshadow ${result.makeup.eyeshadow}, brows ${result.makeup.brow}, contour ${result.makeup.contour}.`,
      ]
        .filter(Boolean)
        .join(" ");
      const gen = await makeAfter({ data: { image: photo, instructions } });
      setAfter(gen.image);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const lookInstructions = (result: FaceAnalysis) =>
    [
      result.steps?.slice(0, 4).join(" "),
      `Lipstick ${result.makeup.lipstick}, blush ${result.makeup.blush}, eyeshadow ${result.makeup.eyeshadow}, brows ${result.makeup.brow}, contour ${result.makeup.contour}.`,
    ]
      .filter(Boolean)
      .join(" ");

  const stageScript = (list: RoutineStage[]) =>
    list
      .map((s, i) => `Step ${i + 1}: ${s.how} using ${s.brand} ${s.product} in ${s.shade}.`)
      .join(" ");

  const makeVideo = async () => {
    if (!photo || !analysis) return;
    setVideoUrl(null);
    setVideoStatus("Beau is filming your step-by-step…");
    try {
      const instructions = (
        stages.length ? stageScript(stages) : lookInstructions(analysis)
      ).slice(0, 650);
      const { id } = await startVideo({ data: { image: photo, instructions } });
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 7000));
        const job = await pollVideo({ data: { id } });
        if (job.url) {
          setVideoUrl(job.url);
          setVideoStatus(null);
          return;
        }
        setVideoStatus(`Beau is filming your step-by-step… ${job.progress ?? 0}%`);
      }
      setVideoStatus(null);
      toast.error("The video is taking too long. Try again.");
    } catch (e) {
      setVideoStatus(null);
      toast.error(e instanceof Error ? e.message : "Video generation failed.");
    }
  };

  /** Exact products + a picture of your face at each application stage. */
  const makeRoutine = async () => {
    if (!photo || !analysis) return;
    setRoutineStatus("Beau is picking your exact products…");
    setStages([]);
    setStageImages([]);
    try {
      const { stages: list } = await routineFn({
        data: { image: photo, context: `${prompt} ${analysis.skin_tone} ${analysis.undertone}` },
      });
      if (!list.length) throw new Error("Beau couldn't build a routine from that photo.");
      setStages(list);
      setStageImages(list.map(() => null));

      const applied: string[] = [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i]!;
        setRoutineStatus(`Showing stage ${i + 1} of ${list.length} — ${s.stage}…`);
        applied.push(`${s.product} in ${s.shade} (${s.how})`);
        const gen = await makeAfter({
          data: { image: photo, instructions: `Only these steps so far, nothing more: ${applied.join("; ")}` },
        });
        setStageImages((prev) => {
          const next = [...prev];
          next[i] = gen.image;
          return next;
        });
      }
      setRoutineStatus(null);
    } catch (e) {
      setRoutineStatus(null);
      toast.error(e instanceof Error ? e.message : "Couldn't build your routine.");
    }
  };


  const save = async () => {
    if (!analysis || !user) return;
    const { error } = await supabase.from("looks").insert({
      user_id: user.id,
      title: prompt.slice(0, 60) || "Snap look",
      mode: "snap",
      prompt,
      preview_url: after,
      analysis: JSON.parse(JSON.stringify(analysis)),
    });
    if (error) toast.error("Couldn't save that look.");
    else toast.success("Saved to your vanity.");
  };

  return (
    <div>
      <BeauHeader title="Upload a photo" subtitle="Photo in. Glow-up plan, preview and video out." />

      <div className="space-y-4 px-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-3xl surface-luxe"
        >
          {photo ? (
            <img src={photo} alt="Your uploaded photo" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="size-8 text-primary" />
              Tap to take or upload a photo
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="I have a wedding to attend… / How do I look better for pictures?"
          className="min-h-24 resize-none"
        />

        <Button
          size="lg"
          onClick={submit}
          disabled={loading}
          className="bg-gilded glow-gold h-13 w-full font-semibold tracking-widest text-primary-foreground uppercase hover:opacity-90"
        >
          {loading ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-5" />
          )}
          Get my glow-up
        </Button>

        {after ? (
          <div className="overflow-hidden rounded-3xl surface-luxe">
            <p className="px-4 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              After — Beau's preview
            </p>
            <img src={after} alt="AI preview of your look with the advice applied" className="w-full" />
          </div>
        ) : null}

        {analysis ? (
          <div className="space-y-3">
            <Button
              className="bg-gilded w-full text-primary-foreground hover:opacity-90"
              onClick={() => void makeRoutine()}
              disabled={Boolean(routineStatus)}
            >
              {routineStatus ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ListChecks className="mr-2 size-4" />
              )}
              {routineStatus ?? "Show my exact products, stage by stage"}
            </Button>

            {stages.map((s, i) => (
              <div key={`${s.stage}-${i}`} className="overflow-hidden rounded-3xl surface-luxe">
                {stageImages[i] ? (
                  <img
                    src={stageImages[i] as string}
                    alt={`Your face after stage ${i + 1}: ${s.stage}`}
                    className="w-full"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                )}
                <div className="space-y-1 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Stage {i + 1} · {s.stage}
                  </p>
                  <p className="text-sm font-medium">
                    {s.brand} {s.product} <span className="text-primary">· {s.shade}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.how}
                    {s.tool ? ` (${s.tool})` : ""}
                  </p>
                </div>
              </div>
            ))}

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void makeVideo()}
              disabled={Boolean(videoStatus)}
            >
              {videoStatus ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Clapperboard className="mr-2 size-4" />
              )}
              {videoStatus ?? "Watch Beau apply it, step by step"}
            </Button>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full overflow-hidden rounded-3xl surface-luxe"
              />
            ) : null}
          </div>
        ) : null}

        {analysis ? <AnalysisPanel analysis={analysis} onSave={save} /> : null}

      </div>
    </div>
  );
}
