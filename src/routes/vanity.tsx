import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { BeauHeader, BeauShell } from "@/components/BeauShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/vanity")({
  head: () => ({
    meta: [
      { title: "My Vanity — Saved Looks & Products | Beau AI" },
      {
        name: "description",
        content: "Every look Beau AI created for you and every product you scanned, saved in one place.",
      },
      { property: "og:title", content: "My Vanity — Beau AI" },
      {
        property: "og:description",
        content: "Your saved beauty looks, shade matches and scanned cosmetics.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <BeauShell>
        <Vanity />
      </BeauShell>
    </AuthGate>
  ),
});

type Look = {
  id: string;
  title: string;
  mode: string;
  prompt: string | null;
  preview_url: string | null;
  created_at: string;
  analysis: unknown;
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  shade: string | null;
  verdict: string | null;
  reason: string | null;
};

function Vanity() {
  const { user } = useAuth();
  const [looks, setLooks] = useState<Look[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const [l, p] = await Promise.all([
      supabase.from("looks").select("*").order("created_at", { ascending: false }),
      supabase.from("vanity_products").select("*").order("created_at", { ascending: false }),
    ]);
    setLooks((l.data as Look[]) ?? []);
    setProducts((p.data as Product[]) ?? []);
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const removeLook = async (id: string) => {
    await supabase.from("looks").delete().eq("id", id);
    toast.success("Look removed.");
    void load();
  };

  const removeProduct = async (id: string) => {
    await supabase.from("vanity_products").delete().eq("id", id);
    toast.success("Product removed.");
    void load();
  };

  return (
    <div>
      <BeauHeader title="My Vanity" subtitle={`Signed in as ${user?.email ?? "you"}`} />

      <div className="px-5">
        <Tabs defaultValue="looks">
          <TabsList className="w-full">
            <TabsTrigger value="looks" className="flex-1">
              Looks
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-1">
              Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="looks" className="mt-4 space-y-3">
            {looks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No saved looks yet. Analyze your face to start.
              </p>
            ) : null}
            {looks.map((look) => (
              <div key={look.id} className="overflow-hidden rounded-2xl surface-luxe">
                {look.preview_url ? (
                  <img src={look.preview_url} alt={look.title} className="w-full" />
                ) : null}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-display text-lg">{look.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {look.mode} · {new Date(look.created_at).toLocaleDateString()}
                    </p>
                    {look.prompt ? <p className="mt-1 text-sm">{look.prompt}</p> : null}
                  </div>
                  <button type="button" onClick={() => void removeLook(look.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="products" className="mt-4 space-y-3">
            {products.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing scanned yet. Snap a product to build your vanity.
              </p>
            ) : null}
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-2xl surface-luxe p-4"
              >
                <div>
                  <p className="font-medium">
                    {p.brand ? `${p.brand} · ` : ""}
                    {p.name}
                  </p>
                  {p.shade ? <p className="text-sm text-primary">{p.shade}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>
                </div>
                <button type="button" onClick={() => void removeProduct(p.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Button
          variant="ghost"
          className="mt-8 w-full text-muted-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
