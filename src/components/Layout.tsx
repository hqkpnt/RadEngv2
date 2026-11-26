import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  FolderUp,
  HelpCircle,
  Home,
  Layers,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getRankedNaturalVoices, RankedVoice } from '../utils/speech';
import { getTodayIso } from '../utils/storage';
import { WorkflowGuideModal } from './WorkflowGuideModal';

export type RouteKey = 'home' | 'lessons' | 'lesson' | 'review' | 'mastered' | 'library';

interface LayoutProps {
  currentRoute: RouteKey;
  navigate: (hash: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentRoute, navigate, children }) => {
  const {
    prefs,
    state,
    dueCount,
    setGuideOpen,
    updatePrefs,
    updateReminder,
    toast,
  } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voices, setVoices] = useState<RankedVoice[]>([]);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshVoices = () => setVoices(getRankedNaturalVoices(prefs.ttsVoice).slice(0, 12));
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }, [prefs.ttsVoice]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [settingsOpen]);

  const todayXp = state.dailyXpLog[getTodayIso()] || 0;
  const showReminderBanner =
    prefs.reminder.enabled && todayXp < prefs.reminder.dailyGoalXp;

  const navItems: Array<{
    key: RouteKey;
    hash: string;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { key: 'home', hash: '#/home', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: <Home size={17} /> },
    { key: 'lessons', hash: '#/lessons', label: 'Bài học', shortLabel: 'Bài học', icon: <BookOpen size={17} /> },
    { key: 'review', hash: '#/review', label: 'Ôn tập SRS', shortLabel: 'Ôn tập', icon: <Layers size={17} />, badge: dueCount },
    { key: 'mastered', hash: '#/mastered', label: 'Từ đã thuộc', shortLabel: 'Đã thuộc', icon: <Award size={17} /> },
    { key: 'library', hash: '#/library', label: 'Nạp & Dữ liệu', shortLabel: 'Thư viện', icon: <FolderUp size={17} /> },
  ];

  const isNavActive = (key: RouteKey) =>
    currentRoute === key || (key === 'lessons' && currentRoute === 'lesson');

  return (
    <>
      <div className="ambient-canvas" aria-hidden="true" />
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <button
              className="brand-btn"
              onClick={() => navigate('#/home')}
              aria-label="Về trang tổng quan"
            >
              <div className="brand-mark">
                <Activity size={19} />
              </div>
              <div>
                <div className="brand-title">RadEng v4.0</div>
                <div className="brand-sub">CĐHA & Điện quang can thiệp</div>
              </div>
            </button>

            <nav className="desktop-nav" aria-label="Điều hướng chính">
              {navItems.map((item) => {
                const active = isNavActive(item.key);
                return (
                  <button
                    key={item.key}
                    className={`nav-link ${active ? 'active' : ''}`}
                    onClick={() => navigate(item.hash)}
                  >
                    {active && (
                      <motion.span
                        layoutId="desktopNavPill"
                        className="nav-pill-bg"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="due-badge" aria-label={`${item.badge} thẻ tới hạn`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="header-actions" ref={popRef}>
              <button
                className="btn btn-sm btn-soft"
                onClick={() => setGuideOpen(true)}
                title="Quy trình quản lý bài học, đồng bộ & Prompt Gemini"
              >
                <HelpCircle size={15} />
                <span>Hướng dẫn & Prompt</span>
              </button>

              <button
                className="btn btn-icon"
                title="Chuyển nhanh Sáng / Tối"
                aria-label="Đổi giao diện sáng tối"
                onClick={() =>
                  updatePrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })
                }
              >
                {prefs.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <button
                className={`btn btn-icon ${settingsOpen ? 'btn-soft' : ''}`}
                title="Cài đặt hiển thị, giọng đọc & nhắc học"
                aria-label="Mở cài đặt hiển thị"
                onClick={() => setSettingsOpen((s) => !s)}
              >
                <Settings size={17} />
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    className="popover stack-md"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="flex-between">
                      <strong style={{ fontSize: '0.92rem' }}>Hiển thị & Giọng đọc</strong>
                      <span className="badge badge-accent">Liquid Glass</span>
                    </div>

                    <div className="stack-sm">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        GIAO DIỆN
                      </span>
                      <div className="segmented">
                        {(
                          [
                            ['light', 'Sáng'],
                            ['dark', 'Tối'],
                            ['system', 'Theo máy'],
                          ] as const
                        ).map(([val, lbl]) => (
                          <button
                            key={val}
                            className={prefs.theme === val ? 'active' : ''}
                            onClick={() => updatePrefs({ theme: val })}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="stack-sm">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        CỠ CHỮ
                      </span>
                      <div className="segmented">
                        {(
                          [
                            ['small', 'Nhỏ'],
                            ['medium', 'Vừa'],
                            ['large', 'Lớn'],
                          ] as const
                        ).map(([val, lbl]) => (
                          <button
                            key={val}
                            className={prefs.fontSize === val ? 'active' : ''}
                            onClick={() => updatePrefs({ fontSize: val })}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="stack-sm">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        PHONG CÁCH THUYẾT MINH LISTENING
                      </span>
                      <div className="segmented">
                        <button
                          className={prefs.narrationStyle === 'discovery' ? 'active' : ''}
                          onClick={() => updatePrefs({ narrationStyle: 'discovery' })}
                        >
                          Discovery (Nhấn nhá)
                        </button>
                        <button
                          className={prefs.narrationStyle === 'standard' ? 'active' : ''}
                          onClick={() => updatePrefs({ narrationStyle: 'standard' })}
                        >
                          Đọc chuẩn
                        </button>
                      </div>
                      <select
                        className="select"
                        style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                        value={prefs.ttsVoiceName}
                        onChange={(e) => updatePrefs({ ttsVoiceName: e.target.value })}
                      >
                        <option value="">Tự động chọn giọng tự nhiên nhất</option>
                        {voices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex-row">
                        <div className="segmented" style={{ flex: 1 }}>
                          <button
                            className={prefs.ttsVoice === 'en-US' ? 'active' : ''}
                            onClick={() => updatePrefs({ ttsVoice: 'en-US', ttsVoiceName: '' })}
                          >
                            Anh-Mỹ
                          </button>
                          <button
                            className={prefs.ttsVoice === 'en-GB' ? 'active' : ''}
                            onClick={() => updatePrefs({ ttsVoice: 'en-GB', ttsVoiceName: '' })}
                          >
                            Anh-Anh
                          </button>
                        </div>
                        <select
                          className="select"
                          style={{ width: 84, padding: '6px 8px', fontSize: '0.82rem' }}
                          value={prefs.ttsRate}
                          onChange={(e) => updatePrefs({ ttsRate: Number(e.target.value) })}
                        >
                          <option value={0.8}>0.8x</option>
                          <option value={0.9}>0.9x</option>
                          <option value={0.95}>0.95x</option>
                          <option value={1.0}>1.0x</option>
                          <option value={1.15}>1.15x</option>
                        </select>
                      </div>
                    </div>

                    <div className="card-subtle stack-sm">
                      <label className="flex-between" style={{ cursor: 'pointer', fontSize: '0.84rem' }}>
                        <span className="flex-row" style={{ gap: 6 }}>
                          <Bell size={14} /> Nhắc học hằng ngày
                        </span>
                        <input
                          type="checkbox"
                          checked={prefs.reminder.enabled}
                          onChange={(e) => updateReminder({ enabled: e.target.checked })}
                        />
                      </label>
                      {prefs.reminder.enabled && (
                        <div className="flex-row" style={{ fontSize: '0.8rem' }}>
                          <input
                            type="time"
                            className="input"
                            style={{ padding: '5px 8px' }}
                            value={prefs.reminder.time}
                            onChange={(e) => updateReminder({ time: e.target.value })}
                          />
                          <input
                            type="number"
                            min={10}
                            max={500}
                            step={10}
                            className="input"
                            style={{ padding: '5px 8px' }}
                            value={prefs.reminder.dailyGoalXp}
                            onChange={(e) =>
                              updateReminder({
                                dailyGoalXp: Math.max(10, Number(e.target.value) || 50),
                              })
                            }
                          />
                          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>XP</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {showReminderBanner && (
          <div className="reminder-banner">
            <div
              style={{
                maxWidth: 1280,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span>
                <Bell size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Mục tiêu CĐHA & DSA hôm nay:{' '}
                <strong>
                  {todayXp} / {prefs.reminder.dailyGoalXp} XP
                </strong>{' '}
                · Nhắc lúc {prefs.reminder.time}
              </span>
              <button className="btn btn-sm btn-primary" onClick={() => navigate('#/lessons')}>
                Học ngay
              </button>
            </div>
          </div>
        )}

        <main className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="app-footer">
          <div className="footer-inner">
            <span>
              <strong>RadEng v4.0</strong> · Cùng học tiếng Anh chuyên ngành CĐHA và DSA với mình nhé!
            </span>
            <div className="flex-row">
              <button className="btn btn-sm" onClick={() => setGuideOpen(true)}>
                Hướng dẫn & Prompt Gemini
              </button>
              <button className="btn btn-sm btn-soft" onClick={() => navigate('#/library')}>
                Nạp .json / Sao lưu
              </button>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`mobile-nav-item ${isNavActive(item.key) ? 'active' : ''}`}
              onClick={() => navigate(item.hash)}
            >
              {item.icon}
              <span>{item.shortLabel}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="due-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <WorkflowGuideModal />

        <AnimatePresence>
          {toast && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'fixed',
                bottom: 76,
                right: 20,
                zIndex: 90,
                background: 'var(--text)',
                color: 'var(--bg)',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '0.86rem',
                fontWeight: 600,
                maxWidth: 'calc(100vw - 32px)',
              }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
