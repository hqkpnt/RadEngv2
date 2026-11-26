import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';
import { normalizeWord, speakText } from '../../utils/speech';

interface GrammarTabProps {
  lesson: LessonPack;
  timedMode: boolean;
}

export const GrammarTab: React.FC<GrammarTabProps> = ({ lesson, timedMode }) => {
  const { prefs, markSkillComplete, showToast } = useApp();
  const points = lesson.grammar;
  const [activePointIdx, setActivePointIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    setActivePointIdx(0);
    setAnswers({});
    setChecked(false);
    setSecondsLeft(120);
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

  if (points.length === 0) {
    return <div className="card">Bài học này chưa có mục ngữ pháp.</div>;
  }

  const point = points[activePointIdx] || points[0];
  const allExercises = points.flatMap((p) => p.quickExercises);

  const isCorrectAnswer = (exId: string, expected: string) => {
    const val = answers[exId] || '';
    return normalizeWord(val) === normalizeWord(expected);
  };

  const handleCheck = () => {
    setChecked(true);
    const total = allExercises.length;
    const correct = allExercises.filter((ex) => isCorrectAnswer(ex.id, ex.answer)).length;
    const ratio = total === 0 ? 1 : correct / total;
    const stars = ratio === 1 ? 3 : ratio >= 0.8 ? 2 : 1;
    markSkillComplete(lesson.id, 'grammar', 20, stars);
    showToast(`Kết quả Grammar: ${correct}/${total} câu đúng (${stars}★ · +20 XP)`);
  };

  return (
    <div className="stack-md">
      <div className="flex-between flex-wrap">
        <div className="chip-list">
          {points.map((gp, i) => (
            <button
              key={gp.id}
              className={`chip ${activePointIdx === i ? 'active' : ''}`}
              onClick={() => setActivePointIdx(i)}
            >
              Điểm {i + 1}: {gp.topic.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {timedMode && (
          <span className={`badge mono ${secondsLeft <= 20 ? 'badge-danger' : 'badge-accent'}`}>
            <Clock size={13} /> {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="card stack-md">
        <div>
          <span className="badge badge-accent">
            <Sparkles size={13} /> Cấu trúc trọng tâm
          </span>
          <h2 style={{ margin: '8px 0 0', fontSize: '1.2rem' }}>{point.topic}</h2>
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
            <div className="flex-between">
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CÂU NGUỒN TRONG NGỮ CẢNH LÂM SÀNG
              </span>
              <button
                className="btn btn-sm btn-soft"
                onClick={() =>
                  speakText(point.sourceSentence.en, prefs.ttsRate, prefs.ttsVoice, {
                    voiceName: prefs.ttsVoiceName,
                    style: prefs.narrationStyle,
                  })
                }
              >
                <Volume2 size={14} /> Nghe câu mẫu
              </button>
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
          {checked && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setAnswers({});
                setChecked(false);
                setSecondsLeft(120);
              }}
            >
              <RotateCcw size={14} /> Làm lại
            </button>
          )}
        </div>

        <div className="stack-md">
          {point.quickExercises.map((ex, idx) => {
            const correct = isCorrectAnswer(ex.id, ex.answer);
            return (
              <div key={ex.id} className="card-subtle stack-sm">
                <div style={{ fontWeight: 600 }}>
                  Câu {idx + 1}. {ex.prompt}
                </div>

                {ex.type === 'mcq' && ex.options ? (
                  <div className="stack-sm">
                    {ex.options.map((opt) => {
                      let cls = 'quiz-option';
                      if (checked) {
                        if (normalizeWord(opt) === normalizeWord(ex.answer)) cls += ' correct';
                        else if (answers[ex.id] === opt) cls += ' wrong';
                      } else if (answers[ex.id] === opt) {
                        cls += ' selected';
                      }
                      return (
                        <button
                          key={opt}
                          className={cls}
                          disabled={checked}
                          onClick={() => setAnswers((prev) => ({ ...prev, [ex.id]: opt }))}
                        >
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="input"
                    disabled={checked}
                    placeholder="Điền từ / cụm từ chính xác..."
                    value={answers[ex.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                  />
                )}

                {checked && (
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

        <div className="flex-between">
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Phản hồi đúng/sai tức thì kèm giải thích ngữ pháp.
          </span>
          <button className="btn btn-primary" onClick={handleCheck}>
            <CheckCircle2 size={15} /> Kiểm tra & Lưu tiến độ
          </button>
        </div>
      </div>
    </div>
  );
};
