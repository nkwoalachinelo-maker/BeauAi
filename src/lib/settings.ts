import { useCallback, useEffect, useState } from "react";

export type BeauSettings = {
  camera: "user" | "environment";
  mirror: boolean;
  voice: boolean;
  ar: boolean;
  autoAnalyze: boolean;
};

export const DEFAULT_SETTINGS: BeauSettings = {
  camera: "user",
  mirror: true,
  voice: true,
  ar: true,
  autoAnalyze: false,
};

const KEY = "beau.settings.v1";
const EVENT = "beau-settings-change";

export function readSettings(): BeauSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<BeauSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const sync = () => setSettings(readSettings());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<BeauSettings>) => {
    const next = { ...readSettings(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { settings, update };
}
