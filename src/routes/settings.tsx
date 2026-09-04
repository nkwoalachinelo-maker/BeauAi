import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Beau AI" },
      {
        name: "description",
        content: "Choose your camera, mirror mode, voice guidance and AR preview inside Beau AI.",
      },
      { property: "og:title", content: "Beau AI Settings" },
      {
        property: "og:description",
        content: "Personalise Beau AI: front or back camera, vanity mirror mode, voice and AR preview.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <SettingsPage />
      </BeauShell>
    </AuthGate>
  ),
});

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div>
        <p className="text-sm">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const { settings, update } = useSettings();
  const { user } = useAuth();

  return (
    <div className="pb-6">
      <BeauHeader title="Settings" subtitle="Make Beau yours" />

      <section className="mx-5 divide-y divide-border overflow-hidden rounded-3xl surface-luxe">
        <Row label="Camera" hint="Front for your face, back for products">
          <div className="flex rounded-full bg-secondary p-1 text-xs">
            {(["user", "environment"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ camera: c })}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  settings.camera === c
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {c === "user" ? "Front" : "Back"}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Vanity mirror" hint="Glowing makeup-mirror frame on the front camera">
          <Switch checked={settings.mirror} onCheckedChange={(v) => update({ mirror: v })} />
        </Row>
        <Row label="AR preview" hint="Show makeup applied on your photo">
          <Switch checked={settings.ar} onCheckedChange={(v) => update({ ar: v })} />
        </Row>
        <Row label="Voice guidance" hint="Beau reads your advice aloud">
          <Switch checked={settings.voice} onCheckedChange={(v) => update({ voice: v })} />
        </Row>
      </section>

      <section className="mx-5 mt-5 rounded-3xl surface-luxe p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Account</p>
        <p className="mt-1 truncate text-sm">{user?.email ?? "Signed in"}</p>
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out.");
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
