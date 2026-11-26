import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  Clock,
  Layers,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';
import {
  comparePronunciation,
  PronunciationResult,
  speakText,
  startOfflineAudioRecording,
  startSpeechRecognition,
} from '../../utils/speech';

interface VocabularyTabProps {
  lesson: LessonPack;
  timedMode: boolean;
}

export const VocabularyTab: React.FC<VocabularyTabProps> = ({ lesson, timedMode }) => {
  const {
    state,
    prefs,
    toggleMastered,
    addCardToSrs,
    addLessonVocab,
    removeLessonVocab,
    markSkillComplete,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'list' | 'flashcard' | 'drill'>('list');

  // Manual add card modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newPos, setNewPos] = useState('noun phrase');
  const [newRoot, setNewRoot] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newExEn, setNewExEn] = useState('');
  const [newExVi, setNewExVi] = useState('');
  const [alsoSrs, setAlsoSrs] = useState(true);

  // Flashcard state
  const [fcIdx, setFcIdx] = useState(0);
  const [fcFrontLang, setFcFrontLang] = useState<'en' | 'vi'>('en');
  const [flipped, setFlipped] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);

  // Pronunciation state (resilient: SpeechRecognition + offline MediaRecorder fallback)
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  const [offlineFallbackKey, setOfflineFallbackKey] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [stopRecFn, setStopRecFn] = useState<(() => void) | null>(null);
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({});
  const [pronResults, setPronResults] = useState<Record<string, PronunciationResult>>({});

  // Timed Drill state
  const [drillIdx, setDrillIdx] = useState(0);
  const [drillScore, setDrillScore] = useState(0);
  const [drillSelected, setDrillSelected] = useState<string | null>(null);
  const [drillFinished, setDrillFinished] = useState(false);
  const [secLeft, setSecLeft] = useState(15);

  const items = lesson.vocabulary;
  const safeFcIdx = Math.min(fcIdx, Math.max(0, items.length - 1));
  const currentCard = items[safeFcIdx];

  useEffect(() => {
    if (mode !== 'flashcard' || !currentCard || addModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        speakText(currentCard.term, prefs.ttsRate, prefs.ttsVoice, {
          voiceName: prefs.ttsVoiceName,
          style: prefs.narrationStyle,
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, currentCard, addModalOpen, prefs]);

  const drillQuestions = useMemo(() => {
    return items.map((item) => {
      const distractors = items
        .filter((other) => other.termKey !== item.termKey)
        .map((o) => o.meaningVi)
        .slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`Thuật ngữ đối chiếu #${distractors.length + 1}`);
      }
      const opts = [item.meaningVi, ...distractors].sort((a, b) => a.localeCompare(b));
      return { item, options: opts };
    });
  }, [items]);

  useEffect(() => {
    if (mode !== 'drill' || drillFinished || drillSelected !== null) return;
    if (secLeft <= 0) {
      setDrillSelected('__timeout__');
      return;
    }
    const id = window.setInterval(() => setSecLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [mode, drillFinished, drillSelected, secLeft]);

  const handlePronounce = (termKey: string, term: string) => {
    setListeningKey(termKey);
    startSpeechRecognition(prefs.ttsVoice, {
      onResult: (transcript) => {
        setPronResults((prev) => ({
          ...prev,
          [termKey]: comparePronunciation(term, transcript),
        }));
      },
      onNetworkError: () => {
        setListeningKey(null);
        setOfflineFallbackKey(termKey);
        showToast('Đã chuyển sang Ghi âm cục bộ (Offline) do trình duyệt không kết nối máy chủ Speech.');
      },
      onError: (msg) => showToast(msg),
      onEnd: () => setListeningKey(null),
    });
  };

  const handleOfflineRecord = async (termKey: string) => {
    if (recordingKey === termKey && stopRecFn) {
      stopRecFn();
      setRecordingKey(null);
      setStopRecFn(null);
      return;
    }
    setRecordingKey(termKey);
    const stop = await startOfflineAudioRecording({
      onStop: (url) => {
        setRecordedUrls((prev) => ({ ...prev, [termKey]: url }));
        showToast('Đã ghi âm xong! Nhấn Play để nghe lại giọng đọc của bạn.');
      },
      onError: (msg) => {
        setRecordingKey(null);
        showToast(msg);
      },
    });
    setStopRecFn(() => stop);
  };

  const handleSaveManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newMeaning.trim()) {
      showToast('Vui lòng nhập ít nhất Thuật ngữ tiếng Anh và Nghĩa tiếng Việt.');
      return;
    }
    addLessonVocab(
      lesson.id,
      {
        termKey: '',
        term: newTerm,
        meaningVi: newMeaning,
        ipa: newIpa,
        pos: newPos,
        wordRoot: newRoot,
        noteVi: newNote,
        exampleEn: newExEn,
        exampleVi: newExVi,
      },
      alsoSrs
    );
    setNewTerm('');
    setNewMeaning('');
    setNewIpa('');
    setNewRoot('');
    setNewNote('');
    setNewExEn('');
    setNewExVi('');
    setAddModalOpen(false);
  };

  const handleFlashcardDecision = (remembered: boolean) => {
    if (!currentCard) return;
    if (!remembered) {
      addCardToSrs({
        front: currentCard.term,
        meaning: currentCard.meaningVi,
        ipa: currentCard.ipa,
        wordRoot: currentCard.wordRoot,
        termKey: currentCard.termKey,
        source: 'lesson',
        lessonId: lesson.id,
      });
    }
    const nextSeen = seenIds.includes(currentCard.termKey)
      ? seenIds
      : [...seenIds, currentCard.termKey];
    setSeenIds(nextSeen);
    setFlipped(false);

    if (safeFcIdx + 1 < items.length) {
      setFcIdx(safeFcIdx + 1);
    } else {
      markSkillComplete(lesson.id, 'vocabulary', 20);
      showToast('Bạn đã xem hết toàn bộ thẻ từ vựng của bài! (+20 XP)');
      setFcIdx(0);
    }
  };

  return (
    <div className="stack-md">
      {/* Sub-mode switch + Manual Add Flashcard CTA */}
      <div className="flex-between flex-wrap">
        <div className="segmented" style={{ maxWidth: 420 }}>
          <button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>
            Chi tiết ({items.length})
          </button>
          <button
            className={mode === 'flashcard' ? 'active' : ''}
            onClick={() => {
              setMode('flashcard');
              setFlipped(false);
            }}
          >
            Học Flashcard
          </button>
          <button
            className={mode === 'drill' ? 'active' : ''}
            onClick={() => {
              setMode('drill');
              setDrillIdx(0);
              setDrillScore(0);
              setDrillSelected(null);
              setDrillFinished(false);
              setSecLeft(timedMode ? 12 : 20);
            }}
          >
            Luyện tập tính giờ
          </button>
        </div>

        <div className="flex-row flex-wrap">
          <button className="btn btn-sm btn-primary" onClick={() => setAddModalOpen(true)}>
            <Plus size={15} /> Thêm thẻ thủ công
          </button>
          <button
            className="btn btn-sm btn-soft"
            onClick={() => {
              markSkillComplete(lesson.id, 'vocabulary', 20);
              showToast('Đã đánh dấu hoàn thành Vocabulary (+20 XP)');
            }}
          >
            <CheckCircle2 size={15} /> Hoàn thành Vocabulary
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>
            Bài học này chưa có thẻ từ vựng nào. Bạn có thể bấm <strong>+ Thêm thẻ thủ công</strong> ngay bây giờ!
          </p>
          <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
            <Plus size={15} /> Thêm thẻ đầu tiên
          </button>
        </div>
      ) : (
        <>
          {/* Mode 1: Detailed RadEng Vocabulary Cards */}
          {mode === 'list' && (
            <div className="grid-2">
              {items.map((item) => {
                const isMastered = Boolean(state.masteredBank[item.termKey]);
                const pr = pronResults[item.termKey];
                const recUrl = recordedUrls[item.termKey];
                const showOfflineRec = offlineFallbackKey === item.termKey || Boolean(recUrl);
                return (
                  <motion.div
                    key={item.termKey}
                    layout
                    className="card stack-sm"
                  >
                    <div className="flex-between flex-wrap">
                      <div>
                        <strong style={{ fontSize: '1.12rem', color: 'var(--accent)' }}>{item.term}</strong>
                        {item.ipa && (
                          <span className="mono" style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                            {item.ipa}
                          </span>
                        )}
                      </div>
                      <div className="flex-row" style={{ gap: 5 }}>
                        {item.isCustom && <span className="badge badge-warning">Tự thêm</span>}
                        <span className="badge">{item.pos}</span>
                        <span className="badge mono" style={{ fontSize: '0.7rem' }}>
                          {item.termKey}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{item.meaningVi}</div>

                    {item.wordRoot && (
                      <div className="card-subtle" style={{ padding: '8px 10px', fontSize: '0.83rem' }}>
                        <strong>Gốc từ (wordRoot):</strong> {item.wordRoot}
                      </div>
                    )}

                    {item.noteVi && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        💡 {item.noteVi}
                      </div>
                    )}

                    {item.exampleEn && (
                      <div style={{ borderLeft: '3px solid var(--accent-border)', paddingLeft: 10 }}>
                        <div style={{ fontSize: '0.9rem' }}>{item.exampleEn}</div>
                        {item.exampleVi && (
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.exampleVi}
                          </div>
                        )}
                      </div>
                    )}

                    {pr && (
                      <div className="token-strip" style={{ padding: '8px 10px' }}>
                        <span className={`badge ${pr.accuracy >= 80 ? 'badge-success' : 'badge-warning'}`}>
                          Khớp {pr.accuracy}%
                        </span>
                        {pr.tokens.map((t, i) => (
                          <span key={i} className={`tok ${t.matched ? 'tok-correct' : 'tok-wrong'}`}>
                            {t.word}
                          </span>
                        ))}
                      </div>
                    )}

                    {showOfflineRec && (
                      <div className="card-subtle stack-sm" style={{ padding: '8px 10px' }}>
                        <div className="flex-between flex-wrap" style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Chế độ Ghi âm cục bộ (Offline — không cần cloud):
                          </span>
                          <button
                            className={`btn btn-sm ${recordingKey === item.termKey ? 'btn-danger' : 'btn-soft'}`}
                            onClick={() => handleOfflineRecord(item.termKey)}
                          >
                            {recordingKey === item.termKey ? <Square size={12} /> : <Mic size={13} />}
                            {recordingKey === item.termKey ? 'Dừng ghi' : 'Ghi âm giọng đọc'}
                          </button>
                        </div>
                        {recUrl && <audio controls src={recUrl} style={{ width: '100%', height: 34 }} />}
                      </div>
                    )}

                    <div className="flex-row flex-wrap" style={{ marginTop: 4 }}>
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() =>
                          speakText(item.term, prefs.ttsRate, prefs.ttsVoice, {
                            voiceName: prefs.ttsVoiceName,
                            style: prefs.narrationStyle,
                          })
                        }
                      >
                        <Volume2 size={14} /> Nghe
                      </button>
                      <button
                        className={`btn btn-sm ${listeningKey === item.termKey ? 'btn-danger' : ''}`}
                        onClick={() => handlePronounce(item.termKey, item.term)}
                      >
                        <Mic size={14} /> {listeningKey === item.termKey ? 'Đang nghe...' : 'Phát âm'}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          addCardToSrs({
                            front: item.term,
                            meaning: item.meaningVi,
                            ipa: item.ipa,
                            wordRoot: item.wordRoot,
                            termKey: item.termKey,
                            source: 'lesson',
                            lessonId: lesson.id,
                          })
                        }
                      >
                        <Layers size={14} /> + Ôn tập
                      </button>
                      <button
                        className={`btn btn-sm ${isMastered ? 'btn-success' : ''}`}
                        onClick={() => toggleMastered(lesson, item)}
                      >
                        <Award size={14} /> {isMastered ? 'Đã thuộc ✓' : 'Đánh dấu thuộc'}
                      </button>
                      {item.isCustom && (
                        <button
                          className="btn btn-sm btn-danger"
                          title="Xóa thẻ tự thêm"
                          onClick={() => removeLessonVocab(lesson.id, item.termKey)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Mode 2: Flashcard Study */}
          {mode === 'flashcard' && currentCard && (
            <div className="stack-md" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
              <div className="flex-between flex-wrap">
                <span className="badge badge-accent">
                  Thẻ {safeFcIdx + 1} / {items.length} · Đã xem {seenIds.length}/{items.length}
                </span>
                <div className="flex-row">
                  <div className="segmented">
                    <button
                      className={fcFrontLang === 'en' ? 'active' : ''}
                      onClick={() => {
                        setFcFrontLang('en');
                        setFlipped(false);
                      }}
                    >
                      Mặt trước: Anh
                    </button>
                    <button
                      className={fcFrontLang === 'vi' ? 'active' : ''}
                      onClick={() => {
                        setFcFrontLang('vi');
                        setFlipped(false);
                      }}
                    >
                      Mặt trước: Việt
                    </button>
                  </div>
                  <button
                    className="btn btn-sm btn-icon"
                    title="Phóng to thẻ"
                    onClick={() => setZoomed((z) => !z)}
                  >
                    {zoomed ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                </div>
              </div>

              <motion.div
                key={`${currentCard.termKey}-${flipped}`}
                initial={{ opacity: 0.65, rotateX: flipped ? -8 : 8, scale: 0.98 }}
                animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className={`flashcard-stage ${zoomed ? 'zoomed' : ''}`}
                onClick={() => setFlipped((f) => !f)}
                role="button"
                tabIndex={0}
              >
                {!flipped ? (
                  <div className="stack-sm" style={{ alignItems: 'center' }}>
                    <span className="badge">
                      {fcFrontLang === 'en' ? 'TIẾNG ANH' : 'NGHĨA TIẾNG VIỆT'}
                    </span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {fcFrontLang === 'en' ? currentCard.term : currentCard.meaningVi}
                    </div>
                    {fcFrontLang === 'en' && currentCard.ipa && (
                      <div className="mono" style={{ color: 'var(--text-muted)' }}>
                        {currentCard.ipa}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
                      Nhấp vào thẻ hoặc bấm phím Space để lật
                    </div>
                  </div>
                ) : (
                  <div className="stack-sm" style={{ alignItems: 'center', maxWidth: 520 }}>
                    <span className="badge badge-success">MẶT SAU</span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                      {fcFrontLang === 'en' ? currentCard.meaningVi : currentCard.term}
                    </div>
                    {currentCard.ipa && (
                      <div className="mono" style={{ color: 'var(--text-muted)' }}>
                        {currentCard.ipa}
                      </div>
                    )}
                    {currentCard.wordRoot && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <strong>Gốc từ:</strong> {currentCard.wordRoot}
                      </div>
                    )}
                    {currentCard.exampleEn && (
                      <div style={{ fontSize: '0.88rem', marginTop: 6 }}>
                        <div>“{currentCard.exampleEn}”</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {currentCard.exampleVi}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              <div className="flex-between flex-wrap">
                <div className="flex-row">
                  <button
                    className="btn btn-sm btn-soft"
                    onClick={() =>
                      speakText(currentCard.term, prefs.ttsRate, prefs.ttsVoice, {
                        voiceName: prefs.ttsVoiceName,
                        style: prefs.narrationStyle,
                      })
                    }
                  >
                    <Volume2 size={14} /> Nghe (A)
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      addCardToSrs({
                        front: currentCard.term,
                        meaning: currentCard.meaningVi,
                        ipa: currentCard.ipa,
                        wordRoot: currentCard.wordRoot,
                        termKey: currentCard.termKey,
                        source: 'lesson',
                        lessonId: lesson.id,
                      })
                    }
                  >
                    <Layers size={14} /> + Ôn tập
                  </button>
                </div>
                <div className="flex-row">
                  <button
                    className="btn btn-danger"
                    disabled={!flipped}
                    onClick={() => handleFlashcardDecision(false)}
                  >
                    Cần ôn
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!flipped}
                    onClick={() => handleFlashcardDecision(true)}
                  >
                    Đã nhớ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Timed Vocabulary Drill */}
          {mode === 'drill' && (
            <div className="card stack-md" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
              {drillFinished ? (
                <div className="stack-md" style={{ textAlign: 'center', padding: 14 }}>
                  <CheckCircle2 size={36} style={{ color: 'var(--success)', margin: '0 auto' }} />
                  <h3 style={{ margin: 0 }}>
                    Kết quả Timed Drill: {drillScore} / {drillQuestions.length} câu đúng
                  </h3>
                  <div className="flex-row" style={{ justifyContent: 'center' }}>
                    <span className="badge badge-warning">
                      {drillScore === drillQuestions.length
                        ? '★★★ Xuất sắc (100%)'
                        : drillScore / drillQuestions.length >= 0.8
                          ? '★★ Tốt (≥80%)'
                          : '★ Cần ôn thêm'}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ margin: '0 auto' }}
                    onClick={() => {
                      setDrillIdx(0);
                      setDrillScore(0);
                      setDrillSelected(null);
                      setDrillFinished(false);
                      setSecLeft(timedMode ? 12 : 20);
                    }}
                  >
                    <RotateCcw size={15} /> Luyện lại
                  </button>
                </div>
              ) : (
                (() => {
                  const q = drillQuestions[drillIdx];
                  const isAnswered = drillSelected !== null;
                  return (
                    <>
                      <div className="flex-between">
                        <span className="badge badge-accent">
                          Câu {drillIdx + 1} / {drillQuestions.length}
                        </span>
                        <span className={`badge mono ${secLeft <= 5 ? 'badge-danger' : ''}`}>
                          <Clock size={13} /> {secLeft}s
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Chọn nghĩa chính xác của thuật ngữ sau:
                        </div>
                        <h2 style={{ margin: '6px 0 0', color: 'var(--accent)' }}>{q.item.term}</h2>
                        {q.item.ipa && (
                          <div className="mono" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            {q.item.ipa}
                          </div>
                        )}
                      </div>
                      <div className="stack-sm">
                        {q.options.map((opt) => {
                          const isCorrect = opt === q.item.meaningVi;
                          const isChosen = drillSelected === opt;
                          let cls = 'quiz-option';
                          if (isAnswered) {
                            if (isCorrect) cls += ' correct';
                            else if (isChosen) cls += ' wrong';
                          }
                          return (
                            <button
                              key={opt}
                              className={cls}
                              disabled={isAnswered}
                              onClick={() => {
                                setDrillSelected(opt);
                                if (isCorrect) setDrillScore((s) => s + 1);
                              }}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="flex-between">
                          <span
                            className={`badge ${
                              drillSelected === q.item.meaningVi ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {drillSelected === q.item.meaningVi
                              ? 'Chính xác!'
                              : drillSelected === '__timeout__'
                                ? 'Hết giờ!'
                                : 'Chưa đúng — xem đáp án màu xanh.'}
                          </span>
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              if (drillIdx + 1 < drillQuestions.length) {
                                setDrillIdx((i) => i + 1);
                                setDrillSelected(null);
                                setSecLeft(timedMode ? 12 : 20);
                              } else {
                                setDrillFinished(true);
                                const finalRatio = drillScore / Math.max(1, drillQuestions.length);
                                const stars = finalRatio === 1 ? 3 : finalRatio >= 0.8 ? 2 : 1;
                                markSkillComplete(lesson.id, 'vocabulary', 30, stars);
                                showToast(`Hoàn thành Vocabulary Timed Drill (${stars}★ · +30 XP)`);
                              }
                            }}
                          >
                            {drillIdx + 1 < drillQuestions.length ? 'Câu tiếp →' : 'Xem kết quả'}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          )}
        </>
      )}

      {/* Manual Flashcard Modal inside Lesson (Portaled to document.body so it always sits above Bottom Nav) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {addModalOpen && (
              <motion.div
                className="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAddModalOpen(false)}
              >
                <motion.form
                  className="modal-box stack-md"
                  initial={{ opacity: 0, scale: 0.94, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={handleSaveManualCard}
                >
                  <div className="flex-between">
                    <h3 style={{ margin: 0 }}>Thêm thẻ Flashcard thủ công vào bài học</h3>
                    <button
                      type="button"
                      className="btn btn-icon btn-sm"
                      onClick={() => setAddModalOpen(false)}
                      aria-label="Đóng"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid-2">
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Thuật ngữ tiếng Anh *</label>
                      <input
                        className="input"
                        required
                        placeholder="VD: vasospasm"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                      />
                    </div>
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nghĩa tiếng Việt *</label>
                      <input
                        className="input"
                        required
                        placeholder="VD: Co thắt mạch máu"
                        value={newMeaning}
                        onChange={(e) => setNewMeaning(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phiên âm IPA</label>
                      <input
                        className="input mono"
                        placeholder="/ˈveɪ.zəʊ.spæz.əm/"
                        value={newIpa}
                        onChange={(e) => setNewIpa(e.target.value)}
                      />
                    </div>
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Từ loại</label>
                      <input
                        className="input"
                        placeholder="noun / verb / phrase"
                        value={newPos}
                        onChange={(e) => setNewPos(e.target.value)}
                      />
                    </div>
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Gốc từ (wordRoot)</label>
                      <input
                        className="input"
                        placeholder="vaso- (mạch) + spasm (co thắt)"
                        value={newRoot}
                        onChange={(e) => setNewRoot(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="stack-sm">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ghi chú lâm sàng (tùy chọn)</label>
                    <input
                      className="input"
                      placeholder="VD: Hay gặp sau xuất huyết dưới nhện hoặc kích thích ống thông..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                  </div>

                  <div className="grid-2">
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ví dụ tiếng Anh</label>
                      <input
                        className="input"
                        placeholder="Mild catheter-induced vasospasm resolved after nimodipine."
                        value={newExEn}
                        onChange={(e) => setNewExEn(e.target.value)}
                      />
                    </div>
                    <div className="stack-sm">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dịch ví dụ tiếng Việt</label>
                      <input
                        className="input"
                        placeholder="Co thắt mạch nhẹ do ống thông đã hết sau dùng nimodipine."
                        value={newExVi}
                        onChange={(e) => setNewExVi(e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="flex-row" style={{ fontSize: '0.86rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={alsoSrs}
                      onChange={(e) => setAlsoSrs(e.target.checked)}
                    />
                    <span>Đồng thời đẩy thẻ này vào hàng ôn tập SRS (SM-2)</span>
                  </label>

                  <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={() => setAddModalOpen(false)}>
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Plus size={15} /> Lưu thẻ vào bài học
                    </button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
