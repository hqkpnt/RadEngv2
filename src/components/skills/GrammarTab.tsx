import React, { useEffect, useState } from 'react';
import { BookmarkPlus, CheckCircle2, Clock, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';
import { normalizeWord, speakText } from '../../utils/speech';

interface GrammarTabProps {
  lesson: LessonPack;
  timedMode: boolean;
}

export const GrammarTab: React.FC<GrammarTabProps> = ({ lesson, timedMode }) => {
  const { prefs, addLessonVocab, markSkillComplete, showToast } = useApp();
  const points = lesson.grammar;
  const [activePointIdx, setActivePointIdx] = useState(0);
  // Strictly scoped by lessonId + grammarIndex + grammarId + exerciseIndex + exerciseId
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedByPoint, setCheckedByPoint] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    setActivePointIdx(0);
    setAnswers({});
    setCheckedByPoint({});
    setSecondsLeft(120);
  }, [lesson.id]);

  const safePointIdx = Math.min(activePointIdx, Math.max(0, points.length - 1));
  const point = points[safePointIdx];
  const pointScopeKey = point ? `${lesson.id}::gp_${safePointIdx}::${point.id}` : '';
  const isCurrentPointChecked = Boolean(pointScopeKey && checkedByPoint[pointScopeKey]);

  useEffect(() => {
    setSecondsLeft(120);
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

  const isCorrectAnswer = (exId: string, exIdx: number, expected: string) => {
    const val = answers[getAnswerKey(exId, exIdx)] || '';
    return normalizeWord(val) === normalizeWord(expected);
  };

  const handleCheckCurrentPoint = () => {
    setCheckedByPoint((prev) => ({ ...prev, [pointScopeKey]: true }));
    const total = point.quickExercises.length;
    const correct = point.quickExercises.filter((ex, idx) =>
      isCorrectAnswer(ex.id, idx, ex.answer)
    ).length;
    const ratio = total === 0 ? 1 : correct / total;
    const stars = ratio === 1 ? 3 : ratio >= 0.8 ? 2 : 1;
    markSkillComplete(lesson.id, 'grammar', 20, stars);
    showToast(`Kết quả "${point.topic}": ${correct}/${total} câu đúng (${stars}★ · +20 XP)`);
  };

  const handleResetCurrentPoint = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      point.quickExercises.forEach((ex, idx) => {
        delete next[getAnswerKey(ex.id, idx)];
      });
      return next;
    });
    setCheckedByPoint((prev) => ({ ...prev, [pointScopeKey]: false }));
    setSecondsLeft(120);
  };

  return (
    <div className="stack-md">
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
      <div key={pointScopeKey} className="stack-md">
        <div className="card stack-md">
          <div>
            <span className="badge badge-accent">
              <Sparkles size={13} /> Điểm ngữ pháp {safePointIdx + 1}/{points.length}
            </span>
            <h2 style={{ margin: '8px 0 0', fontSize: '1.22rem' }}>{point.topic}</h2>
          </div>

          {point.formula && (
            <div
              className="card-subtle mono"
              style={{
                borderLeft: '4px solid var(--accent)',
                fontSize: '0.94rem',
                fontWeight: 600,
                color: 'var(--accent)',
              }}
            >
              {point.formula}
            </div>
          )}

          {point.explanationVi && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{point.explanationVi}</p>
          )}

          {point.sourceSentence.en && (
            <div className="card-subtle stack-sm">
              <div className="flex-between flex-wrap">
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  CÂU NGUỒN TRONG NGỮ CẢNH THỰC TẾ
                </span>
                <div className="flex-row flex-wrap" style={{ gap: 6 }}>
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
                    <BookmarkPlus size={14} /> Lưu Flashcard & SRS
                  </button>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{point.sourceSentence.en}</div>
              {point.sourceSentence.vi && (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {point.sourceSentence.vi}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card stack-md">
          <div className="flex-between flex-wrap">
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
              Thực hành nhanh ({point.quickExercises.length} bài tập)
            </h3>
            {isCurrentPointChecked && (
              <button className="btn btn-sm" onClick={handleResetCurrentPoint}>
                <RotateCcw size={14} /> Làm lại điểm này
              </button>
            )}
          </div>

          <div className="stack-md">
            {point.quickExercises.map((ex, idx) => {
              const ansKey = getAnswerKey(ex.id, idx);
              const selectedValue = answers[ansKey] || '';
              const correct = isCorrectAnswer(ex.id, idx, ex.answer);
              return (
                <div key={ansKey} className="card-subtle stack-sm">
                  <div style={{ fontWeight: 600 }}>
                    Câu {idx + 1}. {ex.prompt}
                  </div>

                  {ex.type === 'mcq' && ex.options ? (
                    <div className="stack-sm">
                      {ex.options.map((opt, optIdx) => {
                        let cls = 'quiz-option';
                        if (isCurrentPointChecked) {
                          if (normalizeWord(opt) === normalizeWord(ex.answer)) cls += ' correct';
                          else if (selectedValue === opt) cls += ' wrong';
                        } else if (selectedValue === opt) {
                          cls += ' selected';
                        }
                        return (
                          <button
                            key={`${ansKey}_opt_${optIdx}`}
                            className={cls}
                            disabled={isCurrentPointChecked}
                            onClick={() => setAnswers((prev) => ({ ...prev, [ansKey]: opt }))}
                          >
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      className="input"
                      disabled={isCurrentPointChecked}
                      placeholder="Điền từ / cụm từ chính xác..."
                      value={selectedValue}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [ansKey]: e.target.value }))
                      }
                    />
                  )}

                  {isCurrentPointChecked && (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: correct ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 500,
                      }}
                    >
                      {correct ? '✓ Chính xác!' : `✗ Đáp án đúng: "${ex.answer}"`}{' '}
                      {ex.explanationVi && (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                          — {ex.explanationVi}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-between flex-wrap">
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Đáp án được tách riêng cho từng điểm ngữ pháp.
            </span>
            <button className="btn btn-primary" onClick={handleCheckCurrentPoint}>
              <CheckCircle2 size={15} /> Kiểm tra & Lưu tiến độ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
