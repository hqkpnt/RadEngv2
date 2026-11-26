import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
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

export const ReadingTab: React.FC<ReadingTabProps> = ({ lesson, timedMode }) => {
  const { prefs, state, addCardToSrs, toggleMastered, markSkillComplete, showToast } = useApp();
  const { reading } = lesson;

  const [showAllVi, setShowAllVi] = useState(false);
  const [openViParas, setOpenViParas] = useState<Record<string, boolean>>({});
  const [activeGlossary, setActiveGlossary] = useState<GlossaryItem | null>(null);
  const [highlightPara, setHighlightPara] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);

  useEffect(() => {
    if (!timedMode || checked) return;
    if (secondsLeft <= 0) {
      setChecked(true);
      return;
    }
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [timedMode, checked, secondsLeft]);

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

  return (
    <div className="reading-split">
      {/* Left Pane: Bilingual Passage & Glossary */}
      <section className="card stack-md">
        <div className="flex-between flex-wrap">
          <div>
            <span className="badge badge-accent">Reading Passage</span>
            <h2 style={{ margin: '6px 0 0', fontSize: '1.18rem' }}>{reading.title}</h2>
          </div>
          <button
            className={`btn btn-sm ${showAllVi ? 'btn-primary' : 'btn-soft'}`}
            onClick={() => setShowAllVi((v) => !v)}
          >
            <Languages size={14} /> {showAllVi ? 'Đang bật Song ngữ' : 'Bật song ngữ toàn bài'}
          </button>
        </div>

        {activeGlossary && (
          <div className="card-subtle stack-sm" style={{ borderColor: 'var(--accent)' }}>
            <div className="flex-between">
              <div>
                <strong style={{ color: 'var(--accent)' }}>{activeGlossary.term}</strong>{' '}
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
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{activeGlossary.meaningVi}</div>
            {activeGlossary.wordRoot && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Gốc từ: {activeGlossary.wordRoot}
              </div>
            )}
            <div className="flex-row flex-wrap">
              <button
                className="btn btn-sm btn-soft"
                onClick={() =>
                  speakText(activeGlossary.term, prefs.ttsRate, prefs.ttsVoice, {
                    voiceName: prefs.ttsVoiceName,
                    style: prefs.narrationStyle,
                  })
                }
              >
                <Volume2 size={13} /> Nghe
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
                <Layers size={13} /> + Ôn tập SRS
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
          </div>
        )}

        <div className="stack-md">
          {reading.paragraphs.map((p, idx) => {
            const viVisible = showAllVi || Boolean(openViParas[p.id]);
            const isEvidence = highlightPara === p.id;
            return (
              <div
                key={p.id}
                className={`stack-sm ${isEvidence ? 'evidence-highlight' : ''}`}
                style={{ padding: '6px 8px' }}
              >
                <div className="flex-between">
                  <span className="badge mono" style={{ fontSize: '0.72rem' }}>
                    Đoạn {idx + 1} ({p.id})
                  </span>
                  {p.vi && (
                    <button
                      className="btn btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.76rem' }}
                      onClick={() =>
                        setOpenViParas((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                      }
                    >
                      {viVisible ? 'Ẩn dịch' : 'Dịch đoạn'}
                    </button>
                  )}
                </div>
                <p style={{ margin: 0, lineHeight: 1.75 }}>{renderParagraphWithGlossary(p.en)}</p>
                {viVisible && p.vi && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      borderLeft: '2px solid var(--border-strong)',
                      paddingLeft: 10,
                    }}
                  >
                    {p.vi}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {reading.glossary.length > 0 && (
          <div className="card-subtle stack-sm">
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              GLOSSARY THUẬT NGỮ TRONG BÀI (Bấm để xem chi tiết)
            </span>
            <div className="chip-list">
              {reading.glossary.map((g) => (
                <button
                  key={g.termKey}
                  className={`chip ${activeGlossary?.termKey === g.termKey ? 'active' : ''}`}
                  onClick={() => setActiveGlossary(g)}
                >
                  {g.term}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Right Pane: 4 Question Types */}
      <section className="card stack-md">
        <div className="flex-between flex-wrap">
          <h3 style={{ margin: 0, fontSize: '1.08rem' }}>Bài tập Đọc hiểu (4 dạng · {totalQ} câu)</h3>
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
          <div className="stack-sm">
            <strong style={{ fontSize: '0.86rem', color: 'var(--accent)' }}>1. Multiple Choice (MCQ)</strong>
            {mcq.map((q, i) => (
              <div key={q.id} className="card-subtle stack-sm">
                <div style={{ fontWeight: 600 }}>
                  {i + 1}. {q.question}
                </div>
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
                {checked && (
                  <div className="flex-between flex-wrap" style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{q.explanationVi}</span>
                    {q.evidenceParagraph && (
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => setHighlightPara(q.evidenceParagraph || null)}
                      >
                        Xem bằng chứng ({q.evidenceParagraph})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tfng.length > 0 && (
          <div className="stack-sm">
            <strong style={{ fontSize: '0.86rem', color: 'var(--accent)' }}>
              2. True / False / Not Given
            </strong>
            {tfng.map((q, i) => (
              <div key={q.id} className="card-subtle stack-sm">
                <div style={{ fontWeight: 600 }}>
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
                  <div className="flex-between flex-wrap" style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{q.explanationVi}</span>
                    {q.evidenceParagraph && (
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => setHighlightPara(q.evidenceParagraph || null)}
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
          <div className="stack-sm">
            <strong style={{ fontSize: '0.86rem', color: 'var(--accent)' }}>3. Matching</strong>
            {matching.map((q, i) => (
              <div key={q.id} className="card-subtle stack-sm">
                <div style={{ fontWeight: 600 }}>
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
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: answers[q.id] === q.answer ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {answers[q.id] === q.answer ? '✓ Chính xác!' : `✗ Đáp án đúng: ${q.answer}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {completion.length > 0 && (
          <div className="stack-sm">
            <strong style={{ fontSize: '0.86rem', color: 'var(--accent)' }}>
              4. Summary Completion / Short Answer
            </strong>
            {completion.map((q, i) => {
              const ok = normalizeWord(answers[q.id] || '') === normalizeWord(q.answer);
              return (
                <div key={q.id} className="card-subtle stack-sm">
                  <div style={{ fontWeight: 600 }}>
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
                    <div style={{ fontSize: '0.84rem', color: ok ? 'var(--success)' : 'var(--danger)' }}>
                      {ok ? '✓ Chính xác!' : `✗ Đáp án đúng: "${q.answer}"`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCheckAll}>
          <CheckCircle2 size={15} /> Chấm bài Reading & Lưu tiến độ
        </button>
      </section>
    </div>
  );
};
