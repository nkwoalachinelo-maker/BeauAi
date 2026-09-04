import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithBeau } from "@/lib/beau.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Beau — Celebrity Makeup Artist AI" },
      {
        name: "description",
        content:
          "Ask Beau AI anything about foundation, contouring, evening looks or skincare — expert answers for every skin tone.",
      },
      { property: "og:title", content: "Chat with Beau AI" },
      {
        property: "og:description",
        content: "A celebrity makeup artist in your pocket, honest and available 24/7.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <Chat />
      </BeauShell>
    </AuthGate>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What foundation for oily skin?",
  "Makeup for an evening event",
  "How do I contour a round face?",
];

function Chat() {
  const { user } = useAuth();
  const ask = useServerFn(chatWithBeau);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("chat_messages")
      .select("role, content")
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data.map((m) => ({ role: m.role as Msg["role"], content: m.content })));
      });
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || !user) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    void supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: text.trim() });
    try {
      const { reply } = await ask({ data: { messages: next.slice(-14) } });
      setMessages([...next, { role: "assistant", content: reply }]);
      void supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: reply });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Beau went quiet. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <BeauHeader title="Beau" subtitle="Your celebrity makeup artist, on call." />

      <div className="flex-1 space-y-3 px-5">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-4">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="w-full rounded-2xl surface-luxe px-4 py-3 text-left text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={`${i}-${m.content.slice(0, 12)}`}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-secondary text-secondary-foreground"
                : "surface-luxe text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Beau is thinking…
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-20 mt-4 flex gap-2 bg-background/95 px-5 py-3 backdrop-blur"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Beau anything…"
        />
        <Button type="submit" disabled={loading} className="bg-gilded text-primary-foreground">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
