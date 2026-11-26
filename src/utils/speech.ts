// Natural Documentary Narration Engine (Discovery-style Prosody) +
// Resilient Speaking Pronunciation (SpeechRecognition + Offline MediaRecorder Fallback) +
// Word-by-Word Dictation Diff

const ROBOTIC_VOICE_RE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|organ|trinoids|whisper|zarvox|superstar|wobble|ralph|junior|kathy|princess/i;

const PREMIUM_VOICE_RE =
  /natural|neural|online|premium|enhanced|siri|google uk english male|google us english|daniel|ava|zoe|evan|allison|tom|oliver|aria|andrew|brian|guy|ryan|samantha/i;

let narrationAbortToken = 0;

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
      if (/google uk english male|daniel|evan|andrew|brian|guy|oliver|tom/i.test(name)) {
        // Warm documentary narrator tones get a boost
        score += 35;
      } else if (PREMIUM_VOICE_RE.test(name)) {
        score += 25;
      }
      if (v.lang.toLowerCase().startsWith(langPref.toLowerCase())) score += 15;
      if (!v.localService) score += 10; // cloud neural voices sound much smoother

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
  narrationAbortToken += 1;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(
  text: string,
  rate = 0.95,
  lang: 'en-US' | 'en-GB' = 'en-US',
  options?: { voiceName?: string; style?: 'discovery' | 'standard' }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  stopSpeech();
  const style = options?.style || 'discovery';
  const cleaned = text.replace(/\s*\/\s*/g, ', ').trim();
  if (!cleaned) return;

  if (style === 'discovery' && cleaned.split(/\s+/).length >= 6) {
    void speakDocumentary([{ id: 'single', en: cleaned }], {
      rate,
      lang,
      voiceName: options?.voiceName,
      style: 'discovery',
    });
    return;
  }

  try {
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = lang;
    utter.rate = Math.min(1.4, Math.max(0.65, rate));
    utter.pitch = style === 'discovery' ? 0.93 : 1.0;
    const voice = resolveVoice(lang, options?.voiceName);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore speech errors
  }
}

function speakChunk(
  text: string,
  opts: { rate: number; pitch: number; lang: 'en-US' | 'en-GB'; voice: SpeechSynthesisVoice | null },
  token: number
): Promise<void> {
  return new Promise((resolve) => {
    if (token !== narrationAbortToken || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = opts.lang;
    utter.rate = Math.min(1.35, Math.max(0.65, opts.rate));
    utter.pitch = Math.min(1.15, Math.max(0.82, opts.pitch));
    if (opts.voice) utter.voice = opts.voice;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function waitMs(ms: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (token !== narrationAbortToken) {
      resolve();
      return;
    }
    window.setTimeout(resolve, ms);
  });
}

/**
 * Discovery-Channel-inspired Documentary Narration:
 * Breaks sentences into rhetorical clauses with natural pauses, measured pacing,
 * and subtle pitch inflection so clinical & academic audio feels engaging and human.
 */
export async function speakDocumentary(
  sentences: Array<{ id: string; en: string }>,
  options: {
    rate?: number;
    lang?: 'en-US' | 'en-GB';
    voiceName?: string;
    style?: 'discovery' | 'standard';
    onSentenceStart?: (id: string) => void;
    onFinish?: () => void;
  } = {}
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onFinish?.();
    return;
  }

  stopSpeech();
  const token = narrationAbortToken;
  const lang = options.lang || 'en-US';
  const baseRate = options.rate ?? 0.95;
  const style = options.style || 'discovery';
  const voice = resolveVoice(lang, options.voiceName);

  for (let sIdx = 0; sIdx < sentences.length; sIdx += 1) {
    if (token !== narrationAbortToken) break;
    const item = sentences[sIdx];
    options.onSentenceStart?.(item.id);
    const cleaned = item.en.replace(/\s*\/\s*/g, ', ').trim();

    if (style === 'standard') {
      await speakChunk(cleaned, { rate: baseRate, pitch: 1.0, lang, voice }, token);
      await waitMs(280, token);
      continue;
    }

    // Split into dramatic rhetorical clauses (commas, colons, dashes, semicolons)
    const clauses = cleaned
      .split(/(?<=[,;:\u2014-])\s+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (let cIdx = 0; cIdx < clauses.length; cIdx += 1) {
      if (token !== narrationAbortToken) break;
      const clause = clauses[cIdx];
      const isOpening = cIdx === 0;
      const isClosing = cIdx === clauses.length - 1;
      const isQuestion = clause.endsWith('?');

      // Subtle documentary cadence: authoritative opening, slight lift mid-clause, grounded finish
      const clauseRate = isClosing ? baseRate * 0.92 : isOpening ? baseRate * 0.95 : baseRate * 0.98;
      const clausePitch = isQuestion ? 1.02 : isClosing ? 0.9 : isOpening ? 0.95 : 0.97;

      await speakChunk(
        clause,
        { rate: clauseRate, pitch: clausePitch, lang, voice },
        token
      );

      if (cIdx < clauses.length - 1) {
        const pause = /[:\u2014;]$/.test(clause) ? 340 : 190;
        await waitMs(pause, token);
      }
    }

    if (sIdx < sentences.length - 1) {
      await waitMs(480, token);
    }
  }

  if (token === narrationAbortToken) {
    options.onFinish?.();
  }
}

// Word normalization & Dictation Diff
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[“”‘’'".,!?;:()[\]/\\]/g, '')
    .trim();
}

export interface DictationToken {
  expected: string;
  actual?: string;
  status: 'correct' | 'first_mismatch' | 'wrong' | 'missing';
}

export interface DictationEvaluation {
  isPerfect: boolean;
  accuracy: number;
  firstMismatchIndex: number;
  firstMismatchHint: string;
  tokens: DictationToken[];
  extraWords: string[];
}

export function evaluateDictation(expectedSentence: string, userInput: string): DictationEvaluation {
  const expectedRaw = expectedSentence
    .replace(/\s*\/\s*/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const actualRaw = userInput.trim().split(/\s+/).filter(Boolean);

  let firstMismatchIndex = -1;
  let correctCount = 0;

  const tokens: DictationToken[] = expectedRaw.map((exp, idx) => {
    const act = actualRaw[idx];
    const normExp = normalizeWord(exp);
    const normAct = act ? normalizeWord(act) : '';

    if (act !== undefined && normExp === normAct) {
      correctCount += 1;
      return { expected: exp, actual: act, status: 'correct' };
    }

    if (firstMismatchIndex === -1) {
      firstMismatchIndex = idx;
      return {
        expected: exp,
        actual: act,
        status: 'first_mismatch',
      };
    }

    return {
      expected: exp,
      actual: act,
      status: act === undefined ? 'missing' : 'wrong',
    };
  });

  const extraWords = actualRaw.length > expectedRaw.length ? actualRaw.slice(expectedRaw.length) : [];
  if (firstMismatchIndex === -1 && extraWords.length > 0) {
    firstMismatchIndex = expectedRaw.length;
  }

  const isPerfect = firstMismatchIndex === -1 && extraWords.length === 0 && expectedRaw.length > 0;
  const accuracy =
    expectedRaw.length === 0
      ? 0
      : Math.max(
          0,
          Math.round(((correctCount - extraWords.length * 0.5) / expectedRaw.length) * 100)
        );

  let firstMismatchHint = '';
  if (firstMismatchIndex >= 0 && firstMismatchIndex < expectedRaw.length) {
    const word = expectedRaw[firstMismatchIndex];
    const clean = normalizeWord(word);
    firstMismatchHint =
      clean.length > 2
        ? `Từ #${firstMismatchIndex + 1} bắt đầu bằng "${clean.slice(0, 2)}..." (${clean.length} chữ cái)`
        : `Từ #${firstMismatchIndex + 1} có ${clean.length} chữ cái ("${clean[0] || ''}...")`;
  } else if (extraWords.length > 0) {
    firstMismatchHint = `Bạn gõ dư ${extraWords.length} từ ở cuối câu: "${extraWords.join(' ')}"`;
  }

  return {
    isPerfect,
    accuracy,
    firstMismatchIndex,
    firstMismatchHint,
    tokens,
    extraWords,
  };
}

export interface PronunciationToken {
  word: string;
  matched: boolean;
}

export interface PronunciationResult {
  transcript: string;
  accuracy: number;
  tokens: PronunciationToken[];
}

export function comparePronunciation(target: string, spoken: string): PronunciationResult {
  const targetWords = target
    .replace(/\s*\/\s*/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const spokenSet = spoken
    .trim()
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  let searchFrom = 0;
  let matchedCount = 0;
  const tokens: PronunciationToken[] = targetWords.map((w) => {
    const norm = normalizeWord(w);
    if (!norm) return { word: w, matched: true };
    const foundAt = spokenSet.indexOf(norm, searchFrom);
    if (foundAt !== -1) {
      matchedCount += 1;
      searchFrom = foundAt + 1;
      return { word: w, matched: true };
    }
    const anyAt = spokenSet.indexOf(norm);
    if (anyAt !== -1) {
      matchedCount += 1;
      return { word: w, matched: true };
    }
    return { word: w, matched: false };
  });

  const accuracy =
    targetWords.length === 0 ? 0 : Math.round((matchedCount / targetWords.length) * 100);
  return { transcript: spoken, accuracy, tokens };
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isAudioRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function startSpeechRecognition(
  lang: 'en-US' | 'en-GB',
  callbacks: {
    onInterim?: (transcript: string) => void;
    onResult: (transcript: string) => void;
    onNetworkError?: () => void;
    onError: (message: string) => void;
    onEnd?: () => void;
  }
): () => void {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    callbacks.onNetworkError?.();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += ` ${res[0].transcript}`;
      } else {
        interim += ` ${res[0].transcript}`;
      }
    }
    const combined = (finalTranscript || interim).trim();
    if (callbacks.onInterim && combined) callbacks.onInterim(combined);
  };

  recognition.onerror = (e) => {
    if (e.error === 'network' || e.error === 'service-not-allowed') {
      // Gracefully hand off to Offline MediaRecorder + OS Dictation self-check
      if (callbacks.onNetworkError) {
        callbacks.onNetworkError();
      } else {
        callbacks.onError(
          'Trình duyệt không kết nối được máy chủ Speech cloud — đã chuyển sang chế độ Ghi âm cục bộ.'
        );
      }
    } else if (e.error === 'not-allowed') {
      callbacks.onError('Vui lòng cấp quyền Micro cho trình duyệt để luyện phát âm.');
    } else if (e.error === 'no-speech') {
      callbacks.onError('Chưa thu được giọng nói. Hãy bấm Mic và đọc rõ hơn.');
    } else if (e.error !== 'aborted') {
      callbacks.onError(`Không thể nhận diện giọng nói (${e.error}). Bạn có thể dùng Ghi âm cục bộ.`);
    }
  };

  recognition.onend = () => {
    if (finalTranscript.trim()) {
      callbacks.onResult(finalTranscript.trim());
    }
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    callbacks.onNetworkError?.();
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  };
}

/**
 * 100% Offline Local Audio Recording using MediaRecorder API.
 * Works on Chrome, Safari (Mac/iPad/iOS), Arc, Brave, and embedded webviews with zero cloud dependency.
 */
export async function startOfflineAudioRecording(callbacks: {
  onStop: (audioBlobUrl: string) => void;
  onError: (msg: string) => void;
}): Promise<() => void> {
  if (!isAudioRecorderSupported()) {
    callbacks.onError('Trình duyệt không hỗ trợ ghi âm MediaRecorder.');
    return () => {};
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      callbacks.onStop(url);
    };

    recorder.start();
    return () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };
  } catch {
    callbacks.onError('Không thể mở Micro để ghi âm. Vui lòng kiểm tra quyền Micro trên trình duyệt.');
    return () => {};
  }
}
