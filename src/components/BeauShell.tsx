import { Link, useRouterState } from "@tanstack/react-router";
import { Camera, ImagePlus, ScanLine, Sparkles, Gem, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { BeauLogo } from "@/components/BeauLogo";

const TABS = [
  { to: "/", label: "Analyze", icon: Camera },
  { to: "/snap", label: "Upload", icon: ImagePlus },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/chat", label: "Beau", icon: Sparkles },
  { to: "/vanity", label: "Vanity", icon: Gem },
] as const;

export function BeauShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <main className="flex-1 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-1 py-3 text-[11px] tracking-wide transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2 : 1.4} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function BeauHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-8 pb-4">
      <div className="flex items-center gap-3">
        <BeauLogo className="size-9" />
        <div>
          <h1 className="text-gilded font-display text-3xl leading-tight">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      <Link
        to="/settings"
        aria-label="Settings"
        className="mt-1 rounded-full p-2 text-muted-foreground transition-colors hover:text-primary"
      >
        <Settings className="size-5" strokeWidth={1.5} />
      </Link>
    </header>
  );
}
