import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Languages,
  Layers,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlossaryItem, LessonPack } from '../../types/schema';
import { normalizeWord, speakText } from '../../utils/speech';

interface ReadingTabProps {
  lesson: LessonPack;
  timedMode: boolean;
}

const FAST_EASE = [0.22, 1, 0.36, 1] as const;

export const ReadingTab: React.FC<ReadingTabProps> = ({ lesson, timedMode }) => {
  const {
    prefs,
    state,
    addCardToSrs,
    addLessonVocab,
    toggleMastered,
    markSkillComplete,
    showToast,
  } = useApp();
  const { reading } = lesson;

  const [showAllVi, setShowAllVi] = useState(false);
  const [openViParas, setOpenViParas] = useState<Record<string, boolean>>({});
  const [glossaryListOpen, setGlossaryListOpen] = useState(false);
  const [activeGlossary, setActiveGlossary] = useState<GlossaryItem | null>(null);
  const [highlightPara, setHighlightPara] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);

  useEffect(() => {
    setShowAllVi(false);
    setOpenViParas({});
    setGlossaryListOpen(false);
    setActiveGlossary(null);
    setHighlightPara(null);
    setAnswers({});
    setChecked(false);
    setSecondsLeft(600);
  }, [lesson.id]);

  useEffect(() => {
    if (!timedMode || checked) return;
    if (secondsLeft <= 0) {
      setChecked(true);
      return;
    }
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [timedMode, checked, secondsLeft]);

  const findContextForTerm = (term: string): { exampleEn: string; exampleVi: string } => {
    const lower = term.toLowerCase();
    for (const para of reading.paragraphs) {
      if (para.en.toLowerCase().includes(lower)) {
        const sentences = para.en.split(/(?<=[.!?])\s+/);
        const matchedSentence =
          sentences.find((s) => s.toLowerCase().includes(lower)) || para.en;
        return { exampleEn: matchedSentence.trim(), exampleVi: para.vi || '' };
      }
    }
    return {
      exampleEn: reading.paragraphs[0]?.en || '',
      exampleVi: reading.paragraphs[0]?.vi || '',
    };
  };

  const renderParagraphWithGlossary = (text: string) => {
    if (reading.glossary.length === 0) return text;
    const escaped = reading.glossary
      .map((g) => g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      const match = reading.glossary.find((g) => g.term.toLowerCase() === part.toLowerCase());
      if (!match) return <React.Fragment key={idx}>{part}</React.Fragment>;
      return (
        <span
          key={idx}
          className="glossary-word"
          onClick={() => setActiveGlossary(match)}
          title={`Tra Glossary: ${match.meaningVi}`}
        >
          {part}
        </span>
      );
    });
  };

  const { mcq, tfng, matching, completion } = reading.questions;
  const totalQ = mcq.length + tfng.length + matching.length + completion.length;

  const handleCheckAll = () => {
    setChecked(true);
    let correct = 0;
    mcq.forEach((q) => {
      if (answers[q.id] === q.answer) correct += 1;
    });
    tfng.forEach((q) => {
      if (answers[q.id] === q.answer) correct += 1;
    });
    matching.forEach((q) => {
      if (answers[q.id] === q.answer) correct += 1;
    });
    completion.forEach((q) => {
      if (normalizeWord(answers[q.id] || '') === normalizeWord(q.answer)) correct += 1;
    });
    const ratio = totalQ === 0 ? 1 : correct / totalQ;
    const stars = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : 1;
    markSkillComplete(lesson.id, 'reading', 25, stars);
    showToast(`Kết quả Reading: ${correct}/${totalQ} câu đúng (${stars}★ · +25 XP)`);
  };

  const jumpToEvidenceParagraph = (paraId?: string) => {
    if (!paraId) return;
    setHighlightPara(paraId);
    const el = document.getElementById(`reading-para-${lesson.id}-${paraId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="reading-split-ielts">
      {/* Left Pane: Independent-Scroll Bilingual Passage & Glossary */}
      <section className="card reading-pane-scroll stack-lg" aria-label="Bài đọc hiểu">
        <div className="flex-between flex-wrap">
          <div>
            <span className="badge badge-accent">Reading Passage</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '1.22rem', lineHeight: 1.35 }}>
              {reading.title}
            </h2>
          </div>
          <button
            className={`btn btn-sm ${showAllVi ? 'btn-primary' : 'btn-soft'}`}
            onClick={() => setShowAllVi((v) => !v)}
          >
            <Languages size={14} /> {showAllVi ? 'Đang bật Song ngữ' : 'Song ngữ toàn bài'}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {activeGlossary && (
            <motion.div
              key={activeGlossary.termKey}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: FAST_EASE }}
              className="soft-tint stack-sm"
              style={{ borderLeft: '3px solid var(--accent)' }}
            >
              <div className="flex-between">
                <div>
                  <strong style={{ color: 'var(--accent)', fontSize: '1.02rem' }}>
                    {activeGlossary.term}
                  </strong>{' '}
                  {activeGlossary.ipa && (
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {activeGlossary.ipa}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => setActiveGlossary(null)}
                  aria-label="Đóng glossary"
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{activeGlossary.meaningVi}</div>
              {activeGlossary.wordRoot && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <strong>Gốc từ:</strong> {activeGlossary.wordRoot}
                </div>
              )}
              <div className="flex-row flex-wrap" style={{ paddingTop: 2 }}>
                <button
                  className="btn btn-sm btn-soft"
                  onClick={() =>
                    speakText(activeGlossary.term, prefs.ttsRate, prefs.ttsVoice, {
                      voiceName: prefs.ttsVoiceName,
                    })
                  }
                >
                  <Volume2 size={13} /> Nghe
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  title="Lưu thuật ngữ kèm câu ngữ cảnh trong bài đọc vào Flashcard bài học & SRS"
                  onClick={() => {
                    const ctx = findContextForTerm(activeGlossary.term);
                    addLessonVocab(
                      lesson.id,
                      {
                        termKey: activeGlossary.termKey,
                        term: activeGlossary.term,
                        ipa: activeGlossary.ipa,
                        pos: 'glossary',
                        wordRoot: activeGlossary.wordRoot,
                        meaningVi: activeGlossary.meaningVi,
                        noteVi: `Trích từ bài đọc: ${reading.title}`,
                        exampleEn: ctx.exampleEn,
                        exampleVi: ctx.exampleVi,
                      },
                      true
                    );
                  }}
                >
                  <BookmarkPlus size={13} /> Lưu Flashcard &amp; SRS
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    addCardToSrs({
                      front: activeGlossary.term,
                      meaning: activeGlossary.meaningVi,
                      ipa: activeGlossary.ipa,
                      wordRoot: activeGlossary.wordRoot,
                      termKey: activeGlossary.termKey,
                      source: 'lesson',
                      lessonId: lesson.id,
                    })
                  }
                >
                  <Layers size={13} /> + SRS
                </button>
                <button
                  className={`btn btn-sm ${state.masteredBank[activeGlossary.termKey] ? 'btn-success' : ''}`}
                  onClick={() =>
                    toggleMastered(lesson, {
                      termKey: activeGlossary.termKey,
                      term: activeGlossary.term,
                      ipa: activeGlossary.ipa,
                      pos: 'glossary',
                      wordRoot: activeGlossary.wordRoot,
                      meaningVi: activeGlossary.meaningVi,
                      noteVi: '',
                      exampleEn: '',
                      exampleVi: '',
                    })
                  }
                >
                  <Award size={13} />{' '}
                  {state.masteredBank[activeGlossary.termKey] ? 'Đã thuộc ✓' : 'Đã thuộc'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="stack-lg">
          {reading.paragraphs.map((p, idx) => {
            const viVisible = showAllVi || Boolean(openViParas[p.id]);
            const isEvidence = highlightPara === p.id;
            return (
              <div
                key={p.id}
                id={`reading-para-${lesson.id}-${p.id}`}
                className={`stack-sm ${isEvidence ? 'evidence-highlight' : ''}`}
                style={{ padding: '6px 10px' }}
              >
                <div className="flex-between">
                  <span className="badge mono" style={{ fontSize: '0.72rem' }}>
                    Đoạn {idx + 1} · {p.id}
                  </span>
                  {p.vi && (
                    <button
                      className="btn btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.76rem' }}
                      onClick={() =>
                        setOpenViParas((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                      }
                    >
                      {viVisible ? 'Ẩn dịch' : 'Dịch đoạn'}
                    </button>
                  )}
                </div>
                <p className="prose-measure" style={{ margin: 0 }}>
                  {renderParagraphWithGlossary(p.en)}
                </p>
                <AnimatePresence initial={false}>
                  {viVisible && p.vi && (
                    <motion.p
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.16, ease: FAST_EASE }}
                      className="prose-explanation"
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.92rem',
                        color: 'var(--text-secondary)',
                        borderLeft: '2px solid var(--border-strong)',
                        paddingLeft: 12,
                      }}
                    >
                      {p.vi}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Progressive Disclosure for Glossary Chips */}
        {reading.glossary.length > 0 && (
          <div style={{ paddingTop: 4 }}>
            <button
              type="button"
              className="disclosure-trigger"
              aria-expanded={glossaryListOpen}
              onClick={() => setGlossaryListOpen((v) => !v)}
            >
              <ChevronDown
                size={15}
                style={{
                  transform: glossaryListOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease-out',
                }}
              />
              <span>Danh sách Glossary trong bài ({reading.glossary.length} thuật ngữ)</span>
            </button>
            <AnimatePresence initial={false}>
              {glossaryListOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: FAST_EASE }}
                  className="chip-list"
                  style={{ marginTop: 10 }}
                >
                  {reading.glossary.map((g) => (
                    <button
                      key={g.termKey}
                      className={`chip ${activeGlossary?.termKey === g.termKey ? 'active' : ''}`}
                      onClick={() => setActiveGlossary(g)}
                    >
                      {g.term}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Right Pane: Independent-Scroll 4 Question Types */}
      <section className="card reading-pane-scroll stack-lg" aria-label="Câu hỏi đọc hiểu">
        <div className="flex-between flex-wrap">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bài tập Đọc hiểu ({totalQ} câu)</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              4 dạng câu hỏi IELTS · Cuộn độc lập với bài đọc
            </div>
          </div>
          <div className="flex-row">
            {timedMode && (
              <span className="badge badge-accent mono">
                <Clock size={13} /> {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </span>
            )}
            {checked && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setAnswers({});
                  setChecked(false);
                  setHighlightPara(null);
                }}
              >
                <RotateCcw size={14} /> Làm lại
              </button>
            )}
          </div>
        </div>

        {mcq.length > 0 && (
          <div className="stack-md">
            <strong style={{ fontSize: '0.86rem', letterSpacing: '0.02em', color: 'var(--accent)' }}>
              1. Multiple Choice ({mcq.length} câu)
            </strong>
            {mcq.map((q, i) => (
              <div key={q.id} className="exercise-block stack-sm">
                <div className="prose-explanation" style={{ fontWeight: 600 }}>
                  {i + 1}. {q.question}
                </div>
                <div className="stack-sm">
                  {q.options.map((opt) => {
                    let cls = 'quiz-option';
                    if (checked) {
                      if (opt === q.answer) cls += ' correct';
                      else if (answers[q.id] === opt) cls += ' wrong';
                    } else if (answers[q.id] === opt) {
                      cls += ' selected';
                    }
                    return (
                      <button
                        key={opt}
                        className={cls}
                        disabled={checked}
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                      >
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {checked && (
                  <div className="flex-between flex-wrap" style={{ fontSize: '0.84rem', paddingTop: 4 }}>
                    <span className="prose-explanation" style={{ color: 'var(--text-secondary)' }}>
                      {q.explanationVi}
                    </span>
                    {q.evidenceParagraph && (
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => jumpToEvidenceParagraph(q.evidenceParagraph)}
                      >
                        Bằng chứng ({q.evidenceParagraph})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tfng.length > 0 && (
          <div className="stack-md">
            <strong style={{ fontSize: '0.86rem', letterSpacing: '0.02em', color: 'var(--accent)' }}>
              2. True / False / Not Given ({tfng.length} câu)
            </strong>
            {tfng.map((q, i) => (
              <div key={q.id} className="exercise-block stack-sm">
                <div className="prose-explanation" style={{ fontWeight: 600 }}>
                  {i + 1}. {q.statement}
                </div>
                <div className="grid-3" style={{ gap: 8 }}>
                  {(['TRUE', 'FALSE', 'NOT GIVEN'] as const).map((opt) => {
                    let cls = 'quiz-option';
                    if (checked) {
                      if (opt === q.answer) cls += ' correct';
                      else if (answers[q.id] === opt) cls += ' wrong';
                    } else if (answers[q.id] === opt) {
                      cls += ' selected';
                    }
                    return (
                      <button
                        key={opt}
                        className={cls}
                        style={{ justifyContent: 'center', fontSize: '0.82rem' }}
                        disabled={checked}
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {checked && (
                  <div className="flex-between flex-wrap" style={{ fontSize: '0.84rem', paddingTop: 4 }}>
                    <span className="prose-explanation" style={{ color: 'var(--text-secondary)' }}>
                      {q.explanationVi}
                    </span>
                    {q.evidenceParagraph && (
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => jumpToEvidenceParagraph(q.evidenceParagraph)}
                      >
                        Bằng chứng ({q.evidenceParagraph})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {matching.length > 0 && (
          <div className="stack-md">
            <strong style={{ fontSize: '0.86rem', letterSpacing: '0.02em', color: 'var(--accent)' }}>
              3. Matching ({matching.length} câu)
            </strong>
            {matching.map((q, i) => (
              <div key={q.id} className="exercise-block stack-sm">
                <div className="prose-explanation" style={{ fontWeight: 600 }}>
                  {i + 1}. {q.prompt}
                </div>
                <select
                  className="select"
                  disabled={checked}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                >
                  <option value="">-- Chọn đáp án ghép nối --</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {checked && (
                  <div className="flex-between flex-wrap" style={{ fontSize: '0.84rem', paddingTop: 4 }}>
                    <div className="stack-sm" style={{ gap: 2 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: answers[q.id] === q.answer ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {answers[q.id] === q.answer ? '✓ Chính xác!' : `✗ Đáp án đúng: ${q.answer}`}
                      </span>
                      {q.explanationVi && (
                        <span className="prose-explanation" style={{ color: 'var(--text-secondary)' }}>
                          {q.explanationVi}
                        </span>
                      )}
                    </div>
                    {q.evidenceParagraph && (
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => jumpToEvidenceParagraph(q.evidenceParagraph)}
                      >
                        Bằng chứng ({q.evidenceParagraph})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {completion.length > 0 && (
          <div className="stack-md">
            <strong style={{ fontSize: '0.86rem', letterSpacing: '0.02em', color: 'var(--accent)' }}>
              4. Summary Completion / Short Answer ({completion.length} câu)
            </strong>
            {completion.map((q, i) => {
              const ok = normalizeWord(answers[q.id] || '') === normalizeWord(q.answer);
              return (
                <div key={q.id} className="exercise-block stack-sm">
                  <div className="prose-explanation" style={{ fontWeight: 600 }}>
                    {i + 1}. {q.prompt}
                  </div>
                  <input
                    className="input"
                    disabled={checked}
                    placeholder="Điền từ lấy từ bài đọc..."
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  />
                  {checked && (
                    <div className="flex-between flex-wrap" style={{ fontSize: '0.84rem', paddingTop: 4 }}>
                      <div className="stack-sm" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 600, color: ok ? 'var(--success)' : 'var(--danger)' }}>
                          {ok ? '✓ Chính xác!' : `✗ Đáp án đúng: "${q.answer}"`}
                        </span>
                        {q.explanationVi && (
                          <span className="prose-explanation" style={{ color: 'var(--text-secondary)' }}>
                            {q.explanationVi}
                          </span>
                        )}
                      </div>
                      {q.evidenceParagraph && (
                        <button
                          className="btn btn-sm btn-soft"
                          onClick={() => jumpToEvidenceParagraph(q.evidenceParagraph)}
                        >
                          Bằng chứng ({q.evidenceParagraph})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCheckAll}>
          <CheckCircle2 size={15} /> Chấm bài Reading &amp; Lưu tiến độ
        </button>
      </section>
    </div>
  );
};
