import {
  GlossaryItem,
  GrammarExercise,
  GrammarPoint,
  LessonPack,
  ReadingCompletion,
  ReadingMatching,
  ReadingMcq,
  ReadingParagraph,
  ReadingTfng,
  VocabItem,
} from '../types/schema';
import { sanitizePlainText } from './security';

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
          const prompt = asStr(e.prompt || e.question || e.sentence || e.text || e.instruction);
          const sourceSentence = asStr(
            e.sourceSentence || e.originalSentence || e.original || e.baseSentence
          );
          if (!prompt && !sourceSentence) return null;
          const options = asArr(e.options || e.choices).map((c) => asStr(c)).filter(Boolean);
          const rawType = asStr(e.type).toLowerCase();
          let type: GrammarExercise['type'];
          if (
            rawType.includes('rewrite') ||
            rawType.includes('transform') ||
            rawType.includes('paraphrase')
          ) {
            type = 'rewrite';
          } else if (rawType.includes('error') || rawType.includes('correct') || rawType.includes('fix')) {
            type = 'error';
          } else if (rawType === 'fill' || options.length === 0) {
            type = 'fill';
          } else {
            type = 'mcq';
          }

          const answer = resolveAnswer(e.answer ?? e.correctAnswer ?? e.correctIndex, options);
          const acceptedAnswers = asArr(
            e.acceptedAnswers || e.acceptableAnswers || e.alternatives || e.validAnswers
          )
            .map((a) => asStr(a))
            .filter((a) => Boolean(a) && a !== answer);

          const hint = asStr(e.hint || e.keyword || e.keywords || e.cue || e.structureHint);

          let exId = asStr(e.id) || `${pointId}_q${eIdx + 1}`;
          if (seenExIds.has(exId)) {
            exId = `${pointId}_${exId}_${eIdx + 1}`;
          }
          seenExIds.add(exId);
          return {
            id: exId,
            type,
            prompt: prompt || 'Viết lại câu sau theo cấu trúc gợi ý:',
            sourceSentence: sourceSentence || undefined,
            hint: hint || undefined,
            options: options.length > 0 ? options : undefined,
            answer,
            acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : undefined,
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
    if (
      raw.meta !== undefined &&
      (typeof raw.meta !== 'object' || Array.isArray(raw.meta) || raw.meta === null)
    ) {
      throw new Error(
        `Bài học #${idx + 1}: trường "meta" phải là đối tượng JSON ({ title, subspecialty, sourceBook... }).`
      );
    }
    const metaRaw = asObj(raw.meta);

    const title = asStr(metaRaw.title || raw.title || raw.name);
    if (!title) {
      throw new Error(
        `Bài học #${idx + 1} thiếu trường bắt buộc tiêu đề ("meta.title" hoặc "title").`
      );
    }

    // Strict structural type checks for the 3 core skills (legacy listening/writing/speaking keys are ignored gracefully)
    const rawVocab = raw.vocabulary ?? raw.vocab;
    if (rawVocab !== undefined && typeof rawVocab !== 'object') {
      throw new Error(
        `Bài học "${title}": trường "vocabulary" sai kiểu (phải là mảng [...] hoặc đối tượng).`
      );
    }
    if (raw.grammar !== undefined && typeof raw.grammar !== 'object') {
      throw new Error(`Bài học "${title}": trường "grammar" sai kiểu (phải là đối tượng hoặc mảng).`);
    }
    if (raw.reading !== undefined && (typeof raw.reading !== 'object' || Array.isArray(raw.reading))) {
      throw new Error(`Bài học "${title}": trường "reading" sai kiểu (phải là đối tượng { ... }).`);
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
    const reading = normalizeReading(raw.reading);

    const hasAnySkillContent =
      vocabulary.length > 0 || grammar.length > 0 || reading.paragraphs.length > 0;

    if (!hasAnySkillContent) {
      throw new Error(
        `Bài học "${title}" chưa có nội dung hợp lệ ở bất kỳ kỹ năng nào (cần tối thiểu 1 kỹ năng: vocabulary, grammar hoặc reading).`
      );
    }

    if (vocabulary.length === 0) warnings.push(`"${title}": chưa có mục Vocabulary.`);
    if (grammar.length === 0) warnings.push(`"${title}": chưa có mục Grammar.`);
    if (reading.paragraphs.length === 0) warnings.push(`"${title}": chưa có đoạn văn Reading.`);

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
        estimatedMinutes: Number(metaRaw.estimatedMinutes || raw.estimatedMinutes) || 30,
        createdAt: asStr(metaRaw.createdAt || raw.createdAt, new Date().toISOString().slice(0, 10)),
      },
      vocabulary,
      grammar,
      reading,
    };
  });

  return { lessons, warnings };
}
