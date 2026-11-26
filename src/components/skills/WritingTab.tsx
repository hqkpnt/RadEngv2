import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, Play, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';

interface WritingTabProps {
  lesson: LessonPack;
}

const RUBRIC_CRITERIA = [
  'Clinical Accuracy & Task Response (Đủ ý trọng tâm & chuẩn xác chuyên môn CĐHA/DSA)',
  'Coherence & Cohesion (Mạch lạc, liên kết tiến trình thủ thuật tự nhiên)',
  'Lexical Resource (Thuật ngữ hình ảnh & can thiệp nội mạch chính xác)',
  'Grammatical Range & Accuracy (Chuẩn bị động quá khứ & mệnh đề phân từ)',
];

export const WritingTab: React.FC<WritingTabProps> = ({ lesson }) => {
  const { state, saveWritingDraft, toggleParaphraseDone, markSkillComplete, showToast } = useApp();
  const { writing } = lesson;

  const progress = state.lessonProgress[lesson.id];
  const draft = progress?.writingDraft || '';
  const doneIds = progress?.paraphraseDoneIds || [];

  const [section, setSection] = useState<'paraphrase' | 'essay'>('paraphrase');
  const [userSentences, setUserSentences] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [activeBand, setActiveBand] = useState<'band7' | 'band8' | 'band9'>('band8');
  const [rubricChecked, setRubricChecked] = useState<Record<number, boolean>>({});

  const [timerRunning, setTimerRunning] = useState(false);
  const [secLeft, setSecLeft] = useState(writing.essayTask.recommendedMinutes * 60);

  useEffect(() => {
    setSecLeft(writing.essayTask.recommendedMinutes * 60);
    setTimerRunning(false);
  }, [lesson.id, writing.essayTask.recommendedMinutes]);

  useEffect(() => {
    if (!timerRunning || secLeft <= 0) return;
    const id = window.setInterval(() => setSecLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, secLeft]);

  const wordCount = useMemo(() => {
    const trimmed = draft.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [draft]);

  const mins = String(Math.floor(secLeft / 60)).padStart(2, '0');
  const secs = String(secLeft % 60).padStart(2, '0');

  return (
    <div className="stack-md">
      <div className="flex-between flex-wrap">
        <div className="segmented" style={{ maxWidth: 440 }}>
          <button
            className={section === 'paraphrase' ? 'active' : ''}
            onClick={() => setSection('paraphrase')}
          >
            Paraphrase / Translation ({doneIds.length}/{writing.paraphraseTasks.length})
          </button>
          <button
            className={section === 'essay' ? 'active' : ''}
            onClick={() => setSection('essay')}
          >
            Báo cáo lâm sàng & Mẫu Band 7/8/9
          </button>
        </div>

        <button
          className="btn btn-sm btn-soft"
          onClick={() => {
            markSkillComplete(lesson.id, 'writing', 25);
            showToast('Đã lưu hoàn thành Writing (+25 XP)');
          }}
        >
          <CheckCircle2 size={15} /> Hoàn thành Writing
        </button>
      </div>

      {section === 'paraphrase' && (
        <div className="stack-md">
          {writing.paraphraseTasks.length === 0 ? (
            <div className="card">Bài học này chưa có câu luyện Paraphrase/Translation.</div>
          ) : (
            writing.paraphraseTasks.map((task, idx) => {
              const isDone = doneIds.includes(task.id);
              const isShown = Boolean(revealedIds[task.id]);
              return (
                <div key={task.id} className="card stack-sm">
                  <div className="flex-between flex-wrap">
                    <div className="flex-row" style={{ gap: 6 }}>
                      <span className="badge badge-accent">Câu {idx + 1}</span>
                      <span className="badge">
                        {task.type === 'paraphrase' ? 'Paraphrase' : 'Translation Việt → Anh'}
                      </span>
                    </div>
                    <button
                      className={`btn btn-sm ${isDone ? 'btn-success' : ''}`}
                      onClick={() => toggleParaphraseDone(lesson.id, task.id)}
                    >
                      <CheckCircle2 size={14} /> {isDone ? 'Đã xong ✓' : 'Đánh dấu xong'}
                    </button>
                  </div>

                  <div style={{ fontWeight: 600 }}>{task.prompt}</div>

                  {task.targetKeywords.length > 0 && (
                    <div className="flex-row flex-wrap" style={{ gap: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Từ khóa gợi ý:</span>
                      {task.targetKeywords.map((kw) => (
                        <span key={kw} className="badge mono" style={{ fontSize: '0.76rem' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  <textarea
                    className="textarea"
                    style={{ minHeight: 70 }}
                    placeholder="Viết câu tiếng Anh chuyên ngành của bạn tại đây..."
                    value={userSentences[task.id] || ''}
                    onChange={(e) =>
                      setUserSentences((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                  />

                  <div className="flex-row">
                    <button
                      className="btn btn-sm btn-soft"
                      onClick={() =>
                        setRevealedIds((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                      }
                    >
                      <Eye size={14} /> {isShown ? 'Ẩn câu mẫu' : 'So sánh đáp án mẫu'}
                    </button>
                  </div>

                  {isShown && (
                    <div className="card-subtle stack-sm" style={{ borderLeft: '3px solid var(--success)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>{task.modelAnswer}</div>
                      {task.noteVi && (
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          💡 {task.noteVi}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {section === 'essay' && (
        <div className="reading-split">
          <section className="card stack-md">
            <div className="flex-between flex-wrap">
              <span className="badge badge-accent">Đề bài tường trình / báo cáo</span>
              <div className="flex-row">
                <span className="badge mono">
                  <Clock size={13} /> {mins}:{secs}
                </span>
                <button className="btn btn-sm" onClick={() => setTimerRunning((r) => !r)}>
                  <Play size={13} /> {timerRunning ? 'Tạm dừng' : 'Bấm giờ'}
                </button>
                <button
                  className="btn btn-sm btn-icon"
                  title="Đặt lại đồng hồ"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecLeft(writing.essayTask.recommendedMinutes * 60);
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="card-subtle" style={{ fontWeight: 600 }}>
              {writing.essayTask.prompt}
            </div>

            <div className="stack-sm">
              <div className="flex-between">
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Bản nháp tự động lưu an toàn trên trình duyệt
                </span>
                <span
                  className={`badge mono ${
                    wordCount >= writing.essayTask.minWords ? 'badge-success' : 'badge-warning'
                  }`}
                >
                  {wordCount} / {writing.essayTask.minWords}+ từ
                </span>
              </div>
              <textarea
                className="textarea"
                style={{ minHeight: 280 }}
                placeholder="Bắt đầu soạn báo cáo hình ảnh / tường trình thủ thuật..."
                value={draft}
                onChange={(e) => saveWritingDraft(lesson.id, e.target.value)}
              />
            </div>

            <div className="card-subtle stack-sm">
              <strong style={{ fontSize: '0.84rem' }}>Bảng tự kiểm tra 4 tiêu chí (25% mỗi tiêu chí)</strong>
              {RUBRIC_CRITERIA.map((crit, idx) => (
                <label
                  key={idx}
                  className="flex-row"
                  style={{ fontSize: '0.84rem', cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: 4 }}
                    checked={Boolean(rubricChecked[idx])}
                    onChange={(e) =>
                      setRubricChecked((p) => ({ ...p, [idx]: e.target.checked }))
                    }
                  />
                  <span>{crit}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card stack-md">
            <div className="flex-between flex-wrap">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Bài mẫu đối chiếu theo cấp độ</h3>
              <div className="segmented" style={{ width: 240 }}>
                <button
                  className={activeBand === 'band7' ? 'active' : ''}
                  onClick={() => setActiveBand('band7')}
                >
                  Band 7
                </button>
                <button
                  className={activeBand === 'band8' ? 'active' : ''}
                  onClick={() => setActiveBand('band8')}
                >
                  Band 8
                </button>
                <button
                  className={activeBand === 'band9' ? 'active' : ''}
                  onClick={() => setActiveBand('band9')}
                >
                  Band 9
                </button>
              </div>
            </div>

            <div className="card-subtle" style={{ whiteSpace: 'pre-line', lineHeight: 1.75 }}>
              {writing.essayTask.models[activeBand] ||
                'Chưa có bài mẫu cho cấp độ này trong tệp JSON.'}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
