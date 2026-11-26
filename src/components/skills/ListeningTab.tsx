import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  HelpCircle,
  Play,
  Radio,
  RotateCcw,
  Square,
  Upload,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessonPack } from '../../types/schema';
import {
  DictationEvaluation,
  evaluateDictation,
  getRankedNaturalVoices,
  normalizeWord,
  RankedVoice,
  speakDocumentary,
  stopSpeech,
} from '../../utils/speech';

interface ListeningTabProps {
  lesson: LessonPack;
}

export const ListeningTab: React.FC<ListeningTabProps> = ({ lesson }) => {
  const { prefs, updatePrefs, markSkillComplete, showToast } = useApp();
  const { listening } = lesson;

  const [subMode, setSubMode] = useState<'dictation' | 'gapfill' | 'mcq'>('dictation');
  const [speed, setSpeed] = useState<number>(prefs.ttsRate || 0.95);
  const [narrationStyle, setNarrationStyle] = useState<'discovery' | 'standard'>(
    prefs.narrationStyle || 'discovery'
  );
  const [voices, setVoices] = useState<RankedVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speakingSentenceId, setSpeakingSentenceId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);

  // Sentence-by-sentence dictation state
  const [sentIdx, setSentIdx] = useState(0);
  const [dictInput, setDictInput] = useState('');
  const [dictEval, setDictEval] = useState<DictationEvaluation | null>(null);
  const [showDictAnswer, setShowDictAnswer] = useState(false);
  const [completedSentIds, setCompletedSentIds] = useState<string[]>([]);

  // Gap-fill & MCQ state
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [gapChecked, setGapChecked] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [mcqChecked, setMcqChecked] = useState(false);

  const sentences = listening.transcriptSentences;
  const activeSentence = sentences[sentIdx];

  useEffect(() => {
    const loadVoices = () => setVoices(getRankedNaturalVoices(prefs.ttsVoice).slice(0, 12));
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => stopSpeech();
  }, [prefs.ttsVoice]);

  const handleStop = () => {
    stopSpeech();
    setIsPlaying(false);
    setSpeakingSentenceId(null);
  };

  const playFullNarration = () => {
    if (sentences.length === 0) return;
    setIsPlaying(true);
    void speakDocumentary(sentences, {
      rate: speed,
      lang: prefs.ttsVoice,
      voiceName: prefs.ttsVoiceName,
      style: narrationStyle,
      onSentenceStart: (id) => setSpeakingSentenceId(id),
      onFinish: () => {
        setIsPlaying(false);
        setSpeakingSentenceId(null);
      },
    });
  };

  const playSingleSentence = (sentence: { id: string; en: string }, customSpeed?: number) => {
    setIsPlaying(true);
    void speakDocumentary([sentence], {
      rate: customSpeed ?? speed,
      lang: prefs.ttsVoice,
      voiceName: prefs.ttsVoiceName,
      style: narrationStyle,
      onSentenceStart: (id) => setSpeakingSentenceId(id),
      onFinish: () => {
        setIsPlaying(false);
        setSpeakingSentenceId(null);
      },
    });
  };

  const handleCheckDictation = () => {
    if (!activeSentence) return;
    const res = evaluateDictation(activeSentence.en, dictInput);
    setDictEval(res);
    if (res.isPerfect) {
      if (!completedSentIds.includes(activeSentence.id)) {
        const next = [...completedSentIds, activeSentence.id];
        setCompletedSentIds(next);
        if (next.length === sentences.length) {
          markSkillComplete(lesson.id, 'listening', 25);
          showToast('Tuyệt vời! Hoàn thành Chép chính tả toàn bài (+25 XP)');
        }
      }
    }
  };

  const effectiveAudioUrl = customAudioUrl || listening.audioUrl;

  return (
    <div className="stack-md">
      {/* Discovery Narration & Audio Studio Bar */}
      <div className="card stack-md">
        <div className="flex-between flex-wrap">
          <div>
            <div className="flex-row flex-wrap" style={{ gap: 6 }}>
              <span className="badge badge-accent">
                <Radio size={13} />{' '}
                {narrationStyle === 'discovery' ? 'Thuyết minh kiểu Discovery' : 'Đọc tiêu chuẩn'}
              </span>
              {isPlaying && (
                <span className="badge badge-success">
                  <span className="wave-bars" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Đang thuyết minh...
                </span>
              )}
            </div>
            <h2 style={{ margin: '6px 0 0', fontSize: '1.18rem' }}>{listening.title}</h2>
          </div>

          <div className="flex-row flex-wrap">
            {!isPlaying ? (
              <button className="btn btn-primary btn-sm" onClick={playFullNarration}>
                <Play size={14} /> Nghe toàn bài
              </button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={handleStop}>
                <Square size={13} /> Dừng đọc
              </button>
            )}
            <button className="btn btn-sm" onClick={() => setShowTranscript((v) => !v)}>
              <Eye size={14} /> {showTranscript ? 'Ẩn Transcript' : 'Xem Transcript'}
            </button>
            <button
              className="btn btn-sm btn-soft"
              title="Đính kèm tệp âm thanh MP3/M4A/WAV tạo từ NotebookLM hoặc ElevenLabs"
              onClick={() => audioUploadRef.current?.click()}
            >
              <Upload size={14} /> Nạp MP3/WAV
            </button>
            <input
              ref={audioUploadRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
                  setCustomAudioUrl(URL.createObjectURL(f));
                  showToast(`Đã nạp tệp âm thanh studio: ${f.name}`);
                }
              }}
            />
          </div>
        </div>

        {/* Natural Voice & Discovery Prosody Controls */}
        <div className="card-subtle flex-row flex-wrap" style={{ justifyContent: 'space-between' }}>
          <div className="flex-row flex-wrap" style={{ gap: 8 }}>
            <div className="segmented">
              <button
                className={narrationStyle === 'discovery' ? 'active' : ''}
                onClick={() => {
                  setNarrationStyle('discovery');
                  updatePrefs({ narrationStyle: 'discovery' });
                }}
              >
                Discovery (Nhấn nhá & ngắt nhịp)
              </button>
              <button
                className={narrationStyle === 'standard' ? 'active' : ''}
                onClick={() => {
                  setNarrationStyle('standard');
                  updatePrefs({ narrationStyle: 'standard' });
                }}
              >
                Đọc chuẩn
              </button>
            </div>

            <select
              className="select"
              style={{ width: 250, padding: '6px 10px', fontSize: '0.82rem' }}
              value={prefs.ttsVoiceName}
              onChange={(e) => updatePrefs({ ttsVoiceName: e.target.value })}
              aria-label="Chọn giọng thuyết minh tự nhiên"
            >
              <option value="">Tự động chọn giọng Neural/Natural tốt nhất</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: 88, padding: '6px 8px', fontSize: '0.82rem' }}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Tốc độ thuyết minh"
            >
              <option value={0.78}>0.78x</option>
              <option value={0.88}>0.88x</option>
              <option value={0.95}>0.95x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.15}>1.15x</option>
            </select>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Mẹo macOS/iPad: Tải giọng <em>Daniel/Ava (Enhanced/Premium)</em> trong Cài đặt Trợ năng để nghe cực tự nhiên.
          </span>
        </div>

        {effectiveAudioUrl && (
          <audio controls src={effectiveAudioUrl} style={{ width: '100%', height: 38 }} />
        )}

        {/* RadEng v3.1 notesTemplate support */}
        {listening.notesTemplate && listening.notesTemplate.length > 0 && (
          <div className="card-subtle stack-sm">
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              GỢI Ý GHI CHÉP (NOTES TEMPLATE)
            </span>
            {listening.notesTemplate.map((line, i) => (
              <div key={i} style={{ fontSize: '0.86rem' }}>
                • {line}
              </div>
            ))}
          </div>
        )}

        {showTranscript && (
          <div className="card-subtle stack-sm">
            {sentences.map((s, i) => {
              const active = speakingSentenceId === s.id;
              return (
                <div
                  key={s.id}
                  className={active ? 'evidence-highlight' : ''}
                  style={{ fontSize: '0.88rem', padding: '6px 8px', cursor: 'pointer' }}
                  onClick={() => playSingleSentence(s)}
                >
                  <strong>Câu {i + 1}:</strong> {s.en}
                  {s.vi && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.vi}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-mode switcher */}
      <div className="flex-between flex-wrap">
        <div className="segmented" style={{ maxWidth: 460 }}>
          <button
            className={subMode === 'dictation' ? 'active' : ''}
            onClick={() => setSubMode('dictation')}
          >
            Chép chính tả từng câu ({completedSentIds.length}/{sentences.length})
          </button>
          <button
            className={subMode === 'gapfill' ? 'active' : ''}
            onClick={() => setSubMode('gapfill')}
          >
            Gap-Fill ({listening.gapFill.length})
          </button>
          <button
            className={subMode === 'mcq' ? 'active' : ''}
            onClick={() => setSubMode('mcq')}
          >
            MCQ ({listening.mcq.length})
          </button>
        </div>

        <button
          className="btn btn-sm btn-soft"
          onClick={() => {
            markSkillComplete(lesson.id, 'listening', 20);
            showToast('Đã đánh dấu hoàn thành Listening (+20 XP)');
          }}
        >
          <CheckCircle2 size={14} /> Hoàn thành Listening
        </button>
      </div>

      {/* Mode 1: Sentence-by-Sentence Dictation with First-Mismatch Highlight */}
      {subMode === 'dictation' && activeSentence && (
        <div className="card stack-md">
          <div className="flex-between flex-wrap">
            <div className="chip-list">
              {sentences.map((s, i) => (
                <button
                  key={s.id}
                  className={`chip ${sentIdx === i ? 'active' : ''}`}
                  onClick={() => {
                    setSentIdx(i);
                    setDictInput('');
                    setDictEval(null);
                    setShowDictAnswer(false);
                  }}
                >
                  Câu {i + 1} {completedSentIds.includes(s.id) ? '✓' : ''}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => playSingleSentence(activeSentence)}
            >
              <Volume2 size={15} /> Nghe câu {sentIdx + 1}
            </button>
          </div>

          <div className="stack-sm">
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Gõ lại chính xác câu bạn vừa nghe (đối chiếu từng từ & làm nổi bật từ sai đầu tiên):
            </label>
            <textarea
              className="textarea"
              style={{ minHeight: 84 }}
              placeholder="Nghe câu và gõ lại vào đây..."
              value={dictInput}
              onChange={(e) => setDictInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCheckDictation();
                }
              }}
            />
            <div className="flex-row flex-wrap">
              <button className="btn btn-primary" onClick={handleCheckDictation}>
                Kiểm tra (Enter)
              </button>
              <button
                className="btn"
                onClick={() => playSingleSentence(activeSentence, Math.max(0.72, speed - 0.15))}
              >
                Nghe chậm hơn
              </button>
              <button className="btn" onClick={() => setShowDictAnswer((v) => !v)}>
                <Eye size={14} /> {showDictAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
              </button>
              {sentIdx + 1 < sentences.length && (
                <button
                  className="btn btn-soft"
                  onClick={() => {
                    setSentIdx((i) => i + 1);
                    setDictInput('');
                    setDictEval(null);
                    setShowDictAnswer(false);
                  }}
                >
                  Câu tiếp →
                </button>
              )}
            </div>
          </div>

          {dictEval && (
            <div className="stack-sm">
              <div className="flex-between flex-wrap">
                <span className={`badge ${dictEval.isPerfect ? 'badge-success' : 'badge-danger'}`}>
                  {dictEval.isPerfect
                    ? '✓ Chính xác 100%!'
                    : `Độ khớp: ${dictEval.accuracy}% · Từ sai đầu tiên tại vị trí #${dictEval.firstMismatchIndex + 1}`}
                </span>
                {!dictEval.isPerfect && dictEval.firstMismatchHint && (
                  <span className="badge badge-warning">
                    <HelpCircle size={13} /> {dictEval.firstMismatchHint}
                  </span>
                )}
              </div>

              <div className="token-strip" aria-label="Kết quả đối chiếu từng từ">
                {dictEval.tokens.map((tok, idx) => {
                  if (tok.status === 'correct') {
                    return (
                      <span key={idx} className="tok tok-correct">
                        {tok.expected}
                      </span>
                    );
                  }
                  if (tok.status === 'first_mismatch') {
                    return (
                      <span
                        key={idx}
                        className="tok tok-first-mismatch"
                        title="Từ sai đầu tiên cần sửa"
                      >
                        {tok.actual ? `${tok.actual} ✗` : `[thiếu từ #${idx + 1}]`}
                      </span>
                    );
                  }
                  if (tok.status === 'missing') {
                    return (
                      <span key={idx} className="tok tok-missing">
                        ___
                      </span>
                    );
                  }
                  return (
                    <span key={idx} className="tok tok-wrong">
                      {tok.actual}
                    </span>
                  );
                })}
                {dictEval.extraWords.map((w, i) => (
                  <span key={`ex_${i}`} className="tok tok-wrong">
                    +{w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showDictAnswer && (
            <div className="card-subtle">
              <div style={{ fontWeight: 600 }}>{activeSentence.en}</div>
              {activeSentence.vi && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {activeSentence.vi}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Gap-Fill */}
      {subMode === 'gapfill' && (
        <div className="card stack-md">
          {listening.gapFill.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Bài học này chưa có câu hỏi Gap-Fill.</div>
          ) : (
            <>
              {listening.gapFill.map((g, i) => {
                const ok = normalizeWord(gapAnswers[g.id] || '') === normalizeWord(g.answer);
                return (
                  <div key={g.id} className="card-subtle stack-sm">
                    <div style={{ fontWeight: 600 }}>
                      {i + 1}. {g.sentence}
                    </div>
                    {g.hint && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Gợi ý nghĩa: {g.hint}
                      </span>
                    )}
                    <input
                      className="input"
                      disabled={gapChecked}
                      placeholder="Nhập từ còn thiếu..."
                      value={gapAnswers[g.id] || ''}
                      onChange={(e) =>
                        setGapAnswers((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                    />
                    {gapChecked && (
                      <div style={{ fontSize: '0.84rem', color: ok ? 'var(--success)' : 'var(--danger)' }}>
                        {ok ? '✓ Chính xác!' : `✗ Đáp án đúng: "${g.answer}"`}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex-row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setGapChecked(true);
                    markSkillComplete(lesson.id, 'listening', 20);
                  }}
                >
                  Kiểm tra Gap-Fill
                </button>
                {gapChecked && (
                  <button
                    className="btn"
                    onClick={() => {
                      setGapAnswers({});
                      setGapChecked(false);
                    }}
                  >
                    <RotateCcw size={14} /> Làm lại
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Mode 3: MCQ */}
      {subMode === 'mcq' && (
        <div className="card stack-md">
          {listening.mcq.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Bài học này chưa có câu hỏi MCQ.</div>
          ) : (
            <>
              {listening.mcq.map((m, i) => {
                const ok = mcqAnswers[m.id] === m.answer;
                return (
                  <div key={m.id} className="card-subtle stack-sm">
                    <div style={{ fontWeight: 600 }}>
                      {i + 1}. {m.question}
                    </div>
                    <div className="stack-sm">
                      {m.options.map((opt) => {
                        let cls = 'quiz-option';
                        if (mcqChecked) {
                          if (opt === m.answer) cls += ' correct';
                          else if (mcqAnswers[m.id] === opt) cls += ' wrong';
                        } else if (mcqAnswers[m.id] === opt) {
                          cls += ' selected';
                        }
                        return (
                          <button
                            key={opt}
                            className={cls}
                            disabled={mcqChecked}
                            onClick={() => setMcqAnswers((prev) => ({ ...prev, [m.id]: opt }))}
                          >
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    {mcqChecked && (
                      <div style={{ fontSize: '0.84rem', color: ok ? 'var(--success)' : 'var(--danger)' }}>
                        {ok ? '✓ Chính xác!' : `✗ Đáp án: ${m.answer}`}{' '}
                        {m.explanationVi && (
                          <span style={{ color: 'var(--text-secondary)' }}>— {m.explanationVi}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex-row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setMcqChecked(true);
                    markSkillComplete(lesson.id, 'listening', 20);
                  }}
                >
                  Kiểm tra MCQ
                </button>
                {mcqChecked && (
                  <button
                    className="btn"
                    onClick={() => {
                      setMcqAnswers({});
                      setMcqChecked(false);
                    }}
                  >
                    <RotateCcw size={14} /> Làm lại
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
