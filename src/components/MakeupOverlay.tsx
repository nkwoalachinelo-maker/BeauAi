import { useEffect, useRef } from "react";
import type { FaceAnalysis } from "@/lib/beau.functions";

type Box = number[] | undefined;

function blob(
  ctx: CanvasRenderingContext2D,
  box: Box,
  color: string,
  alpha: number,
  w: number,
  h: number,
  blur = 0.5,
) {
  if (!box || box.length < 4) return;
  const [bx = 0, by = 0, bw = 0, bh = 0] = box;
  const cx = (bx + bw / 2) * w;
  const cy = (by + bh / 2) * h;
  const rx = Math.max((bw * w) / 2, 4);
  const ry = Math.max((bh * h) / 2, 4);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = `blur(${Math.max(rx, ry) * blur}px)`;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Renders a soft AR-style makeup pass over the captured frame using the AI's face regions. */
export function MakeupOverlay({
  image,
  analysis,
  enabled = true,
  className,
}: {
  image: string;
  analysis: FaceAnalysis | null;
  enabled?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const w = (canvas.width = img.naturalWidth);
      const h = (canvas.height = img.naturalHeight);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      if (!enabled || !analysis) return;
      const r = analysis.regions ?? {};
      const m = analysis.makeup;
      ctx.globalCompositeOperation = "multiply";
      blob(ctx, r.lips, m.lipstick, 0.72, w, h, 0.25);
      blob(ctx, r.left_cheek, m.blush, 0.32, w, h, 0.8);
      blob(ctx, r.right_cheek, m.blush, 0.32, w, h, 0.8);
      blob(ctx, r.left_brow, m.brow, 0.45, w, h, 0.3);
      blob(ctx, r.right_brow, m.brow, 0.45, w, h, 0.3);
      blob(ctx, r.left_eye, m.eyeshadow, 0.4, w, h, 0.6);
      blob(ctx, r.right_eye, m.eyeshadow, 0.4, w, h, 0.6);
      blob(ctx, r.jaw_left, m.contour, 0.28, w, h, 0.9);
      blob(ctx, r.jaw_right, m.contour, 0.28, w, h, 0.9);
      ctx.globalCompositeOperation = "screen";
      blob(ctx, r.nose, m.highlight, 0.25, w, h, 0.8);
      ctx.globalCompositeOperation = "source-over";
    };
    img.src = image;
  }, [image, analysis, enabled]);

  return <canvas ref={canvasRef} className={className} />;
}
