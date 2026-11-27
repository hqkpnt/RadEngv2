import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  PenLine,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GrammarExercise, LessonPack } from '../../types/schema';
import { evaluateGrammarAnswer } from '../../utils/grammarMatch';
import { normalizeWord, speakText } from '../../utils/speech';

interface GrammarTabProps {
  lesson: LessonPack;
  timedMode: boolean;
}

const EXERCISE_TYPE_META: Record<
  GrammarExercise['type'],
  { label: string; badgeClass: string }
> = {
  mcq: { label: 'Trắc nghiệm', badgeClass: 'badge' },
  fill: { label: 'Điền từ', badgeClass: 'badge' },
  error: { label: 'Sửa lỗi', badgeClass: 'badge badge-warning' },
  rewrite: { label: 'Viết lại câu', badgeClass: 'badge badge-accent' },
};

const FAST_EASE = [0.22, 1, 0.36, 1] as const;

export const GrammarTab: React.FC<GrammarTabProps> = ({ lesson, timedMode }) => {
  const { prefs, addLessonVocab, markSkillComplete, showToast } = useApp();
  const points = lesson.grammar;
  const [activePointIdx, setActivePointIdx] = useState(0);

  // Strictly scoped by lessonId + grammarIndex + grammarId + exerciseIndex + exerciseId
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedByPoint, setCheckedByPoint] = useState<Record<string, boolean>>({});
  const [checkedByQuestion, setCheckedByQuestion] = useState<Record<string, boolean>>({});
  const [openNotesByPoint, setOpenNotesByPoint] = useState<Record<string, boolean>>({});
  const [openHintsByQuestion, setOpenHintsByQuestion] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(180);

  useEffect(() => {
    setActivePointIdx(0);
    setAnswers({});
    setCheckedByPoint({});
    setCheckedByQuestion({});
    setOpenNotesByPoint({});
    setOpenHintsByQuestion({});
    setSecondsLeft(180);
  }, [lesson.id]);

  const safePointIdx = Math.min(activePointIdx, Math.max(0, points.length - 1));
  const point = points[safePointIdx];
  const pointScopeKey = point ? `${lesson.id}::gp_${safePointIdx}::${point.id}` : '';
  const isCurrentPointChecked = Boolean(pointScopeKey && checkedByPoint[pointScopeKey]);
  const isNotesOpen = Boolean(pointScopeKey && openNotesByPoint[pointScopeKey]);

  useEffect(() => {
    setSecondsLeft(180);
  }, [pointScopeKey]);

  useEffect(() => {
    if (!timedMode || isCurrentPointChecked || !pointScopeKey) return;
    if (secondsLeft <= 0) {
      setCheckedByPoint((prev) => ({ ...prev, [pointScopeKey]: true }));
      return;
    }
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [timedMode, isCurrentPointChecked, pointScopeKey, secondsLeft]);

  if (!point || points.length === 0) {
    return <div className="card">Bài học này chưa có mục ngữ pháp.</div>;
  }

  const getAnswerKey = (exId: string, exIdx: number) =>
    `${pointScopeKey}::ex_${exIdx}::${exId}`;

  const handleCheckSingleQuestion = (ansKey: string) => {
    setCheckedByQuestion((prev) => ({ ...prev, [ansKey]: true }));
  };

  const handleCheckCurrentPoint = () => {
    setCheckedByPoint((prev) => ({ ...prev, [pointScopeKey]: true }));
    const nextSingle: Record<string, boolean> = {};
    point.quickExercises.forEach((ex, idx) => {
      nextSingle[getAnswerKey(ex.id, idx)] = true;
    });
    setCheckedByQuestion((prev) => ({ ...prev, ...nextSingle }));

    const total = point.quickExercises.length;
    const correct = point.quickExercises.filter((ex, idx) => {
      const val = answers[getAnswerKey(ex.id, idx)] || '';
      return evaluateGrammarAnswer(ex, val).isCorrect;
    }).length;
    const ratio = total === 0 ? 1 : correct / total;
    const stars = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : 1;
    markSkillComplete(lesson.id, 'grammar', 25, stars);
    showToast(`Kết quả "${point.topic}": ${correct}/${total} câu đúng (${stars}★ · +25 XP)`);
  };

  const handleResetCurrentPoint = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      point.quickExercises.forEach((ex, idx) => {
        delete next[getAnswerKey(ex.id, idx)];
      });
      return next;
    });
    setCheckedByQuestion((prev) => {
      const next = { ...prev };
      point.quickExercises.forEach((ex, idx) => {
        delete next[getAnswerKey(ex.id, idx)];
      });
      return next;
    });
    setOpenHintsByQuestion((prev) => {
      const next = { ...prev };
      point.quickExercises.forEach((ex, idx) => {
        delete next[getAnswerKey(ex.id, idx)];
      });
      return next;
    });
    setCheckedByPoint((prev) => ({ ...prev, [pointScopeKey]: false }));
    setSecondsLeft(180);
  };

  const answeredCount = point.quickExercises.filter((ex, idx) =>
    Boolean((answers[getAnswerKey(ex.id, idx)] || '').trim())
  ).length;

  return (
    <div className="stack-lg">
      <div className="flex-between flex-wrap">
        <div className="chip-list" role="tablist" aria-label="Danh sách điểm ngữ pháp">
          {points.map((gp, i) => {
            const pKey = `${lesson.id}::gp_${i}::${gp.id}`;
            const isDone = Boolean(checkedByPoint[pKey]);
            return (
              <button
                key={pKey}
                role="tab"
                aria-selected={safePointIdx === i}
                className={`chip ${safePointIdx === i ? 'active' : ''}`}
                onClick={() => setActivePointIdx(i)}
              >
                <span>
                  Điểm {i + 1}: {gp.topic}
                </span>
                {isDone && <span>✓</span>}
              </button>
            );
          })}
        </div>

        {timedMode && (
          <span className={`badge mono ${secondsLeft <= 20 ? 'badge-danger' : 'badge-accent'}`}>
            <Clock size={13} /> {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Keyed by pointScopeKey so React isolates state cleanly across grammar points */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pointScopeKey}
          className="stack-lg"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: FAST_EASE }}
        >
          {/* Core Grammar Summary Card with Progressive Disclosure */}
          <div className="card stack-md">
            <div className="flex-between flex-wrap">
              <div>
                <span className="badge badge-accent">
                  <Sparkles size={13} /> Điểm ngữ pháp {safePointIdx + 1}/{points.length}
                </span>
                <h2 style={{ margin: '10px 0 0', fontSize: '1.28rem', letterSpacing: '-0.015em' }}>
                  {point.topic}
                </h2>
              </div>

              {point.sourceSentence.en && (
                <div className="flex-row flex-wrap" style={{ gap: 8 }}>
                  <button
                    className="btn btn-sm btn-soft"
                    onClick={() =>
                      speakText(point.sourceSentence.en, prefs.ttsRate, prefs.ttsVoice, {
                        voiceName: prefs.ttsVoiceName,
                      })
                    }
                  >
                    <Volume2 size={14} /> Nghe câu mẫu
                  </button>
                  <button
                    className="btn btn-sm"
                    title="Lưu cấu trúc ngữ pháp kèm câu nguồn vào Flashcard bài học & SRS"
                    onClick={() =>
                      addLessonVocab(
                        lesson.id,
                        {
                          termKey: '',
                          term: point.topic,
                          ipa: '',
                          pos: 'grammar',
                          wordRoot: point.formula,
                          meaningVi: point.explanationVi || point.formula || point.topic,
                          noteVi: point.formula ? `Công thức: ${point.formula}` : '',
                          exampleEn: point.sourceSentence.en,
                          exampleVi: point.sourceSentence.vi,
                        },
                        true
                      )
                    }
                  >
                    <BookmarkPlus size={14} /> Lưu Flashcard &amp; SRS
                  </button>
                </div>
              )}
            </div>

            {point.formula && (
              <div
                className="soft-tint mono"
                style={{
                  borderLeft: '3px solid var(--accent)',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                }}
              >
                {point.formula}
              </div>
            )}

            {point.sourceSentence.en && (
              <div className="stack-sm" style={{ paddingTop: 2 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  CÂU MẪU TRONG NGỮ CẢNH
                </span>
                <p className="prose-measure" style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
                  {point.sourceSentence.en}
                </p>
              </div>
            )}

            {/* Progressive Disclosure: Detailed Vietnamese Explanation & Translation */}
            {(point.explanationVi || point.sourceSentence.vi) && (
              <div>
                <button
                  type="button"
                  className="disclosure-trigger"
                  aria-expanded={isNotesOpen}
                  onClick={() =>
                    setOpenNotesByPoint((prev) => ({
                      ...prev,
                      [pointScopeKey]: !prev[pointScopeKey],
                    }))
                  }
                >
                  <ChevronDown
                    size={15}
                    style={{
                      transform: isNotesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease-out',
                    }}
                  />
                  <span>
                    {isNotesOpen ? 'Thu gọn giải thích & bản dịch' : 'Xem giải thích chi tiết & bản dịch câu mẫu'}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isNotesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: FAST_EASE }}
                      className="soft-tint stack-sm"
                      style={{ marginTop: 10 }}
                    >
                      {point.explanationVi && (
                        <p
                          className="prose-explanation"
                          style={{ margin: 0, color: 'var(--text-secondary)' }}
                        >
                          {point.explanationVi}
                        </p>
                      )}
                      {point.sourceSentence.vi && (
                        <p
                          className="prose-explanation"
                          style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            borderLeft: '2px solid var(--border-strong)',
                            paddingLeft: 10,
                          }}
                        >
                          <strong>Dịch câu mẫu:</strong> {point.sourceSentence.vi}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Practice Exercises Block */}
          <div className="card stack-lg">
            <div className="flex-between flex-wrap">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  Thực hành ({point.quickExercises.length} bài tập)
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Đã trả lời {answeredCount}/{point.quickExercises.length} câu · Đáp án được khóa riêng cho điểm ngữ pháp này
                </div>
              </div>
              {(isCurrentPointChecked || Object.keys(checkedByQuestion).some((k) => k.startsWith(pointScopeKey))) && (
                <button className="btn btn-sm" onClick={handleResetCurrentPoint}>
                  <RotateCcw size={14} /> Làm lại điểm này
                </button>
              )}
            </div>

            <div className="stack-lg">
              {point.quickExercises.map((ex, idx) => {
                const ansKey = getAnswerKey(ex.id, idx);
                const selectedValue = answers[ansKey] || '';
                const isQuestionChecked = isCurrentPointChecked || Boolean(checkedByQuestion[ansKey]);
                const evalRes = evaluateGrammarAnswer(ex, selectedValue);
                const typeMeta = EXERCISE_TYPE_META[ex.type] || EXERCISE_TYPE_META.fill;
                const hintOpen = Boolean(openHintsByQuestion[ansKey]);

                return (
                  <div key={ansKey} className="exercise-block stack-sm">
                    <div className="flex-between flex-wrap" style={{ gap: 8 }}>
                      <div className="flex-row flex-wrap" style={{ gap: 8 }}>
                        <span className="badge mono" style={{ fontSize: '0.73rem' }}>
                          Câu {idx + 1}
                        </span>
                        <span className={typeMeta.badgeClass}>{typeMeta.label}</span>
                      </div>

                      {ex.hint && !isQuestionChecked && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          onClick={() =>
                            setOpenHintsByQuestion((prev) => ({
                              ...prev,
                              [ansKey]: !prev[ansKey],
                            }))
                          }
                        >
                          <Lightbulb size={13} /> {hintOpen ? 'Ẩn gợi ý' : 'Gợi ý'}
                        </button>
                      )}
                    </div>

                    <p
                      className="prose-explanation"
                      style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text)' }}
                    >
                      {ex.prompt}
                    </p>

                    {ex.sourceSentence && (
                      <div
                        className="soft-tint prose-explanation"
                        style={{
                          borderLeft:
                            ex.type === 'error'
                              ? '3px solid var(--warning)'
                              : '3px solid var(--accent-border)',
                          fontSize: '0.94rem',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: 'var(--text-muted)',
                            marginBottom: 4,
                          }}
                        >
                          {ex.type === 'error' ? 'CÂU CẦN SỬA LỖI' : 'CÂU GỐC'}
                        </div>
                        <div style={{ fontWeight: 500 }}>{ex.sourceSentence}</div>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {ex.hint && hintOpen && !isQuestionChecked && (
                        <motion.div
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.16, ease: FAST_EASE }}
                          style={{
                            fontSize: '0.84rem',
                            color: 'var(--accent)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent-soft)',
                          }}
                        >
                          <Lightbulb size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                          <strong>Gợi ý:</strong> {ex.hint}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {ex.type === 'mcq' && ex.options ? (
                      <div className="stack-sm">
                        {ex.options.map((opt, optIdx) => {
                          let cls = 'quiz-option';
                          if (isQuestionChecked) {
                            if (normalizeWord(opt) === normalizeWord(ex.answer)) cls += ' correct';
                            else if (selectedValue === opt) cls += ' wrong';
                          } else if (selectedValue === opt) {
                            cls += ' selected';
                          }
                          return (
                            <button
                              key={`${ansKey}_opt_${optIdx}`}
                              className={cls}
                              disabled={isQuestionChecked}
                              onClick={() => setAnswers((prev) => ({ ...prev, [ansKey]: opt }))}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : ex.type === 'rewrite' ? (
                      <div className="stack-sm">
                        <textarea
                          className="textarea"
                          style={{ minHeight: 78 }}
                          disabled={isQuestionChecked}
                          placeholder="Nhập câu viết lại hoàn chỉnh của bạn..."
                          value={selectedValue}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [ansKey]: e.target.value }))
                          }
                        />
                        {!isQuestionChecked && (
                          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-soft"
                              disabled={!selectedValue.trim()}
                              onClick={() => handleCheckSingleQuestion(ansKey)}
                            >
                              <PenLine size={13} /> Kiểm tra câu này
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-row flex-wrap" style={{ gap: 8 }}>
                        <input
                          className="input"
                          style={{ flex: 1, minWidth: 220 }}
                          disabled={isQuestionChecked}
                          placeholder={
                            ex.type === 'error'
                              ? 'Nhập phần đã sửa (hoặc cả câu đã sửa)...'
                              : 'Điền từ / cụm từ chính xác...'
                          }
                          value={selectedValue}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [ansKey]: e.target.value }))
                          }
                        />
                        {!isQuestionChecked && (
                          <button
                            type="button"
                            className="btn btn-sm btn-soft"
                            disabled={!selectedValue.trim()}
                            onClick={() => handleCheckSingleQuestion(ansKey)}
                          >
                            Kiểm tra
                          </button>
                        )}
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {isQuestionChecked && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18, ease: FAST_EASE }}
                          className="soft-tint stack-sm"
                          style={{
                            borderLeft: `3px solid ${evalRes.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                            padding: '12px 14px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              color: evalRes.isCorrect ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {evalRes.isCorrect
                              ? evalRes.matchKind === 'equivalent'
                                ? '✓ Đáp án tương đương đúng ngữ pháp!'
                                : '✓ Chính xác!'
                              : '✗ Chưa khớp đáp án chuẩn'}
                          </div>

                          {(!evalRes.isCorrect || evalRes.matchKind === 'equivalent') && (
                            <div className="prose-explanation" style={{ fontSize: '0.88rem' }}>
                              <strong style={{ color: 'var(--text)' }}>Câu chuẩn: </strong>
                              <span>{ex.answer}</span>
                            </div>
                          )}

                          {ex.acceptedAnswers && ex.acceptedAnswers.length > 0 && !evalRes.isCorrect && (
                            <div
                              className="prose-explanation"
                              style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}
                            >
                              <strong>Cách viết tương đương:</strong> {ex.acceptedAnswers.join('  |  ')}
                            </div>
                          )}

                          {ex.explanationVi && (
                            <p
                              className="prose-explanation"
                              style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {ex.explanationVi}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="flex-between flex-wrap" style={{ paddingTop: 4 }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Bạn có thể kiểm tra từng câu hoặc chấm toàn bộ điểm ngữ pháp này.
              </span>
              <button className="btn btn-primary" onClick={handleCheckCurrentPoint}>
                <CheckCircle2 size={15} /> Chấm toàn bộ &amp; Lưu tiến độ
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
