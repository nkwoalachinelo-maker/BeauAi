import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Couldn't sign you in. Try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    window.location.reload();
  };

  const submitEmail = async () => {
    if (!email || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-7 px-8 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Beau AI</p>
        <h1 className="text-gilded mt-3 font-display text-5xl leading-none">
          The Cosmetic
          <br />
          Legend
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your face, read in seconds. Your look, perfected — for every skin tone.
        </p>
      </div>

      <div className="w-full space-y-3">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          size="lg"
          onClick={() => void submitEmail()}
          disabled={busy}
          className="bg-gilded w-full font-medium text-primary-foreground hover:opacity-90"
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>

      <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        size="lg"
        variant="secondary"
        onClick={() => void signInGoogle()}
        disabled={busy}
        className="w-full font-medium"
      >
        {busy ? "One moment…" : "Continue with Google"}
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Your photos and looks stay private to your account.
      </p>
    </div>
  );
}
