import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Flame,
  FolderUp,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayIso, getTreeStageInfo, TREE_STAGES } from '../utils/storage';

interface HomePageProps {
  navigate: (hash: string) => void;
}

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getCurrentWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { state, lessons, subspecialties, dueCount, prefs, setGuideOpen } = useApp();

  const treeInfo = getTreeStageInfo(state.xp);
  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const activitySet = useMemo(() => new Set(state.weeklyActivity), [state.weeklyActivity]);
  const todayXp = state.dailyXpLog[getTodayIso()] || 0;
  const masteredCount = Object.keys(state.masteredBank).length;

  const recentLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    const sorted = [...lessons].sort((a, b) => {
      const ta = state.lessonProgress[a.id]?.lastOpenedAt || 0;
      const tb = state.lessonProgress[b.id]?.lastOpenedAt || 0;
      return tb - ta;
    });
    return sorted[0];
  }, [lessons, state.lessonProgress]);

  const completedSkillsTotal = useMemo(() => {
    let done = 0;
    lessons.forEach((l) => {
      const prog = state.lessonProgress[l.id];
      if (!prog) return;
      done += Object.values(prog.skillsCompleted).filter(Boolean).length;
    });
    return done;
  }, [lessons, state.lessonProgress]);

  const totalSkillsPossible = lessons.length * 6;

  return (
    <div className="stack-lg">
      {/* Liquid Glass Hero */}
      <motion.section
        className="hero-banner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="stack-sm" style={{ maxWidth: 680 }}>
          <div className="flex-row flex-wrap">
            <span className="badge badge-accent">
              <Activity size={14} /> RadDSA Studio · Chuyên sâu CĐHA & Điện quang can thiệp
            </span>
            <span className="badge">{subspecialties.length} phân môn</span>
            <span className="badge">{lessons.length} gói bài học</span>
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', letterSpacing: '-0.03em', lineHeight: 1.22 }}>
            Làm chủ tiếng Anh <span className="gradient-text">CĐHA & DSA</span> trực tiếp từ sách chuyên ngành.
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Biên soạn gói bài 6 kỹ năng bằng Gemini, nạp nhanh file <code className="mono">.json</code> theo từng phân môn & đầu sách, luyện nghe thuyết minh chuẩn Discovery, đọc phim song ngữ và ôn thẻ SRS bền vững.
          </p>
        </div>

        <div className="flex-row flex-wrap">
          {recentLesson && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`#/lesson/${encodeURIComponent(recentLesson.id)}`)}
            >
              Vào học ngay <ArrowRight size={16} />
            </button>
          )}
          <button className="btn btn-soft" onClick={() => setGuideOpen(true)}>
            <HelpCircle size={15} /> Hướng dẫn & Prompt Gemini
          </button>
          <button className="btn" onClick={() => navigate('#/library')}>
            <FolderUp size={15} /> Nạp gói .json
          </button>
        </div>
      </motion.section>

      {/* Personal Gamification: Tree + Streak */}
      <section className="grid-2">
        <motion.div
          className="card stack-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.3 }}
        >
          <div className="flex-between">
            <div>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Cây phát triển chuyên môn
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem' }}>
                {treeInfo.current.emoji} {treeInfo.current.name}
              </h2>
            </div>
            <span className="badge badge-accent mono">{state.xp} XP</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${treeInfo.progressPct}%` }} />
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            {treeInfo.isMax
              ? 'Bạn đã đạt giai đoạn tối đa Kết trái!'
              : `Còn ${treeInfo.remainingXp} XP để đạt ${treeInfo.nextStage?.name} · ${treeInfo.progressPct}%`}
          </div>

          <div className="tree-stages">
            {TREE_STAGES.map((st) => (
              <div
                key={st.stage}
                className={`tree-node ${state.xp >= st.minXp ? 'reached' : ''}`}
              >
                <div style={{ fontSize: '1.1rem' }}>{st.emoji}</div>
                <div>{st.name.replace(/^\d+\s/, '')}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="card stack-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
        >
          <div className="flex-between">
            <div>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Chuỗi ngày học & Mục tiêu ngày
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Flame size={20} style={{ color: '#f97316' }} />
                {state.streakDays} ngày liên tiếp
              </h2>
            </div>
            <span className="badge">
              Hôm nay: {todayXp} / {prefs.reminder.dailyGoalXp} XP
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, Math.round((todayXp / Math.max(1, prefs.reminder.dailyGoalXp)) * 100))}%`,
              }}
            />
          </div>

          <div className="week-grid">
            {weekDates.map((iso, i) => {
              const done = activitySet.has(iso);
              const isToday = iso === getTodayIso();
              return (
                <div
                  key={iso}
                  className={`week-day ${done ? 'done' : ''}`}
                  style={isToday ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}
                >
                  <div>{WEEK_LABELS[i]}</div>
                  <div style={{ fontSize: '0.7rem', marginTop: 2 }}>{done ? '✓' : '·'}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Quick Stats Cards */}
      <section className="grid-3">
        <motion.div
          whileHover={{ y: -3 }}
          className="card card-interactive stack-sm"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('#/lessons')}
        >
          <div className="flex-between">
            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
            <span className="badge badge-accent">{lessons.length} gói bài</span>
          </div>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>Thư viện CĐHA & DSA</h3>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Hoàn thành {completedSkillsTotal}/{totalSkillsPossible} thẻ kỹ năng across {subspecialties.length} phân môn.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="card card-interactive stack-sm"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('#/review')}
        >
          <div className="flex-between">
            <Layers size={20} style={{ color: 'var(--accent)' }} />
            <span className={`badge ${dueCount > 0 ? 'badge-danger' : 'badge-success'}`}>
              {dueCount} thẻ tới hạn
            </span>
          </div>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>Ôn tập SRS (SM-2)</h3>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Tổng {state.srs.cards.length} thẻ thuật ngữ y khoa đang theo dõi lịch lặp lại ngắt quãng.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="card card-interactive stack-sm"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('#/mastered')}
        >
          <div className="flex-between">
            <Award size={20} style={{ color: 'var(--accent)' }} />
            <span className="badge badge-success">{masteredCount} thuật ngữ</span>
          </div>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>Mastered Bank</h3>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Kho thuật ngữ đã thuộc kèm IPA, gốc từ Hy Lạp/Latinh (<code className="mono">wordRoot</code>) và đầu sách nguồn.
          </p>
        </motion.div>
      </section>
    </div>
  );
};
