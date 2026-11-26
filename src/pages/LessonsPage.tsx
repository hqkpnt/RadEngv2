import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Edit3,
  FolderUp,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SKILL_LABELS, SkillKey } from '../types/schema';

interface LessonsPageProps {
  navigate: (hash: string) => void;
}

const SKILLS_ORDER: SkillKey[] = [
  'vocabulary',
  'grammar',
  'listening',
  'reading',
  'writing',
  'speaking',
];

export const LessonsPage: React.FC<LessonsPageProps> = ({ navigate }) => {
  const {
    lessons,
    state,
    subspecialties,
    getSubspecialtyLabel,
    addSubspecialty,
    renameSubspecialty,
    deleteSubspecialty,
  } = useApp();

  const [query, setQuery] = useState('');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  // Dynamic subspecialty manager state
  const [manageOpen, setManageOpen] = useState(false);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubLabel, setEditingSubLabel] = useState('');

  const sourceBooks = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.meta.sourceBook) set.add(l.meta.sourceBook);
    });
    return Array.from(set).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => {
      if (subFilter !== 'all' && l.meta.subspecialty !== subFilter) return false;
      if (bookFilter !== 'all' && l.meta.sourceBook !== bookFilter) return false;

      const prog = state.lessonProgress[l.id];
      const doneCount = prog
        ? Object.values(prog.skillsCompleted).filter(Boolean).length
        : 0;
      if (statusFilter === 'todo' && doneCount > 0) return false;
      if (statusFilter === 'in_progress' && (doneCount === 0 || doneCount === 6)) return false;
      if (statusFilter === 'done' && doneCount < 6) return false;

      if (q) {
        const vocabText = l.vocabulary.map((v) => `${v.term} ${v.meaningVi}`).join(' ');
        const hay = `${l.meta.title} ${l.meta.titleVi} ${l.meta.sourceBook} ${getSubspecialtyLabel(l.meta.subspecialty)} ${l.meta.tags.join(' ')} ${vocabText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, subFilter, bookFilter, statusFilter, query, state.lessonProgress, getSubspecialtyLabel]);

  return (
    <div className="split-layout">
      {/* Sidebar Filters + Dynamic Subspecialty Manager */}
      <aside className="card stack-md">
        <div className="flex-between">
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Bộ lọc CĐHA & DSA</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {filtered.length} / {lessons.length} gói bài học
            </div>
          </div>
          <button
            className={`btn btn-sm ${manageOpen ? 'btn-primary' : 'btn-soft'}`}
            onClick={() => setManageOpen((v) => !v)}
            title="Thêm, sửa, xóa nhãn phân môn"
          >
            <Settings2 size={14} /> {manageOpen ? 'Xong' : 'Sửa nhãn'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Tìm bài học, thuật ngữ, sách..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Subspecialty Filter or Manager */}
        <div className="stack-sm">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            PHÂN MÔN CHUYÊN KHOA ({subspecialties.length})
          </span>

          {!manageOpen ? (
            <div className="chip-list">
              <button
                className={`chip ${subFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSubFilter('all')}
              >
                Tất cả
              </button>
              {subspecialties.map((sub) => (
                <button
                  key={sub.id}
                  className={`chip ${subFilter === sub.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="card-subtle stack-sm">
              {subspecialties.map((sub) => (
                <div key={sub.id} className="flex-between" style={{ gap: 5 }}>
                  {editingSubId === sub.id ? (
                    <form
                      className="flex-row"
                      style={{ flex: 1, gap: 5 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingSubLabel.trim()) {
                          renameSubspecialty(sub.id, editingSubLabel);
                        }
                        setEditingSubId(null);
                      }}
                    >
                      <input
                        className="input"
                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                        value={editingSubLabel}
                        onChange={(e) => setEditingSubLabel(e.target.value)}
                      />
                      <button type="submit" className="btn btn-sm btn-primary btn-icon" style={{ width: 28, height: 28 }}>
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-icon"
                        style={{ width: 28, height: 28 }}
                        onClick={() => setEditingSubId(null)}
                      >
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.84rem', fontWeight: 500, flex: 1 }}>{sub.label}</span>
                      <button
                        className="btn btn-sm btn-icon"
                        style={{ width: 28, height: 28 }}
                        title="Đổi tên nhãn"
                        onClick={() => {
                          setEditingSubId(sub.id);
                          setEditingSubLabel(sub.label);
                        }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        style={{ width: 28, height: 28 }}
                        title="Xóa nhãn phân môn"
                        disabled={subspecialties.length <= 1}
                        onClick={() => {
                          deleteSubspecialty(sub.id);
                          if (subFilter === sub.id) setSubFilter('all');
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}

              <form
                className="flex-row"
                style={{ gap: 6, marginTop: 4 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSubLabel.trim()) return;
                  addSubspecialty(newSubLabel);
                  setNewSubLabel('');
                }}
              >
                <input
                  className="input"
                  style={{ padding: '6px 9px', fontSize: '0.82rem' }}
                  placeholder="Tên phân môn mới (VD: DSA Tim mạch)..."
                  value={newSubLabel}
                  onChange={(e) => setNewSubLabel(e.target.value)}
                />
                <button type="submit" className="btn btn-sm btn-primary" title="Thêm nhãn">
                  <Plus size={14} /> Thêm
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="stack-sm">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            TÊN SÁCH NGUỒN
          </span>
          <select
            className="select"
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
          >
            <option value="all">Tất cả sách nguồn ({sourceBooks.length})</option>
            {sourceBooks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="stack-sm">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            TRẠNG THÁI
          </span>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="todo">Chưa bắt đầu</option>
            <option value="in_progress">Đang học</option>
            <option value="done">Hoàn thành đủ 6 kỹ năng</option>
          </select>
        </div>

        <button className="btn btn-soft" onClick={() => navigate('#/library')}>
          <FolderUp size={15} /> + Nạp thêm bài .json
        </button>
      </aside>

      {/* Lessons List */}
      <section className="stack-md">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Thư viện Bài học CĐHA & DSA</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Mỗi gói bài học chuẩn hóa đầy đủ 6 kỹ năng: Vocabulary · Grammar · Listening · Reading · Writing · Speaking.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}>
            <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>
              Chưa có gói bài học nào khớp với bộ lọc hiện tại.
            </p>
            <div className="flex-row" style={{ justifyContent: 'center' }}>
              <button
                className="btn"
                onClick={() => {
                  setQuery('');
                  setSubFilter('all');
                  setBookFilter('all');
                  setStatusFilter('all');
                }}
              >
                Xóa bộ lọc
              </button>
              <button className="btn btn-primary" onClick={() => navigate('#/library')}>
                Nạp gói bài .json
              </button>
            </div>
          </div>
        ) : (
          <div className="stack-md">
            {filtered.map((lesson, idx) => {
              const prog = state.lessonProgress[lesson.id];
              const doneSkills = prog
                ? SKILLS_ORDER.filter((k) => prog.skillsCompleted[k]).length
                : 0;
              return (
                <motion.article
                  key={lesson.id}
                  className="card card-interactive stack-sm"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                >
                  <div className="flex-between flex-wrap">
                    <div className="flex-row flex-wrap" style={{ gap: 6 }}>
                      <span className="badge badge-accent">{lesson.meta.level}</span>
                      <span className="badge">
                        {getSubspecialtyLabel(lesson.meta.subspecialty)}
                      </span>
                      {lesson.meta.sourceBook && (
                        <span className="badge" title="Sách nguồn">
                          📖 {lesson.meta.sourceBook}
                        </span>
                      )}
                      {!lesson.builtIn && <span className="badge badge-warning">Tự nạp (.json)</span>}
                    </div>
                    <div className="flex-row" style={{ gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span className="flex-row" style={{ gap: 4 }}>
                        <Clock size={14} /> ~{lesson.meta.estimatedMinutes}p
                      </span>
                      {prog && prog.stars > 0 && (
                        <span className="badge badge-warning">
                          <Star size={12} fill="currentColor" /> {prog.stars}★
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 style={{ margin: '2px 0', fontSize: '1.16rem' }}>{lesson.meta.title}</h2>
                    {lesson.meta.titleVi && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {lesson.meta.titleVi}
                      </div>
                    )}
                  </div>

                  <div className="flex-between flex-wrap" style={{ marginTop: 6 }}>
                    <div className="flex-row flex-wrap" style={{ gap: 6 }}>
                      {SKILLS_ORDER.map((sk) => {
                        const isDone = Boolean(prog?.skillsCompleted[sk]);
                        return (
                          <span
                            key={sk}
                            className={`badge ${isDone ? 'badge-success' : ''}`}
                            title={SKILL_LABELS[sk].label}
                          >
                            <span className={`skill-dot ${isDone ? 'done' : ''}`} />
                            {SKILL_LABELS[sk].label}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`#/lesson/${encodeURIComponent(lesson.id)}`)}
                    >
                      {doneSkills > 0 ? `Tiếp tục (${doneSkills}/6)` : 'Vào học 6 kỹ năng'}{' '}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
