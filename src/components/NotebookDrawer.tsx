import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Search, Volume2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { speakText } from '../utils/speech';

interface NotebookDrawerProps {
  open: boolean;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  open,
  lessonId,
  lessonTitle,
  onClose,
}) => {
  const { state, lessons, prefs, saveNotebook } = useApp();
  const [query, setQuery] = useState('');

  const searchableTerms = useMemo(() => {
    const map = new Map<string, { term: string; ipa: string; meaningVi: string; wordRoot: string }>();
    lessons.forEach((l) => {
      l.vocabulary.forEach((v) => {
        if (!map.has(v.termKey)) {
          map.set(v.termKey, {
            term: v.term,
            ipa: v.ipa,
            meaningVi: v.meaningVi,
            wordRoot: v.wordRoot,
          });
        }
      });
      l.reading.glossary.forEach((g) => {
        if (!map.has(g.termKey)) {
          map.set(g.termKey, {
            term: g.term,
            ipa: g.ipa,
            meaningVi: g.meaningVi,
            wordRoot: g.wordRoot,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [lessons]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchableTerms.slice(0, 6);
    return searchableTerms
      .filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.meaningVi.toLowerCase().includes(q) ||
          t.wordRoot.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [query, searchableTerms]);

  const noteValue = state.notebooks[lessonId] || '';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Sổ tay học tập"
          >
            <div className="flex-between">
              <div className="flex-row">
                <BookMarked size={18} style={{ color: 'var(--accent)' }} />
                <strong>Sổ tay bài học</strong>
              </div>
              <button className="btn btn-icon btn-sm" onClick={onClose} aria-label="Đóng sổ tay">
                <X size={16} />
              </button>
            </div>

            <div className="stack-sm">
              <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Ghi chú: {lessonTitle}</span>
                <span className="badge badge-success">Đã lưu trên thiết bị</span>
              </div>
              <textarea
                className="textarea"
                style={{ minHeight: 160 }}
                placeholder="Ghi lại cấu trúc tường trình DSA, lưu ý đọc phim CT/MRI..."
                value={noteValue}
                onChange={(e) => saveNotebook(lessonId, e.target.value)}
              />
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            <div className="stack-sm" style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.88rem' }}>
                Tra nhanh thuật ngữ CĐHA & DSA ({searchableTerms.length})
              </strong>
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
                  placeholder="Tìm thuật ngữ, nghĩa Việt, gốc từ..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="stack-sm" style={{ overflowY: 'auto' }}>
                {matches.map((item) => (
                  <div key={item.term} className="card-subtle" style={{ padding: '10px 12px' }}>
                    <div className="flex-between">
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{item.term}</strong>{' '}
                        {item.ipa && (
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {item.ipa}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-icon"
                        title="Nghe phát âm"
                        onClick={() =>
                          speakText(item.term, prefs.ttsRate, prefs.ttsVoice, {
                            voiceName: prefs.ttsVoiceName,
                          })
                        }
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: 3 }}>{item.meaningVi}</div>
                    {item.wordRoot && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Gốc từ: {item.wordRoot}
                      </div>
                    )}
                  </div>
                ))}
                {matches.length === 0 && (
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center', padding: 14 }}>
                    Không tìm thấy thuật ngữ phù hợp.
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
