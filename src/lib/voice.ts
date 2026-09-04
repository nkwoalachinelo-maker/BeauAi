/** Beau's voice: always female, warm and natural-sounding. */

const FEMALE_HINTS = [
  "samantha",
  "ava",
  "allison",
  "serena",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "google uk english female",
  "google us english",
  "microsoft aria",
  "microsoft jenny",
  "microsoft zira",
  "female",
  "woman",
];

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  for (const hint of FEMALE_HINTS) {
    const match = pool.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}

/** Speaks text in short natural phrases so it sounds human rather than robotic. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const start = () => {
    const voice = pickFemaleVoice();
    const phrases = text
      .split(/(?<=[.!?,;:])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    phrases.forEach((phrase, i) => {
      const utter = new SpeechSynthesisUtterance(phrase);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang ?? "en-US";
      // gentle human variation in pace and pitch per phrase
      utter.rate = 0.92 + (i % 3) * 0.03;
      utter.pitch = 1.12 + (i % 2) * 0.06;
      utter.volume = 1;
      synth.speak(utter);
    });
  };

  if (synth.getVoices().length) start();
  else synth.addEventListener("voiceschanged", start, { once: true });
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
