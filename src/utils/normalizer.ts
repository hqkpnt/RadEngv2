import {
  GlossaryItem,
  GrammarExercise,
  GrammarPoint,
  LessonPack,
  ListeningGapFill,
  ListeningMcq,
  ListeningSentence,
  ReadingCompletion,
  ReadingMatching,
  ReadingMcq,
  ReadingParagraph,
  ReadingTfng,
  ShadowingItem,
  SpeakingPrompt,
  SpeakingStage,
  VocabItem,
  WritingParaphraseTask,
} from '../types/schema';
import { sanitizeMediaUrl, sanitizePlainText } from './security';

type RawObj = Record<string, unknown>;

function asObj(val: unknown): RawObj {
  return val && typeof val === 'object' && !Array.isArray(val) ? (val as RawObj) : {};
}

function asArr(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

function asStr(val: unknown, fallback = ''): string {
  const s = sanitizePlainText(val).trim();
  return s || fallback;
}

export function slugifyKey(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `item_${Date.now()}`
  );
}

function inferSubspecialty(text: string): string {
  const lower = text.toLowerCase();
  if (/(neuro|stroke|mca|thrombectomy|aneurysm|avm|carotid|thần kinh|não)/i.test(lower)) {
    return 'neuro_dsa';
  }
  if (/(onco|tace|tare|hcc|tumor|tumour|chemoembol|ablation|ung bướu|khối u)/i.test(lower)) {
    return 'onco_dsa';
  }
  if (/(peripheral|pad|iliac|femoral|popliteal|angioplasty|stent|ngoại biên|chi dưới)/i.test(lower)) {
    return 'peripheral_dsa';
  }
  if (/(pain|nerve block|vertebroplasty|kyphoplasty|celiac|giảm đau|phong bế)/i.test(lower)) {
    return 'pain_dsa';
  }
  return 'imaging';
}

function resolveAnswer(rawAnswer: unknown, options?: string[]): string {
  if (typeof rawAnswer === 'number' && options && options[rawAnswer] !== undefined) {
    return options[rawAnswer];
  }
  const str = asStr(rawAnswer);
  if (options && options.length > 0 && /^[A-D]$/i.test(str)) {
    const idx = str.toUpperCase().charCodeAt(0) - 65;
    if (options[idx] !== undefined && !options.includes(str)) {
      return options[idx];
    }
  }
  return str;
}

function normalizeVocabulary(rawVocab: unknown): VocabItem[] {
  const rawList = Array.isArray(rawVocab)
    ? rawVocab
    : asArr(asObj(rawVocab).items || asObj(rawVocab).words || asObj(rawVocab).terms);

  return rawList
    .map((entry, idx): VocabItem | null => {
      const o = asObj(entry);
      const term = asStr(o.term || o.word || o.en || o.front);
      if (!term) return null;
      const exObj = asObj(o.example);
      return {
        termKey: asStr(o.termKey) || slugifyKey(term) || `term_${idx + 1}`,
        term,
        ipa: asStr(o.ipa || o.phonetic || o.pronunciation),
        pos: asStr(o.pos || o.partOfSpeech || o.type, 'term'),
        wordRoot: asStr(o.wordRoot || o.etymology || o.root),
        meaningVi: asStr(o.meaningVi || o.meaning || o.vi || o.definitionVi || o.definition),
        noteVi: asStr(o.noteVi || o.clinicalNote || o.academicNote || o.note || o.usage),
        exampleEn: asStr(o.exampleEn || exObj.en || (typeof o.example === 'string' ? o.example : '')),
        exampleVi: asStr(o.exampleVi || exObj.vi || o.translation || o.exampleTranslation),
        audioUrl: sanitizeMediaUrl(o.audioUrl),
      };
    })
    .filter((v): v is VocabItem => v !== null);
}

/**
 * Keeps grammar point names concise and true to English grammar terminology
 * (e.g. "Passive Modal Verbs for Clinical Recommendations & Protocols" -> "Passive Modal Verbs"),
 * removing verbose domain-padding tails and redundant parenthetical translations.
 */
function normalizeGrammarTopic(raw: string, fallback: string): string {
  let clean = raw.trim();
  if (!clean) return fallback;

  // Strip trailing parenthetical Vietnamese explanation when an English core title precedes it
  const withoutParen = clean.replace(/\s*\([^)]{6,}\)\s*$/, '').trim();
  if (withoutParen.length >= 6) clean = withoutParen;

  // Strip verbose context tails like "for Clinical Recommendations...", "in DSA Reports..."
  const trimmedTail = clean
    .replace(
      /\s+(?:for|in|when|used\s+in|used\s+for)\s+(?:clinical|procedural|radiolog\w*|dsa|medical|neuro\w*|imaging|endovascular|diagnostic|interventional|reporting|sequential|academic|case)\b.*$/i,
      ''
    )
    .trim();

  if (trimmedTail.length >= 6) clean = trimmedTail;

  // Remove trailing punctuation left over
  clean = clean.replace(/[:\-–—,;]+$/, '').trim();
  return clean || fallback;
}

function normalizeGrammar(rawGrammar: unknown): GrammarPoint[] {
  const list = Array.isArray(rawGrammar)
    ? rawGrammar
    : rawGrammar && typeof rawGrammar === 'object'
      ? asArr(asObj(rawGrammar).items).length > 0
        ? asArr(asObj(rawGrammar).items)
        : [rawGrammar]
      : [];

  const seenPointIds = new Set<string>();

  return list
    .map((entry, idx): GrammarPoint | null => {
      const o = asObj(entry);
      const rawTopic = asStr(o.topic || o.title || o.name);
      if (!rawTopic && !o.formula && !o.quickExercises && !o.quickPractice) return null;

      let pointId = asStr(o.id) || `gp_${idx + 1}`;
      if (seenPointIds.has(pointId)) {
        pointId = `${pointId}_${idx + 1}`;
      }
      seenPointIds.add(pointId);

      const topic = normalizeGrammarTopic(rawTopic, `Grammar Point ${idx + 1}`);

      const srcRaw = o.sourceSentence || o.sourceExample;
      let sourceEn = '';
      let sourceVi = '';
      if (typeof srcRaw === 'string') {
        sourceEn = asStr(srcRaw);
        sourceVi = asStr(o.sourceSentenceVi || o.sourceTranslation || o.exampleVi);
      } else {
        const sObj = asObj(srcRaw);
        sourceEn = asStr(sObj.en || sObj.text || o.exampleEn);
        sourceVi = asStr(sObj.vi || sObj.translation || o.exampleVi);
      }

      const rawExercises = asArr(
        o.quickExercises || o.quickPractice || o.exercises || o.practice
      );
      const seenExIds = new Set<string>();
      const quickExercises: GrammarExercise[] = rawExercises
        .map((ex, eIdx): GrammarExercise | null => {
          const e = asObj(ex);
          const prompt = asStr(e.prompt || e.question || e.sentence || e.text);
          if (!prompt) return null;
          const options = asArr(e.options || e.choices).map((c) => asStr(c)).filter(Boolean);
          const type: 'mcq' | 'fill' =
            asStr(e.type).toLowerCase() === 'fill' || options.length === 0 ? 'fill' : 'mcq';
          const answer = resolveAnswer(e.answer ?? e.correctAnswer ?? e.correctIndex, options);
          let exId = asStr(e.id) || `${pointId}_q${eIdx + 1}`;
          if (seenExIds.has(exId)) {
            exId = `${pointId}_${exId}_${eIdx + 1}`;
          }
          seenExIds.add(exId);
          return {
            id: exId,
            type,
            prompt,
            options: options.length > 0 ? options : undefined,
            answer,
            explanationVi: asStr(e.explanationVi || e.explanation || e.noteVi || e.note),
          };
        })
        .filter((x): x is GrammarExercise => x !== null);

      return {
        id: pointId,
        topic,
        formula: asStr(o.formula || o.pattern || o.structure),
        explanationVi: asStr(o.explanationVi || o.explanation || o.description),
        sourceSentence: { en: sourceEn, vi: sourceVi },
        quickExercises,
      };
    })
    .filter((g): g is GrammarPoint => g !== null);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function normalizeListening(rawListening: unknown) {
  const o = asObj(rawListening);

  let notesTemplate: string[] | undefined;
  if (typeof o.notesTemplate === 'string' && o.notesTemplate.trim()) {
    notesTemplate = sanitizePlainText(o.notesTemplate)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } else if (Array.isArray(o.notesTemplate)) {
    notesTemplate = o.notesTemplate
      .map((n) => {
        if (typeof n === 'string') return asStr(n);
        const no = asObj(n);
        const label = asStr(no.label || no.heading || no.title);
        const val = asStr(no.text || no.content || no.value || no.prompt);
        return label && val ? `${label}: ${val}` : label || val;
      })
      .filter(Boolean);
  } else if (o.notesTemplate && typeof o.notesTemplate === 'object') {
    const nt = asObj(o.notesTemplate);
    const items = asArr(nt.bullets || nt.items || nt.lines || nt.sections).map((x) =>
      typeof x === 'string' ? asStr(x) : asStr(asObj(x).text || asObj(x).label || asObj(x).title)
    );
    if (items.length > 0) notesTemplate = items.filter(Boolean);
  }

  let transcriptSentences: ListeningSentence[] = [];
  const rawSentences = asArr(o.transcriptSentences || o.sentences || o.dictation);
  if (rawSentences.length > 0) {
    transcriptSentences = rawSentences
      .map((item, idx): ListeningSentence | null => {
        if (typeof item === 'string') {
          return { id: `s_${idx + 1}`, en: asStr(item), vi: '' };
        }
        const so = asObj(item);
        const en = asStr(so.en || so.text || so.sentence);
        if (!en) return null;
        return {
          id: asStr(so.id) || `s_${idx + 1}`,
          en,
          vi: asStr(so.vi || so.translation),
        };
      })
      .filter((s): s is ListeningSentence => s !== null);
  } else if (typeof o.transcript === 'string' && o.transcript.trim()) {
    const viParts =
      typeof o.transcriptVi === 'string' ? splitSentences(sanitizePlainText(o.transcriptVi)) : [];
    transcriptSentences = splitSentences(sanitizePlainText(o.transcript)).map((en, idx) => ({
      id: `s_${idx + 1}`,
      en,
      vi: viParts[idx] || '',
    }));
  }

  const gapFill: ListeningGapFill[] = asArr(o.gapFill || o.gapFills || o.fillInBlanks)
    .map((item, idx): ListeningGapFill | null => {
      const g = asObj(item);
      const sentence = asStr(g.sentence || g.prompt || g.text || g.question);
      const answer = asStr(g.answer || g.blank || g.correctAnswer);
      if (!sentence || !answer) return null;
      return {
        id: asStr(g.id) || `lg_${idx + 1}`,
        sentence,
        answer,
        hint: asStr(g.hint || g.hintVi) || undefined,
      };
    })
    .filter((x): x is ListeningGapFill => x !== null);

  const mcq: ListeningMcq[] = asArr(o.mcq || o.mcqs || o.questions)
    .map((item, idx): ListeningMcq | null => {
      const m = asObj(item);
      const question = asStr(m.question || m.prompt);
      const options = asArr(m.options || m.choices).map((c) => asStr(c)).filter(Boolean);
      if (!question || options.length === 0) return null;
      return {
        id: asStr(m.id) || `lm_${idx + 1}`,
        question,
        options,
        answer: resolveAnswer(m.answer ?? m.correctAnswer ?? m.correctIndex, options),
        explanationVi: asStr(m.explanationVi || m.explanation),
      };
    })
    .filter((x): x is ListeningMcq => x !== null);

  if (transcriptSentences.length === 0 && gapFill.length > 0) {
    transcriptSentences = gapFill.map((g, idx) => ({
      id: `s_${idx + 1}`,
      en: g.sentence.replace(/_{2,}|\[\.\.\.\]/g, g.answer),
      vi: g.hint ? `Gợi ý: ${g.hint}` : '',
    }));
  }

  return {
    title: asStr(o.title, 'Listening Comprehension'),
    audioUrl: sanitizeMediaUrl(o.audioUrl),
    notesTemplate: notesTemplate && notesTemplate.length > 0 ? notesTemplate : undefined,
    transcriptSentences,
    gapFill,
    mcq,
  };
}

function normalizeReading(rawReading: unknown) {
  const o = asObj(rawReading);

  let paragraphs: ReadingParagraph[] = [];
  const rawParas = asArr(o.paragraphs);
  if (rawParas.length > 0) {
    paragraphs = rawParas
      .map((p, idx): ReadingParagraph | null => {
        if (typeof p === 'string') return { id: `p${idx + 1}`, en: asStr(p), vi: '' };
        const po = asObj(p);
        const en = asStr(po.en || po.text || po.content);
        if (!en) return null;
        return {
          id: asStr(po.id) || `p${idx + 1}`,
          en,
          vi: asStr(po.vi || po.translation || po.textVi),
        };
      })
      .filter((p): p is ReadingParagraph => p !== null);
  } else if (typeof o.passage === 'string' && o.passage.trim()) {
    const enParts = sanitizePlainText(o.passage)
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const viParts =
      typeof o.translation === 'string'
        ? sanitizePlainText(o.translation).split(/\n\n+/).map((s) => s.trim())
        : [];
    paragraphs = enParts.map((en, idx) => ({
      id: `p${idx + 1}`,
      en,
      vi: viParts[idx] || '',
    }));
  }

  const glossary: GlossaryItem[] = asArr(o.glossary)
    .map((g, idx): GlossaryItem | null => {
      const go = asObj(g);
      const term = asStr(go.term || go.word);
      if (!term) return null;
      return {
        termKey: asStr(go.termKey) || slugifyKey(term) || `gl_${idx + 1}`,
        term,
        ipa: asStr(go.ipa || go.phonetic),
        wordRoot: asStr(go.wordRoot || go.root),
        meaningVi: asStr(go.meaningVi || go.meaning || go.definition || go.vi),
      };
    })
    .filter((g): g is GlossaryItem => g !== null);

  const mcq: ReadingMcq[] = [];
  const tfng: ReadingTfng[] = [];
  const matching: ReadingMatching[] = [];
  const completion: ReadingCompletion[] = [];

  const qRaw = o.questions;
  const qObj = asObj(qRaw);

  const pushMcq = (item: RawObj, idx: number) => {
    const options = asArr(item.options || item.choices).map((c) => asStr(c)).filter(Boolean);
    const question = asStr(item.question || item.prompt);
    if (!question || options.length === 0) return;
    mcq.push({
      id: asStr(item.id) || `r_mcq_${idx + 1}`,
      question,
      options,
      answer: resolveAnswer(item.answer ?? item.correctAnswer ?? item.correctIndex, options),
      evidenceParagraph: asStr(item.evidenceParagraph || item.paragraphId) || undefined,
      explanationVi: asStr(item.explanationVi || item.explanation) || undefined,
    });
  };

  const pushTfng = (item: RawObj, idx: number) => {
    const statement = asStr(item.statement || item.question || item.prompt);
    if (!statement) return;
    const rawAns = asStr(item.answer ?? item.correctAnswer).toUpperCase();
    const answer: 'TRUE' | 'FALSE' | 'NOT GIVEN' =
      rawAns === 'TRUE' || rawAns === 'YES' || rawAns === 'T'
        ? 'TRUE'
        : rawAns === 'FALSE' || rawAns === 'NO' || rawAns === 'F'
          ? 'FALSE'
          : 'NOT GIVEN';
    tfng.push({
      id: asStr(item.id) || `r_tf_${idx + 1}`,
      statement,
      answer,
      evidenceParagraph: asStr(item.evidenceParagraph || item.paragraphId) || undefined,
      explanationVi: asStr(item.explanationVi || item.explanation) || undefined,
    });
  };

  const pushMatching = (item: RawObj, idx: number) => {
    const options = asArr(item.options || item.choices).map((c) => asStr(c)).filter(Boolean);
    const prompt = asStr(item.prompt || item.question || item.item);
    if (!prompt || options.length === 0) return;
    matching.push({
      id: asStr(item.id) || `r_m_${idx + 1}`,
      prompt,
      options,
      answer: resolveAnswer(item.answer ?? item.correctAnswer ?? item.correctIndex, options),
      evidenceParagraph: asStr(item.evidenceParagraph || item.paragraphId) || undefined,
      explanationVi: asStr(item.explanationVi || item.explanation) || undefined,
    });
  };

  const pushCompletion = (item: RawObj, idx: number) => {
    const prompt = asStr(item.prompt || item.question || item.sentence);
    const answer = asStr(item.answer ?? item.correctAnswer);
    if (!prompt || !answer) return;
    completion.push({
      id: asStr(item.id) || `r_c_${idx + 1}`,
      prompt,
      answer,
      evidenceParagraph: asStr(item.evidenceParagraph || item.paragraphId) || undefined,
      explanationVi: asStr(item.explanationVi || item.explanation) || undefined,
    });
  };

  if (Array.isArray(qRaw)) {
    qRaw.forEach((item, idx) => {
      const qo = asObj(item);
      const t = asStr(qo.type).toLowerCase();
      if (t.includes('tf') || t.includes('true') || t.includes('ynng')) pushTfng(qo, idx);
      else if (t.includes('match')) pushMatching(qo, idx);
      else if (t.includes('complet') || t.includes('fill') || t.includes('short') || t.includes('summary'))
        pushCompletion(qo, idx);
      else pushMcq(qo, idx);
    });
  } else {
    asArr(qObj.mcq || o.mcq).forEach((x, i) => pushMcq(asObj(x), i));
    asArr(qObj.tfng || o.tfng || qObj.trueFalseNotGiven).forEach((x, i) => pushTfng(asObj(x), i));
    asArr(qObj.matching || o.matching).forEach((x, i) => pushMatching(asObj(x), i));
    asArr(qObj.completion || o.completion || qObj.summaryCompletion || qObj.shortAnswer).forEach(
      (x, i) => pushCompletion(asObj(x), i)
    );
  }

  return {
    title: asStr(o.title, 'Reading Passage'),
    paragraphs,
    glossary,
    questions: { mcq, tfng, matching, completion },
  };
}

function normalizeWriting(rawWriting: unknown) {
  const o = asObj(rawWriting);
  const rawTasks = asArr(o.paraphraseTasks || o.sentenceTasks || o.translations || o.sentences);
  const paraphraseTasks: WritingParaphraseTask[] = rawTasks
    .map((t, idx): WritingParaphraseTask | null => {
      const to = asObj(t);
      const prompt = asStr(to.prompt || to.source || to.original || to.vi || to.question);
      if (!prompt) return null;
      const typeStr = asStr(to.type).toLowerCase();
      const keywords = asArr(to.targetKeywords || to.keywords || to.hints)
        .map((k) => asStr(k))
        .filter(Boolean);
      return {
        id: asStr(to.id) || `w_${idx + 1}`,
        type: typeStr === 'paraphrase' ? 'paraphrase' : 'translation',
        prompt,
        targetKeywords: keywords,
        modelAnswer: asStr(to.modelAnswer || to.answer || to.target || to.sample || to.en),
        noteVi: asStr(to.noteVi || to.note || to.explanation || to.explanationVi),
      };
    })
    .filter((x): x is WritingParaphraseTask => x !== null);

  const essayRaw = asObj(o.essayTask || o.essay || o.task2 || o.reportTask || o.writingTask);
  const modelsRaw = asObj(essayRaw.models || essayRaw.modelAnswers || essayRaw.samples || o.models);

  return {
    paraphraseTasks,
    essayTask: {
      prompt: asStr(
        essayRaw.prompt || essayRaw.topic || essayRaw.question || o.essayPrompt,
        'Viết tóm tắt hình ảnh hoặc tường trình thủ thuật theo chủ đề bài học.'
      ),
      minWords: Number(essayRaw.minWords) || 150,
      recommendedMinutes: Number(essayRaw.recommendedMinutes || essayRaw.minutes) || 20,
      models: {
        band7: asStr(modelsRaw.band7 || modelsRaw['7'] || essayRaw.band7),
        band8: asStr(modelsRaw.band8 || modelsRaw['8'] || essayRaw.band8),
        band9: asStr(modelsRaw.band9 || modelsRaw['9'] || essayRaw.band9),
      },
    },
  };
}

function normalizePrompts(raw: unknown): SpeakingPrompt[] {
  return asArr(raw)
    .map((p): SpeakingPrompt | null => {
      if (typeof p === 'string') return { question: asStr(p), sampleAnswer: '' };
      const po = asObj(p);
      const question = asStr(po.question || po.prompt || po.q);
      if (!question) return null;
      return {
        question,
        sampleAnswer: asStr(po.sampleAnswer || po.sample || po.answer || po.modelAnswer),
        hintVi: asStr(po.hintVi || po.hint || po.vi) || undefined,
      };
    })
    .filter((x): x is SpeakingPrompt => x !== null);
}

function normalizeSpeaking(rawSpeaking: unknown) {
  const o = asObj(rawSpeaking);
  const stages: SpeakingStage[] = [];

  if (Array.isArray(o.stages) && o.stages.length > 0) {
    o.stages.forEach((st, idx) => {
      const so = asObj(st);
      const stageNum = (Number(so.stage) || idx + 1) as 1 | 2 | 3;
      stages.push({
        stage: stageNum > 3 ? 3 : stageNum < 1 ? 1 : stageNum,
        title: asStr(so.title, `Stage ${stageNum}`),
        prepSeconds: Number(so.prepSeconds) || (stageNum === 2 ? 60 : undefined),
        speakSeconds: Number(so.speakSeconds) || (stageNum === 2 ? 120 : undefined),
        cueCard: asStr(so.cueCard || so.topic) || undefined,
        bulletPoints: asArr(so.bulletPoints || so.bullets || so.points)
          .map((b) => asStr(b))
          .filter(Boolean),
        sampleAnswer: asStr(so.sampleAnswer || so.modelAnswer) || undefined,
        prompts: normalizePrompts(so.prompts || so.questions),
      });
    });
  } else {
    const stageKeys: Array<{ key: string; num: 1 | 2 | 3; defaultTitle: string }> = [
      { key: 'stage1', num: 1, defaultTitle: 'Stage 1 — Rapid Clinical Check' },
      { key: 'stage2', num: 2, defaultTitle: 'Stage 2 — Case Presentation Cue Card' },
      { key: 'stage3', num: 3, defaultTitle: 'Stage 3 — Interventional Discussion' },
    ];
    stageKeys.forEach(({ key, num, defaultTitle }) => {
      const rawSt = o[key];
      if (!rawSt) return;
      if (Array.isArray(rawSt)) {
        stages.push({
          stage: num,
          title: defaultTitle,
          prompts: normalizePrompts(rawSt),
        });
      } else {
        const so = asObj(rawSt);
        stages.push({
          stage: num,
          title: asStr(so.title, defaultTitle),
          prepSeconds: Number(so.prepSeconds) || (num === 2 ? 60 : undefined),
          speakSeconds: Number(so.speakSeconds) || (num === 2 ? 120 : undefined),
          cueCard: asStr(so.cueCard || so.topic || so.prompt) || undefined,
          bulletPoints: asArr(so.bulletPoints || so.bullets || so.points)
            .map((b) => asStr(b))
            .filter(Boolean),
          sampleAnswer: asStr(so.sampleAnswer || so.modelAnswer) || undefined,
          prompts: normalizePrompts(so.prompts || so.questions),
        });
      }
    });
  }

  const normalizeShadowList = (arr: unknown, prefix: string): ShadowingItem[] =>
    asArr(arr)
      .map((item, idx): ShadowingItem | null => {
        if (typeof item === 'string') {
          return { id: `${prefix}_${idx + 1}`, en: asStr(item), vi: '' };
        }
        const so = asObj(item);
        const en = asStr(so.en || so.text || so.sentence);
        if (!en) return null;
        return {
          id: asStr(so.id) || `${prefix}_${idx + 1}`,
          en,
          vi: asStr(so.vi || so.translation),
        };
      })
      .filter((x): x is ShadowingItem => x !== null);

  let simple: ShadowingItem[] = [];
  let complex: ShadowingItem[] = [];
  if (Array.isArray(o.shadowing)) {
    const all = normalizeShadowList(o.shadowing, 'sh');
    const mid = Math.ceil(all.length / 2);
    simple = all.slice(0, mid);
    complex = all.slice(mid);
  } else {
    const shObj = asObj(o.shadowing);
    simple = normalizeShadowList(shObj.simple || shObj.basic || shObj.easy, 'sh_s');
    complex = normalizeShadowList(shObj.complex || shObj.advanced || shObj.hard, 'sh_c');
  }

  return {
    stages,
    shadowing: { simple, complex },
  };
}

export interface NormalizeResult {
  lessons: LessonPack[];
  warnings: string[];
}

export function normalizeLessonInput(
  input: unknown,
  overrides?: { subspecialty?: string; sourceBook?: string }
): NormalizeResult {
  const warnings: string[] = [];

  if (input === null || input === undefined || typeof input !== 'object') {
    throw new Error(
      'Cấu trúc JSON không hợp lệ: gốc tệp phải là một đối tượng bài học ({ ... }) hoặc mảng bài học ([ ... ]).'
    );
  }

  let items: unknown[] = [];
  if (Array.isArray(input)) {
    items = input;
  } else {
    const obj = asObj(input);
    if ('lessons' in obj) {
      if (!Array.isArray(obj.lessons)) {
        throw new Error('Trường "lessons" phải là một mảng JSON ([ ... ]).');
      }
      items = obj.lessons;
    } else if (Object.keys(obj).length > 0) {
      items = [obj];
    }
  }

  if (items.length === 0) {
    throw new Error('Tệp JSON không chứa bài học nào (mảng rỗng hoặc đối tượng trống).');
  }

  const lessons: LessonPack[] = items.map((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Bài học #${idx + 1} không phải là đối tượng JSON hợp lệ ({ ... }).`);
    }

    const raw = asObj(item);
    if (raw.meta !== undefined && (typeof raw.meta !== 'object' || Array.isArray(raw.meta) || raw.meta === null)) {
      throw new Error(`Bài học #${idx + 1}: trường "meta" phải là đối tượng JSON ({ title, subspecialty, sourceBook... }).`);
    }
    const metaRaw = asObj(raw.meta);

    const title = asStr(metaRaw.title || raw.title || raw.name);
    if (!title) {
      throw new Error(
        `Bài học #${idx + 1} thiếu trường bắt buộc tiêu đề ("meta.title" hoặc "title").`
      );
    }

    // Strict structural type checks so malformed skills never fail silently
    const rawVocab = raw.vocabulary ?? raw.vocab;
    if (rawVocab !== undefined && typeof rawVocab !== 'object') {
      throw new Error(`Bài học "${title}": trường "vocabulary" sai kiểu (phải là mảng [...] hoặc đối tượng).`);
    }
    if (raw.grammar !== undefined && typeof raw.grammar !== 'object') {
      throw new Error(`Bài học "${title}": trường "grammar" sai kiểu (phải là đối tượng hoặc mảng).`);
    }
    if (raw.listening !== undefined && (typeof raw.listening !== 'object' || Array.isArray(raw.listening))) {
      throw new Error(`Bài học "${title}": trường "listening" sai kiểu (phải là đối tượng { ... }).`);
    }
    if (raw.reading !== undefined && (typeof raw.reading !== 'object' || Array.isArray(raw.reading))) {
      throw new Error(`Bài học "${title}": trường "reading" sai kiểu (phải là đối tượng { ... }).`);
    }
    if (raw.writing !== undefined && (typeof raw.writing !== 'object' || Array.isArray(raw.writing))) {
      throw new Error(`Bài học "${title}": trường "writing" sai kiểu (phải là đối tượng { ... }).`);
    }
    if (raw.speaking !== undefined && (typeof raw.speaking !== 'object' || Array.isArray(raw.speaking))) {
      throw new Error(`Bài học "${title}": trường "speaking" sai kiểu (phải là đối tượng { ... }).`);
    }

    const titleVi = asStr(metaRaw.titleVi || raw.titleVi || raw.subtitle);
    const sourceBook =
      (overrides?.sourceBook ? sanitizePlainText(overrides.sourceBook).trim() : '') ||
      asStr(metaRaw.sourceBook || raw.sourceBook || metaRaw.book || raw.book || raw.source) ||
      'Tài liệu tự nạp';

    const rawSub = asStr(metaRaw.subspecialty || raw.subspecialty || metaRaw.specialty);
    const subspecialty =
      overrides?.subspecialty || rawSub || inferSubspecialty(`${title} ${titleVi} ${sourceBook}`);

    const id = asStr(raw.id || metaRaw.id) || `rad-${slugifyKey(title)}`;
    const vocabulary = normalizeVocabulary(rawVocab);
    const grammar = normalizeGrammar(raw.grammar);
    const listening = normalizeListening(raw.listening);
    const reading = normalizeReading(raw.reading);
    const writing = normalizeWriting(raw.writing);
    const speaking = normalizeSpeaking(raw.speaking);

    const hasAnySkillContent =
      vocabulary.length > 0 ||
      grammar.length > 0 ||
      listening.transcriptSentences.length > 0 ||
      listening.gapFill.length > 0 ||
      listening.mcq.length > 0 ||
      reading.paragraphs.length > 0 ||
      writing.paraphraseTasks.length > 0 ||
      speaking.stages.length > 0 ||
      speaking.shadowing.simple.length > 0 ||
      speaking.shadowing.complex.length > 0;

    if (!hasAnySkillContent) {
      throw new Error(
        `Bài học "${title}" chưa có nội dung hợp lệ ở bất kỳ kỹ năng nào (cần tối thiểu 1 kỹ năng: vocabulary, grammar, listening, reading, writing hoặc speaking).`
      );
    }

    if (vocabulary.length === 0) warnings.push(`"${title}": chưa có mục Vocabulary.`);
    if (grammar.length === 0) warnings.push(`"${title}": chưa có mục Grammar.`);
    if (listening.transcriptSentences.length === 0) {
      warnings.push(`"${title}": chưa có nội dung Listening (transcript/gapFill).`);
    }
    if (reading.paragraphs.length === 0) warnings.push(`"${title}": chưa có đoạn văn Reading.`);
    if (writing.paraphraseTasks.length === 0) {
      warnings.push(`"${title}": chưa có câu luyện Writing (paraphraseTasks/sentenceTasks).`);
    }
    if (speaking.stages.length === 0 && speaking.shadowing.simple.length === 0) {
      warnings.push(`"${title}": chưa có nội dung Speaking (stages/shadowing).`);
    }

    return {
      schemaVersion: 2,
      id,
      builtIn: Boolean(raw.builtIn),
      meta: {
        title,
        titleVi,
        level: asStr(metaRaw.level || raw.level || raw.cefr, 'C1'),
        subspecialty,
        sourceBook,
        tags: asArr(metaRaw.tags || raw.tags)
          .map((t) => asStr(t))
          .filter(Boolean),
        estimatedMinutes: Number(metaRaw.estimatedMinutes || raw.estimatedMinutes) || 40,
        createdAt: asStr(metaRaw.createdAt || raw.createdAt, new Date().toISOString().slice(0, 10)),
      },
      vocabulary,
      grammar,
      listening,
      reading,
      writing,
      speaking,
    };
  });

  return { lessons, warnings };
}
