import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookMarked,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { NotebookDrawer } from '../components/NotebookDrawer';
import { GrammarTab } from '../components/skills/GrammarTab';
import { ReadingTab } from '../components/skills/ReadingTab';
import { VocabularyTab } from '../components/skills/VocabularyTab';
import { useApp } from '../context/AppContext';
import { SKILL_LABELS, SkillKey } from '../types/schema';

interface LessonDetailPageProps {
  lessonId: string;
  navigate: (hash: string) => void;
}

const SKILLS: SkillKey[] = ['vocabulary', 'grammar', 'reading'];

export const LessonDetailPage: React.FC<LessonDetailPageProps> = ({ lessonId, navigate }) => {
  const { lessons, state, getSubspecialtyLabel, zenMode, setZenMode } = useApp();
  const [activeSkill, setActiveSkill] = useState<SkillKey>('vocabulary');
  const [timedMode, setTimedMode] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);

  const lesson = lessons.find((l) => l.id === lessonId);

  useEffect(() => {
    return () => setZenMode(false);
  }, [setZenMode]);

  if (!lesson) {
    return (
      <div className="card stack-sm" style={{ textAlign: 'center', padding: 36 }}>
        <h2 style={{ margin: 0 }}>Không tìm thấy bài học</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Gói bài học <code className="mono">{lessonId}</code> chưa được nạp hoặc đã bị xóa.
        </p>
        <div>
          <button className="btn btn-primary" onClick={() => navigate('#/lessons')}>
            Quay lại danh sách bài học
          </button>
        </div>
      </div>
    );
  }

  const prog = state.lessonProgress[lesson.id];

  return (
    <div className="stack-md">
      <div className="card stack-sm">
        <div className="flex-between flex-wrap">
          <button className="btn btn-sm" onClick={() => navigate('#/lessons')}>
            <ArrowLeft size={14} /> Danh sách bài học
          </button>

          <div className="flex-row flex-wrap">
            <button
              className={`btn btn-sm ${timedMode ? 'btn-primary' : ''}`}
              onClick={() => setTimedMode((t) => !t)}
              title="Bật đồng hồ tính giờ cho bài tập"
            >
              <Clock size={14} /> Tính giờ: {timedMode ? 'Bật' : 'Tắt'}
            </button>
            <button
              className={`btn btn-sm ${zenMode ? 'btn-primary' : ''}`}
              onClick={() => setZenMode(!zenMode)}
              title="Chế độ đọc tập trung tối giản"
            >
              {zenMode ? <EyeOff size={14} /> : <Eye size={14} />} Zen
            </button>
            <button className="btn btn-sm btn-soft" onClick={() => setNotebookOpen(true)}>
              <BookMarked size={14} /> Sổ tay
            </button>
          </div>
        </div>

        <div>
          <div className="flex-row flex-wrap" style={{ gap: 6, marginBottom: 6 }}>
            <span className="badge badge-accent">{lesson.meta.level}</span>
            <span className="badge">{getSubspecialtyLabel(lesson.meta.subspecialty)}</span>
            {lesson.meta.sourceBook && (
              <span className="badge">📖 {lesson.meta.sourceBook}</span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: '1.38rem', lineHeight: 1.3 }}>{lesson.meta.title}</h1>
          {lesson.meta.titleVi && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: 2 }}>
              {lesson.meta.titleVi}
            </div>
          )}
        </div>

        {/* 3-Skill Animated Tab Bar */}
        <div className="skill-tabs" role="tablist" aria-label="3 kỹ năng bài học">
          {SKILLS.map((sk) => {
            const done = Boolean(prog?.skillsCompleted[sk]);
            const active = activeSkill === sk;
            return (
              <button
                key={sk}
                role="tab"
                aria-selected={active}
                className={`skill-tab ${active ? 'active' : ''}`}
                onClick={() => setActiveSkill(sk)}
              >
                {active && (
                  <motion.span
                    layoutId="skillTabPill"
                    className="nav-pill-bg"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={`skill-dot ${done ? 'done' : ''}`} />
                <span>{SKILL_LABELS[sk].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSkill === 'vocabulary' && <VocabularyTab lesson={lesson} timedMode={timedMode} />}
      {activeSkill === 'grammar' && <GrammarTab lesson={lesson} timedMode={timedMode} />}
      {activeSkill === 'reading' && <ReadingTab lesson={lesson} timedMode={timedMode} />}

      <NotebookDrawer
        open={notebookOpen}
        lessonId={lesson.id}
        lessonTitle={lesson.meta.title}
        onClose={() => setNotebookOpen(false)}
      />
    </div>
  );
};
