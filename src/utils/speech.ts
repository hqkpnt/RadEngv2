// Lightweight Web Speech pronunciation helper for single terms & example sentences

const ROBOTIC_VOICE_RE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|organ|trinoids|whisper|zarvox|superstar|wobble|ralph|junior|kathy|princess/i;

const PREMIUM_VOICE_RE =
  /natural|neural|online|premium|enhanced|siri|google uk english male|google us english|daniel|ava|zoe|evan|allison|tom|oliver|aria|andrew|brian|guy|ryan|samantha/i;

export interface RankedVoice {
  name: string;
  lang: string;
  score: number;
  label: string;
}

export function getRankedNaturalVoices(langPref: 'en-US' | 'en-GB' = 'en-US'): RankedVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

  return enVoices
    .map((v) => {
      let score = 10;
      const name = v.name;
      if (ROBOTIC_VOICE_RE.test(name)) score -= 100;
      if (/natural|neural|online/i.test(name)) score += 60;
      if (/premium|enhanced|siri/i.test(name)) score += 50;
      if (PREMIUM_VOICE_RE.test(name)) score += 25;
      if (v.lang.toLowerCase().startsWith(langPref.toLowerCase())) score += 15;
      if (!v.localService) score += 10;

      const tag =
        score >= 70 ? 'Studio/Neural' : score >= 45 ? 'Tự nhiên' : score < 0 ? 'Cũ' : 'Chuẩn';
      return {
        name: v.name,
        lang: v.lang,
        score,
        label: `${v.name} (${v.lang} · ${tag})`,
      };
    })
    .filter((v) => v.score > -50)
    .sort((a, b) => b.score - a.score);
}

function resolveVoice(
  lang: 'en-US' | 'en-GB',
  preferredVoiceName?: string
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (preferredVoiceName) {
    const exact = voices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }
  const ranked = getRankedNaturalVoices(lang);
  if (ranked.length > 0) {
    return voices.find((v) => v.name === ranked[0].name) || null;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(
  text: string,
  rate = 0.95,
  lang: 'en-US' | 'en-GB' = 'en-US',
  options?: { voiceName?: string }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  stopSpeech();
  const cleaned = text.replace(/\s*\/\s*/g, ', ').trim();
  if (!cleaned) return;

  try {
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = lang;
    utter.rate = Math.min(1.4, Math.max(0.65, rate));
    const voice = resolveVoice(lang, options?.voiceName);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore speech errors
  }
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[“”‘’'".,!?;:()[\]/\\]/g, '')
    .trim();
}
