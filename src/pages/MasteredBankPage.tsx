import React, { useDeferredValue, useMemo, useState } from 'react';
import { Award, Layers, Mic, Search, Square, Trash2, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  comparePronunciation,
  PronunciationResult,
  speakText,
  startOfflineAudioRecording,
  startSpeechRecognition,
} from '../utils/speech';

export const MasteredBankPage: React.FC = () => {
  const {
    state,
    prefs,
    subspecialties,
    getSubspecialtyLabel,
    addCardToSrs,
    removeMastered,
    showToast,
  } = useApp();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [visibleLimit, setVisibleLimit] = useState(60);
  const [subFilter, setSubFilter] = useState<string>('all');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [stopRecFn, setStopRecFn] = useState<(() => void) | null>(null);
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({});
  const [pronResults, setPronResults] = useState<Record<string, PronunciationResult>>({});

  const entries = useMemo(
    () => Object.values(state.masteredBank).sort((a, b) => b.masteredAt - a.masteredAt),
    [state.masteredBank]
  );

  const books = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => {
      if (e.sourceBook) s.add(e.sourceBook);
    });
    return Array.from(s).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (subFilter !== 'all' && e.subspecialty !== subFilter) return false;
      if (bookFilter !== 'all' && e.sourceBook !== bookFilter) return false;
      if (q) {
        const hay = `${e.term} ${e.meaningVi} ${e.wordRoot} ${e.sourceBook}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, subFilter, bookFilter, deferredQuery]);

  const visibleEntries = useMemo(
    () => filtered.slice(0, visibleLimit),
    [filtered, visibleLimit]
  );

  const handlePronounce = (termKey: string, term: string) => {
    setListeningKey(termKey);
    startSpeechRecognition(prefs.ttsVoice, {
      onResult: (transcript) => {
        setPronResults((prev) => ({
          ...prev,
          [termKey]: comparePronunciation(term, transcript),
        }));
      },
      onNetworkError: async () => {
        setListeningKey(null);
        if (recordingKey === termKey && stopRecFn) {
          stopRecFn();
          setRecordingKey(null);
          return;
        }
        setRecordingKey(termKey);
        showToast('Speech Cloud không khả dụng — đang ghi âm cục bộ để bạn tự nghe đối chiếu.');
        const stop = await startOfflineAudioRecording({
          onStop: (url) => {
            setRecordedUrls((prev) => ({ ...prev, [termKey]: url }));
            setRecordingKey(null);
          },
          onError: (msg) => {
            setRecordingKey(null);
            showToast(msg);
          },
        });
        setStopRecFn(() => stop);
      },
      onError: (msg) => showToast(msg),
      onEnd: () => setListeningKey(null),
    });
  };

  return (
    <div className="stack-md">
      <div className="flex-between flex-wrap">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Mastered Bank — Thuật ngữ CĐHA & DSA</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Ngân hàng thuật ngữ chuyên khoa bạn đã thuộc (định danh chuẩn theo <code className="mono">termKey</code>).
          </p>
        </div>
        <span className="badge badge-success">{entries.length} thuật ngữ đã thuộc</span>
      </div>

      <div className="card flex-row flex-wrap">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
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
            placeholder="Tìm thuật ngữ, nghĩa Việt, gốc từ wordRoot..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="select"
          style={{ width: 220 }}
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value)}
        >
          <option value="all">Tất cả phân môn</option>
          {subspecialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ width: 220 }}
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
        >
          <option value="all">Tất cả sách nguồn ({books.length})</option>
          {books.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <Award size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Chưa có thuật ngữ nào trong Mastered Bank. Bấm <strong>Đánh dấu thuộc</strong> tại tab Vocabulary trong bài học để lưu vào đây.
          </p>
        </div>
      ) : (
        <div className="stack-md">
          <div className="grid-2">
            {visibleEntries.map((item) => {
            const pr = pronResults[item.termKey];
            const recUrl = recordedUrls[item.termKey];
            return (
              <div key={item.termKey} className="card stack-sm">
                <div className="flex-between">
                  <div>
                    <strong style={{ fontSize: '1.08rem', color: 'var(--accent)' }}>{item.term}</strong>
                    {item.ipa && (
                      <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                        {item.ipa}
                      </span>
                    )}
                  </div>
                  <span className="badge mono" style={{ fontSize: '0.7rem' }}>
                    {item.termKey}
                  </span>
                </div>

                <div style={{ fontWeight: 500 }}>{item.meaningVi}</div>

                {item.wordRoot && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Gốc từ:</strong> {item.wordRoot}
                  </div>
                )}

                <div className="flex-row flex-wrap" style={{ gap: 6 }}>
                  <span className="badge">{getSubspecialtyLabel(item.subspecialty)}</span>
                  {item.sourceBook && <span className="badge">📖 {item.sourceBook}</span>}
                </div>

                {pr && (
                  <div className="card-subtle" style={{ padding: '8px 10px', fontSize: '0.82rem' }}>
                    <strong>Độ khớp: {pr.accuracy}%</strong> · Nhận diện: “{pr.transcript}”
                  </div>
                )}

                {recUrl && <audio controls src={recUrl} style={{ width: '100%', height: 34 }} />}

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
                    className={`btn btn-sm ${
                      listeningKey === item.termKey || recordingKey === item.termKey
                        ? 'btn-danger'
                        : ''
                    }`}
                    onClick={() => handlePronounce(item.termKey, item.term)}
                  >
                    {recordingKey === item.termKey ? <Square size={13} /> : <Mic size={14} />}{' '}
                    {recordingKey === item.termKey
                      ? 'Dừng ghi'
                      : listeningKey === item.termKey
                        ? 'Đang nghe...'
                        : 'Phát âm'}
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
                        lessonId: item.lessonId,
                      })
                    }
                  >
                    <Layers size={14} /> Ôn lại SRS
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeMastered(item.termKey)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
          {filtered.length > visibleLimit && (
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-sm btn-soft"
                onClick={() => setVisibleLimit((n) => n + 60)}
              >
                Hiển thị thêm (+60) · Đang xem {visibleEntries.length}/{filtered.length} thuật ngữ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
