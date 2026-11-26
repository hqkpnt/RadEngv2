import React, { useEffect, useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Eye,
  Mic,
  Play,
  Radio,
  RotateCcw,
  Square,
  Volume2,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';
import {
  comparePronunciation,
  PronunciationResult,
  speakText,
  startOfflineAudioRecording,
  startSpeechRecognition,
  stopSpeech,
} from '../../utils/speech';

interface SpeakingTabProps {
  lesson: LessonPack;
}

const SPEAKING_RUBRIC_CRITERIA = [
  'Từ vựng & thuật ngữ chuyên ngành chính xác (dùng tự nhiên, đúng ngữ cảnh)',
  'Cấu trúc ngữ pháp rõ ràng, ít vấp thì hoặc sai bị động',
  'Độ mạch lạc, nhịp ngắt & phát âm rõ ràng dễ nghe',
  'Bám sát trọng tâm câu hỏi / ca lâm sàng được yêu cầu',
];

export const SpeakingTab: React.FC<SpeakingTabProps> = ({ lesson }) => {
  const {
    prefs,
    state,
    saveSpeakingNote,
    toggleSpeakingRubric,
    addLessonVocab,
    markSkillComplete,
    showToast,
  } = useApp();
  const { speaking } = lesson;

  const progress = state.lessonProgress[lesson.id];
  const speakingNotes = progress?.speakingNotes || {};
  const speakingRubric = progress?.speakingRubric || {};
  const rubricScore = SPEAKING_RUBRIC_CRITERIA.filter((_, i) => Boolean(speakingRubric[i])).length;

  const [section, setSection] = useState<'stages' | 'shadowing'>('stages');
  const [shadowLevel, setShadowLevel] = useState<'simple' | 'complex'>('simple');
  const [speed, setSpeed] = useState<number>(prefs.ttsRate || 0.95);
  const [shownSamples, setShownSamples] = useState<Record<string, boolean>>({});
  const [showShadowVi, setShowShadowVi] = useState(true);

  // Resilient Speech + Offline MediaRecorder + OS Dictation Self-Check
  const [cloudUnavailable, setCloudUnavailable] = useState(false);
  const [recordingSpeechId, setRecordingSpeechId] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [stopSpeechRecFn, setStopSpeechRecFn] = useState<(() => void) | null>(null);

  const [recordingAudioId, setRecordingAudioId] = useState<string | null>(null);
  const [stopAudioRecFn, setStopAudioRecFn] = useState<(() => void) | null>(null);
  const [recordedAudios, setRecordedAudios] = useState<Record<string, string>>({});
  const [manualDrafts, setManualDrafts] = useState<Record<string, string>>({});
  const [pronResults, setPronResults] = useState<Record<string, PronunciationResult>>({});

  // Stage 2 Cue Card timer
  const [timerPhase, setTimerPhase] = useState<'idle' | 'prep' | 'speak'>('idle');
  const [timerSec, setTimerSec] = useState(60);

  useEffect(() => {
    if (timerPhase === 'idle') return;
    if (timerSec <= 0) {
      if (timerPhase === 'prep') {
        setTimerPhase('speak');
        setTimerSec(120);
        showToast('Hết giờ chuẩn bị! Bắt đầu trình bày 2 phút.');
      } else {
        setTimerPhase('idle');
        showToast('Hoàn thành lượt nói Stage 2!');
      }
      return;
    }
    const id = window.setInterval(() => setTimerSec((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [timerPhase, timerSec, showToast]);

  const handleCloudSpeechCheck = (id: string, targetText: string) => {
    if (recordingSpeechId === id && stopSpeechRecFn) {
      stopSpeechRecFn();
      setRecordingSpeechId(null);
      return;
    }
    stopSpeech();
    setRecordingSpeechId(id);
    setInterimText('');

    const stop = startSpeechRecognition(prefs.ttsVoice, {
      onInterim: (t) => setInterimText(t),
      onResult: (transcript) => {
        const evaluated = comparePronunciation(targetText, transcript);
        setPronResults((prev) => ({ ...prev, [id]: evaluated }));
        if (evaluated.accuracy >= 80) {
          markSkillComplete(lesson.id, 'speaking', 15);
        }
      },
      onNetworkError: () => {
        setCloudUnavailable(true);
        setRecordingSpeechId(null);
        setStopSpeechRecFn(null);
        showToast(
          'Trình duyệt không kết nối được Speech Cloud — đã bật tự động chế độ Ghi âm cục bộ & Đối chiếu Offline.'
        );
      },
      onError: (msg) => showToast(msg),
      onEnd: () => {
        setRecordingSpeechId(null);
        setStopSpeechRecFn(null);
      },
    });
    setStopSpeechRecFn(() => stop);
  };

  const handleOfflineAudioRecord = async (id: string) => {
    if (recordingAudioId === id && stopAudioRecFn) {
      stopAudioRecFn();
      setRecordingAudioId(null);
      setStopAudioRecFn(null);
      return;
    }
    stopSpeech();
    setRecordingAudioId(id);
    const stop = await startOfflineAudioRecording({
      onStop: (url) => {
        setRecordedAudios((prev) => ({ ...prev, [id]: url }));
        showToast('Đã lưu bản ghi âm cục bộ! Bấm Play để nghe lại & so với giọng mẫu.');
      },
      onError: (msg) => {
        setRecordingAudioId(null);
        showToast(msg);
      },
    });
    setStopAudioRecFn(() => stop);
  };

  const handleManualCompare = (id: string, targetText: string) => {
    const text = (manualDrafts[id] || '').trim();
    if (!text) return;
    const evaluated = comparePronunciation(targetText, text);
    setPronResults((prev) => ({ ...prev, [id]: evaluated }));
    if (evaluated.accuracy >= 80) {
      markSkillComplete(lesson.id, 'speaking', 15);
      showToast(`Độ khớp ${evaluated.accuracy}%! (+15 XP)`);
    }
  };

  const saveExpressionCard = (enText: string, viMeaning: string, contextNote: string) => {
    const cleanEn = enText.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanEn) return;
    addLessonVocab(
      lesson.id,
      {
        termKey: '',
        term: cleanEn.length > 90 ? `${cleanEn.slice(0, 87)}...` : cleanEn,
        ipa: '',
        pos: 'speaking phrase',
        wordRoot: '',
        meaningVi: viMeaning || 'Cấu trúc luyện nói chuyên ngành',
        noteVi: contextNote,
        exampleEn: cleanEn,
        exampleVi: viMeaning,
      },
      true
    );
  };

  const renderPronunciationPanel = (
    id: string,
    targetText: string,
    saveMeta?: { viMeaning: string; note: string }
  ) => {
    const res = pronResults[id];
    const isCloudRec = recordingSpeechId === id;
    const isAudioRec = recordingAudioId === id;
    const audioUrl = recordedAudios[id];

    return (
      <div className="stack-sm">
        <div className="flex-row flex-wrap">
          <button
            className="btn btn-sm btn-soft"
            onClick={() =>
              speakText(targetText, speed, prefs.ttsVoice, {
                voiceName: prefs.ttsVoiceName,
                style: prefs.narrationStyle,
              })
            }
          >
            <Volume2 size={14} /> Nghe mẫu ({speed}x)
          </button>

          {!cloudUnavailable && (
            <button
              className={`btn btn-sm ${isCloudRec ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => handleCloudSpeechCheck(id, targetText)}
            >
              {isCloudRec ? <Square size={13} /> : <Mic size={14} />}{' '}
              {isCloudRec ? 'Đang nghe... (Dừng)' : 'Chấm phát âm (Auto)'}
            </button>
          )}

          <button
            className={`btn btn-sm ${
              isAudioRec ? 'btn-danger' : cloudUnavailable ? 'btn-primary' : ''
            }`}
            onClick={() => handleOfflineAudioRecord(id)}
          >
            {isAudioRec ? <Square size={13} /> : <Radio size={14} />}{' '}
            {isAudioRec ? 'Đang ghi âm... (Dừng)' : 'Ghi âm cục bộ (Offline)'}
          </button>

          {saveMeta && (
            <button
              className="btn btn-sm"
              title="Lưu câu / cách diễn đạt vào Flashcard bài học & SRS"
              onClick={() => saveExpressionCard(targetText, saveMeta.viMeaning, saveMeta.note)}
            >
              <BookmarkPlus size={14} /> Lưu Flashcard & SRS
            </button>
          )}
        </div>

        {isCloudRec && interimText && (
          <div className="card-subtle" style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
            Đang nhận diện: “{interimText}”
          </div>
        )}

        {audioUrl && (
          <div className="card-subtle stack-sm" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              BẢN GHI ÂM CỦA BẠN (Nghe đối chiếu trực tiếp với giọng mẫu):
            </div>
            <audio controls src={audioUrl} style={{ width: '100%', height: 36 }} />
          </div>
        )}

        {cloudUnavailable && (
          <div className="card-subtle stack-sm" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              💡 <strong>Mẹo chấm khớp từ Offline:</strong> Bấm phím <strong>Fn × 2</strong> (MacBook) hoặc biểu tượng <strong>Mic trên bàn phím iPad/iPhone</strong> để đọc trực tiếp vào ô dưới rồi bấm <em>Chấm khớp</em>:
            </div>
            <div className="flex-row" style={{ gap: 6 }}>
              <input
                className="input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                placeholder="Đọc bằng Dictation hệ thống (Fn×2) hoặc nhập câu đã đọc..."
                value={manualDrafts[id] || ''}
                onChange={(e) => setManualDrafts((p) => ({ ...p, [id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualCompare(id, targetText);
                  }
                }}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleManualCompare(id, targetText)}
              >
                Chấm khớp
              </button>
            </div>
          </div>
        )}

        {res && (
          <div className="stack-sm">
            <div className="flex-between flex-wrap" style={{ fontSize: '0.84rem' }}>
              <span className={`badge ${res.accuracy >= 80 ? 'badge-success' : 'badge-warning'}`}>
                Độ khớp phát âm: {res.accuracy}%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Đã đọc: “{res.transcript}”</span>
            </div>
            <div className="token-strip">
              {res.tokens.map((tok, i) => (
                <span key={i} className={`tok ${tok.matched ? 'tok-correct' : 'tok-wrong'}`}>
                  {tok.word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const shadowItems =
    shadowLevel === 'simple' ? speaking.shadowing.simple : speaking.shadowing.complex;

  return (
    <div className="stack-md">
      {cloudUnavailable && (
        <div
          className="card-subtle flex-between flex-wrap"
          style={{ borderColor: 'var(--accent-border)' }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <WifiOff
              size={15}
              style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent)' }}
            />
            <strong>Chế độ Luyện nói Offline đang bật:</strong> Trình duyệt hiện không kết nối dịch vụ Speech Cloud (lỗi <code className="mono">network</code> đã được xử lý tự động). Bạn có thể <strong>Ghi âm cục bộ</strong> và dùng <strong>Dictation bàn phím (Fn×2)</strong> để chấm % khớp!
          </span>
          <button className="btn btn-sm" onClick={() => setCloudUnavailable(false)}>
            Thử lại Cloud Speech
          </button>
        </div>
      )}

      <div className="flex-between flex-wrap">
        <div className="segmented" style={{ maxWidth: 420 }}>
          <button
            className={section === 'stages' ? 'active' : ''}
            onClick={() => setSection('stages')}
          >
            Luyện nói 3 Stages ({speaking.stages.length})
          </button>
          <button
            className={section === 'shadowing' ? 'active' : ''}
            onClick={() => setSection('shadowing')}
          >
            Shadowing & Phát âm
          </button>
        </div>

        <div className="flex-row">
          <select
            className="select"
            style={{ width: 92, padding: '5px 8px', fontSize: '0.82rem' }}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={0.78}>0.78x</option>
            <option value={0.88}>0.88x</option>
            <option value={0.95}>0.95x</option>
            <option value={1.0}>1.0x</option>
          </select>
          <button
            className="btn btn-sm btn-soft"
            onClick={() => {
              markSkillComplete(lesson.id, 'speaking', 25);
              showToast('Đã đánh dấu hoàn thành Speaking (+25 XP)');
            }}
          >
            <CheckCircle2 size={15} /> Hoàn thành Speaking
          </button>
        </div>
      </div>

      {/* Section 1: 3 Stages + Auto-Saved Speaking Notes + Self-Assessment Checklist */}
      {section === 'stages' && (
        <div className="stack-md">
          {speaking.stages.map((st) => {
            const noteKey = `stage_${st.stage}`;
            const stageNoteVal = speakingNotes[noteKey] || '';
            return (
              <div key={st.stage} className="card stack-md">
                <div className="flex-between flex-wrap">
                  <div>
                    <span className="badge badge-accent">Stage {st.stage}</span>
                    <h3 style={{ margin: '6px 0 0', fontSize: '1.1rem' }}>{st.title}</h3>
                  </div>

                  {st.stage === 2 && (
                    <div className="flex-row flex-wrap">
                      <span className="badge mono badge-warning">
                        <Clock size={13} />{' '}
                        {timerPhase === 'idle'
                          ? 'Sẵn sàng'
                          : timerPhase === 'prep'
                            ? `Chuẩn bị: ${timerSec}s`
                            : `Đang nói: ${String(Math.floor(timerSec / 60)).padStart(2, '0')}:${String(
                                timerSec % 60
                              ).padStart(2, '0')}`}
                      </span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setTimerPhase('prep');
                          setTimerSec(st.prepSeconds || 60);
                        }}
                      >
                        <Play size={13} /> 1p chuẩn bị + 2p nói
                      </button>
                      {timerPhase !== 'idle' && (
                        <button className="btn btn-sm" onClick={() => setTimerPhase('idle')}>
                          <RotateCcw size={13} /> Dừng
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {st.cueCard && (
                  <div
                    className="card-subtle stack-sm"
                    style={{ borderLeft: '4px solid var(--accent)' }}
                  >
                    <div style={{ fontWeight: 700 }}>{st.cueCard}</div>
                    {st.bulletPoints && st.bulletPoints.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {st.bulletPoints.map((b, i) => (
                          <li key={i} style={{ fontSize: '0.9rem' }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {st.sampleAnswer && (
                      <div className="stack-sm" style={{ marginTop: 6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                          onClick={() =>
                            setShownSamples((p) => ({
                              ...p,
                              [`st_${st.stage}`]: !p[`st_${st.stage}`],
                            }))
                          }
                        >
                          <Eye size={14} />{' '}
                          {shownSamples[`st_${st.stage}`]
                            ? 'Ẩn gợi ý trả lời'
                            : 'Xem gợi ý trả lời'}
                        </button>
                        {shownSamples[`st_${st.stage}`] && (
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {st.sampleAnswer}
                          </div>
                        )}
                        {renderPronunciationPanel(`st_${st.stage}_cue`, st.sampleAnswer, {
                          viMeaning: st.cueCard,
                          note: `Speaking Stage ${st.stage} Cue Card`,
                        })}
                      </div>
                    )}
                  </div>
                )}

                {st.prompts.map((pr, idx) => {
                  const key = `st${st.stage}_p${idx}`;
                  return (
                    <div key={key} className="card-subtle stack-sm">
                      <div style={{ fontWeight: 600 }}>
                        Q{idx + 1}. {pr.question}
                      </div>
                      {pr.hintVi && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          💡 Gợi ý: {pr.hintVi}
                        </div>
                      )}
                      {pr.sampleAnswer && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ alignSelf: 'flex-start' }}
                            onClick={() =>
                              setShownSamples((p) => ({ ...p, [key]: !p[key] }))
                            }
                          >
                            <Eye size={14} /> {shownSamples[key] ? 'Ẩn mẫu' : 'Câu trả lời mẫu'}
                          </button>
                          {shownSamples[key] && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              {pr.sampleAnswer}
                            </div>
                          )}
                          {renderPronunciationPanel(key, pr.sampleAnswer, {
                            viMeaning: pr.hintVi || pr.question,
                            note: `Speaking Stage ${st.stage} · ${pr.question}`,
                          })}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Persistent Auto-Saved Speaking Outline / Notes */}
                <div className="stack-sm">
                  <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                      Ghi chú dàn ý nói — Stage {st.stage}
                    </span>
                    {stageNoteVal.trim() && (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Đã tự lưu nháp
                      </span>
                    )}
                  </div>
                  <textarea
                    className="textarea"
                    style={{ minHeight: 72 }}
                    placeholder="Ghi gạch đầu dòng ý chính, từ khóa hoặc câu mở đầu cho phần nói (tự động lưu)..."
                    value={stageNoteVal}
                    onChange={(e) => saveSpeakingNote(lesson.id, noteKey, e.target.value)}
                  />
                </div>
              </div>
            );
          })}

          {/* Speaking Self-Assessment Checklist */}
          <div className="card stack-sm">
            <div className="flex-between">
              <strong style={{ fontSize: '0.92rem' }}>Checklist tự đánh giá Speaking</strong>
              <span className={`badge ${rubricScore === 4 ? 'badge-success' : 'badge-accent'}`}>
                {rubricScore}/4 tiêu chí
              </span>
            </div>
            {SPEAKING_RUBRIC_CRITERIA.map((crit, idx) => (
              <label
                key={idx}
                className="flex-row"
                style={{ fontSize: '0.86rem', cursor: 'pointer', alignItems: 'flex-start' }}
              >
                <input
                  type="checkbox"
                  style={{ marginTop: 4 }}
                  checked={Boolean(speakingRubric[idx])}
                  onChange={() => toggleSpeakingRubric(lesson.id, idx)}
                />
                <span>{crit}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Shadowing (Simple & Complex) */}
      {section === 'shadowing' && (
        <div className="stack-md">
          <div className="flex-between flex-wrap">
            <div className="chip-list">
              <button
                className={`chip ${shadowLevel === 'simple' ? 'active' : ''}`}
                onClick={() => setShadowLevel('simple')}
              >
                Simple ({speaking.shadowing.simple.length} câu)
              </button>
              <button
                className={`chip ${shadowLevel === 'complex' ? 'active' : ''}`}
                onClick={() => setShadowLevel('complex')}
              >
                Complex ({speaking.shadowing.complex.length} câu)
              </button>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => setShowShadowVi((v) => !v)}
            >
              <Eye size={14} /> {showShadowVi ? 'Ẩn nghĩa tiếng Việt' : 'Hiện nghĩa tiếng Việt'}
            </button>
          </div>

          {shadowItems.map((item, idx) => (
            <div key={item.id} className="card stack-sm">
              <span className="badge badge-accent" style={{ alignSelf: 'flex-start' }}>
                Shadowing {shadowLevel === 'simple' ? 'Simple' : 'Complex'} #{idx + 1}
              </span>
              <div style={{ fontSize: '1.08rem', fontWeight: 600, lineHeight: 1.7 }}>
                {item.en}
              </div>
              {showShadowVi && item.vi && (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{item.vi}</div>
              )}
              {renderPronunciationPanel(item.id, item.en, {
                viMeaning: item.vi || 'Câu luyện Shadowing',
                note: `Shadowing ${shadowLevel} — ${lesson.meta.title}`,
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
