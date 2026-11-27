import { GrammarExercise } from '../types/schema';

const CONTRACTION_MAP: Array<[RegExp, string]> = [
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bhasn't\b/g, 'has not'],
  [/\bhaven't\b/g, 'have not'],
  [/\bhadn't\b/g, 'had not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bwouldn't\b/g, 'would not'],
  [/\bmustn't\b/g, 'must not'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
];

const MEDICAL_SPELLING_MAP: Array<[RegExp, string]> = [
  [/\bhaemorrhag/g, 'hemorrhag'],
  [/\bhaemostas/g, 'hemostas'],
  [/\bischaem/g, 'ischem'],
  [/\btumour/g, 'tumor'],
  [/\bembolisation\b/g, 'embolization'],
  [/\brecanalisation\b/g, 'recanalization'],
  [/\bcatheterisation\b/g, 'catheterization'],
  [/\blocalisation\b/g, 'localization'],
  [/\bvisualisation\b/g, 'visualization'],
  [/\bminimise/g, 'minimize'],
  [/\bmaximise/g, 'maximize'],
  [/\bstabilise/g, 'stabilize'],
];

const OPTIONAL_FILLER_WORDS = new Set([
  'a',
  'an',
  'the',
  'that',
  'which',
  'then',
  'by',
  'operator',
  'physicians',
  'doctors',
  'team',
  'clinicians',
]);

export function normalizeGrammarSentence(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/[—–]/g, ' ');

  for (const [re, rep] of CONTRACTION_MAP) {
    s = s.replace(re, rep);
  }
  for (const [re, rep] of MEDICAL_SPELLING_MAP) {
    s = s.replace(re, rep);
  }

  return s
    .replace(/[.,!?;:()[\]"/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreTokens(normalizedSentence: string): string[] {
  return normalizedSentence
    .split(' ')
    .filter((w) => w.length > 0 && !OPTIONAL_FILLER_WORDS.has(w));
}

function tokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const tok of b) {
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  let matched = 0;
  for (const tok of a) {
    const c = counts.get(tok) || 0;
    if (c > 0) {
      matched += 1;
      counts.set(tok, c - 1);
    }
  }
  return (2 * matched) / (a.length + b.length);
}

export interface GrammarEvalResult {
  isCorrect: boolean;
  matchKind: 'exact' | 'equivalent' | 'wrong';
}

/**
 * Evaluates MCQ, Fill-in-the-blank, Error Correction, and Sentence Rewriting answers.
 * For Sentence Rewriting, flexibly accepts exact standard answers, listed acceptedAnswers,
 * and grammatically equivalent paraphrases (while rejecting un-rewritten copies of sourceSentence).
 */
export function evaluateGrammarAnswer(
  ex: GrammarExercise,
  userInput: string
): GrammarEvalResult {
  const userNorm = normalizeGrammarSentence(userInput || '');
  if (!userNorm) {
    return { isCorrect: false, matchKind: 'wrong' };
  }

  const references = [ex.answer, ...(ex.acceptedAnswers || [])]
    .map((r) => normalizeGrammarSentence(r))
    .filter(Boolean);

  // 1. Exact normalized match against primary answer or any listed equivalent answer
  if (references.includes(userNorm)) {
    return { isCorrect: true, matchKind: 'exact' };
  }

  if (ex.type === 'mcq') {
    return { isCorrect: false, matchKind: 'wrong' };
  }

  // 2. For error correction / fill-in: accept minor article/filler equivalence when very close
  if (ex.type === 'fill' || ex.type === 'error') {
    const userCore = extractCoreTokens(userNorm);
    for (const ref of references) {
      const refCore = extractCoreTokens(ref);
      if (userCore.length > 0 && userCore.join(' ') === refCore.join(' ')) {
        return { isCorrect: true, matchKind: 'equivalent' };
      }
    }
    return { isCorrect: false, matchKind: 'wrong' };
  }

  // 3. For Sentence Rewriting: reject verbatim copy of original source sentence
  if (ex.sourceSentence) {
    const sourceNorm = normalizeGrammarSentence(ex.sourceSentence);
    if (sourceNorm && userNorm === sourceNorm) {
      return { isCorrect: false, matchKind: 'wrong' };
    }
  }

  const userWords = userNorm.split(' ');
  const userCore = extractCoreTokens(userNorm);

  for (const ref of references) {
    const refWords = ref.split(' ');
    const refCore = extractCoreTokens(ref);

    // Identical core words (e.g. minor article/comma/"that"/optional agent differences)
    if (userCore.length >= 3 && userCore.join(' ') === refCore.join(' ')) {
      return { isCorrect: true, matchKind: 'equivalent' };
    }

    // High lexical overlap + comparable sentence length (accepts valid word-order equivalents)
    const lengthRatio = userWords.length / Math.max(1, refWords.length);
    if (lengthRatio >= 0.72 && lengthRatio <= 1.35) {
      const coreF1 = tokenOverlapScore(userCore, refCore);
      const fullF1 = tokenOverlapScore(userWords, refWords);
      if (coreF1 >= 0.85 && fullF1 >= 0.78) {
        return { isCorrect: true, matchKind: 'equivalent' };
      }
    }
  }

  return { isCorrect: false, matchKind: 'wrong' };
}
