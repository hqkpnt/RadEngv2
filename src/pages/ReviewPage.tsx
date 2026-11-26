import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RadState, SrsCard } from '../types/schema';
import { formatDueLabel, SM2_OPTIONS, Sm2Rating } from '../utils/sm2';
import { normalizeWord, speakText } from '../utils/speech';

interface ReviewPageProps {
  navigate: (hash: string) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ navigate }) => {
  const {
    state,
    prefs,
    bulkAddSrsCards,
    rateSrsCard,
    updateSrsCard,
    deleteSrsCards,
    moveSrsCards,
    reorderSrsCard,
    createSrsFolder,
    renameSrsFolder,
    deleteSrsFolder,
    updateSrsSettings,
    showToast,
  } = useApp();

  const { srs } = state;
  const [selectedFolder, setSelectedFolder] = useState<'all' | 'starred' | string>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [visibleLimit, setVisibleLimit] = useState(60);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editMeaning, setEditMeaning] = useState('');

  // Create deck modal
  const [createOpen, setCreateOpen] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [createTab, setCreateTab] = useState<'manual' | 'paste' | 'file'>('manual');
  const [manualRows, setManualRows] = useState<Array<{ front: string; meaning: string }>>([
    { front: '', meaning: '' },
    { front: '', meaning: '' },
  ]);
  const [pasteText, setPasteText] = useState('');
  const [colSep, setColSep] = useState<'tab' | 'comma'>('tab');
  const [rowSep, setRowSep] = useState<'newline' | 'semicolon'>('newline');
  const [fileCards, setFileCards] = useState<Array<{ front: string; meaning: string }>>([]);

  // Active review session
  const [sessionQueue, setSessionQueue] = useState<string[] | null>(null);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [hideMeaningDuringRecall, setHideMeaningDuringRecall] = useState(false);

  const now = Date.now();

  const filteredCards = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = srs.cards.filter((c) => {
      if (selectedFolder === 'starred' && !c.starred) return false;
      if (selectedFolder !== 'all' && selectedFolder !== 'starred' && c.folderId !== selectedFolder) {
        return false;
      }
      if (q && !c.front.toLowerCase().includes(q) && !c.meaning.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    const sorted = [...list];
    if (srs.sortMode === 'due_first') sorted.sort((a, b) => a.dueAt - b.dueAt);
    else if (srs.sortMode === 'newest') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (srs.sortMode === 'alpha') sorted.sort((a, b) => a.front.localeCompare(b.front));
    else if (srs.sortMode === 'hardest') sorted.sort((a, b) => a.easeFactor - b.easeFactor);
    else sorted.sort((a, b) => a.orderIndex - b.orderIndex);
    return sorted;
  }, [srs.cards, srs.sortMode, selectedFolder, deferredQuery]);

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleLimit),
    [filteredCards, visibleLimit]
  );

  const dueCardsInScope = useMemo(
    () => filteredCards.filter((c) => c.dueAt <= now),
    [filteredCards, now]
  );

  const masteredCount = useMemo(
    () => srs.cards.filter((c) => c.status === 'mastered').length,
    [srs.cards]
  );
  const dueAllCount = useMemo(
    () => srs.cards.filter((c) => c.dueAt <= now).length,
    [srs.cards, now]
  );

  const activeSessionCard: SrsCard | undefined = useMemo(() => {
    if (!sessionQueue) return undefined;
    const id = sessionQueue[sessionIdx];
    return srs.cards.find((c) => c.id === id);
  }, [sessionQueue, sessionIdx, srs.cards]);

  useEffect(() => {
    if (activeSessionCard && srs.autoSpeak && srs.reviewDirection === 'en_to_vi_recall') {
      speakText(activeSessionCard.front, prefs.ttsRate, prefs.ttsVoice, {
        voiceName: prefs.ttsVoiceName,
        style: prefs.narrationStyle,
      });
    }
  }, [activeSessionCard?.id, srs.autoSpeak, srs.reviewDirection, prefs]);

  useEffect(() => {
    if (!sessionQueue || !activeSessionCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space' && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleRate(Number(e.key) as Sm2Rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const startSession = (cardsToStudy: SrsCard[]) => {
    if (cardsToStudy.length === 0) return;
    setSessionQueue(cardsToStudy.map((c) => c.id));
    setSessionIdx(0);
    setTypedAnswer('');
    setRevealed(false);
    setHintShown(false);
  };

  const handleRate = (rating: Sm2Rating) => {
    if (!activeSessionCard || !sessionQueue) return;
    rateSrsCard(activeSessionCard.id, rating);
    if (sessionIdx + 1 >= sessionQueue.length) {
      setSessionQueue(null);
      showToast(`Hoàn thành phiên ôn ${sessionQueue.length} thẻ!`);
    } else {
      setSessionIdx((i) => i + 1);
      setTypedAnswer('');
      setRevealed(false);
      setHintShown(false);
    }
  };

  const parsedPasteCards = useMemo(() => {
    const rows = pasteText
      .split(rowSep === 'newline' ? /\r?\n/ : ';')
      .map((r) => r.trim())
      .filter(Boolean);
    const sep = colSep === 'tab' ? '\t' : ',';
    return rows
      .map((line) => {
        const idx = line.indexOf(sep);
        if (idx === -1) return null;
        return { front: line.slice(0, idx).trim(), meaning: line.slice(idx + 1).trim() };
      })
      .filter((x): x is { front: string; meaning: string } => Boolean(x && x.front && x.meaning));
  }, [pasteText, colSep, rowSep]);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : json.cards || [];
        const list = arr
          .map((x: Record<string, string>) => ({
            front: (x.front || x.term || x.word || '').trim(),
            meaning: (x.meaning || x.meaningVi || x.back || '').trim(),
          }))
          .filter((x: { front: string; meaning: string }) => x.front && x.meaning);
        setFileCards(list);
      } catch {
        showToast('Tệp JSON thẻ không hợp lệ.');
      }
      return;
    }

    const sep = file.name.endsWith('.tsv') ? '\t' : ',';
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const dataLines = lines.length > 1 && /english|front|term/i.test(lines[0]) ? lines.slice(1) : lines;
    const parsed = dataLines
      .map((line) => {
        const idx = line.indexOf(sep);
        if (idx === -1) return null;
        return {
          front: line.slice(0, idx).replace(/^"|"$/g, '').trim(),
          meaning: line.slice(idx + 1).replace(/^"|"$/g, '').trim(),
        };
      })
      .filter((x): x is { front: string; meaning: string } => Boolean(x && x.front && x.meaning));
    setFileCards(parsed);
  };

  const handleCreateDeck = () => {
    const cardsToAdd =
      createTab === 'manual'
        ? manualRows.filter((r) => r.front.trim() && r.meaning.trim())
        : createTab === 'paste'
          ? parsedPasteCards
          : fileCards;
    if (cardsToAdd.length === 0) {
      showToast('Chưa có thẻ hợp lệ để tạo.');
      return;
    }
    const added = bulkAddSrsCards(cardsToAdd, deckName.trim() || undefined);
    showToast(`Đã thêm ${added} thẻ mới vào kho ôn tập SRS`);
    setCreateOpen(false);
    setDeckName('');
    setManualRows([{ front: '', meaning: '' }, { front: '', meaning: '' }]);
    setPasteText('');
    setFileCards([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCards.length) setSelectedIds([]);
    else setSelectedIds(filteredCards.map((c) => c.id));
  };

  if (sessionQueue && activeSessionCard) {
    const isTypingMatch =
      typedAnswer.trim() !== '' &&
      normalizeWord(typedAnswer) === normalizeWord(activeSessionCard.front);

    return (
      <div className="stack-md" style={{ maxWidth: 740, margin: '0 auto' }}>
        <div className="card flex-between flex-wrap">
          <div className="flex-row flex-wrap">
            <span className="badge badge-accent">
              Đang ôn · Thẻ {sessionIdx + 1} / {sessionQueue.length}
            </span>
            <button
              className={`btn btn-sm ${srs.autoSpeak ? 'btn-soft' : ''}`}
              onClick={() => updateSrsSettings({ autoSpeak: !srs.autoSpeak })}
            >
              <Volume2 size={14} /> Tự đọc: {srs.autoSpeak ? 'bật' : 'tắt'}
            </button>
            <button
              className={`btn btn-sm ${activeSessionCard.starred ? 'btn-soft' : ''}`}
              title="Đánh dấu thẻ cần xem lại"
              onClick={() =>
                updateSrsCard(activeSessionCard.id, { starred: !activeSessionCard.starred })
              }
            >
              <Star
                size={14}
                fill={activeSessionCard.starred ? '#f59e0b' : 'none'}
                style={{ color: activeSessionCard.starred ? '#f59e0b' : 'currentColor' }}
              />
              {activeSessionCard.starred ? 'Đã đánh dấu' : 'Xem lại'}
            </button>
          </div>
          <div className="flex-row flex-wrap">
            <button
              className="btn btn-sm"
              onClick={() =>
                speakText(activeSessionCard.front, 0.78, prefs.ttsVoice, {
                  voiceName: prefs.ttsVoiceName,
                  style: prefs.narrationStyle,
                })
              }
              title="Nghe chậm 0.78x"
            >
              0.78x Chậm
            </button>
            <select
              className="select"
              style={{ width: 170, padding: '5px 8px', fontSize: '0.82rem' }}
              value={srs.reviewDirection}
              onChange={(e) =>
                updateSrsSettings({
                  reviewDirection: e.target.value as RadState['srs']['reviewDirection'],
                })
              }
            >
              <option value="vi_to_en_type">Việt → gõ Anh</option>
              <option value="en_to_vi_recall">Anh → nhớ Việt</option>
            </select>
            <button className="btn btn-sm" onClick={() => setSessionQueue(null)}>
              Dừng ôn
            </button>
          </div>
        </div>

        <div className="card stack-md" style={{ padding: 28, textAlign: 'center' }}>
          {srs.reviewDirection === 'vi_to_en_type' ? (
            <>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>NGHĨA TIẾNG VIỆT</div>
              <h2 style={{ margin: '4px 0', fontSize: '1.45rem' }}>{activeSessionCard.meaning}</h2>
              {hintShown && !revealed && (
                <div className="badge badge-warning" style={{ margin: '0 auto' }}>
                  Gợi ý: {activeSessionCard.front.slice(0, 2)}... ({activeSessionCard.front.length} ký tự)
                </div>
              )}
              {!revealed ? (
                <form
                  className="stack-sm"
                  style={{ maxWidth: 460, margin: '8px auto 0', width: '100%' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRevealed(true);
                    if (srs.autoSpeak) {
                      speakText(activeSessionCard.front, prefs.ttsRate, prefs.ttsVoice, {
                        voiceName: prefs.ttsVoiceName,
                        style: prefs.narrationStyle,
                      });
                    }
                  }}
                >
                  <input
                    className="input"
                    autoFocus
                    placeholder="Gõ thuật ngữ tiếng Anh..."
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                  />
                  <div className="flex-row" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn btn-sm" onClick={() => setHintShown(true)}>
                      Gợi ý
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Kiểm tra / Xem đáp án
                    </button>
                  </div>
                </form>
              ) : (
                <div className="stack-sm" style={{ marginTop: 8 }}>
                  {typedAnswer.trim() && (
                    <span
                      className={`badge ${isTypingMatch ? 'badge-success' : 'badge-danger'}`}
                      style={{ margin: '0 auto' }}
                    >
                      {isTypingMatch ? 'Chính xác!' : `Bạn đã gõ: "${typedAnswer}"`}
                    </span>
                  )}
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {activeSessionCard.front}
                  </div>
                  {activeSessionCard.ipa && (
                    <div className="mono" style={{ color: 'var(--text-muted)' }}>
                      {activeSessionCard.ipa}
                    </div>
                  )}
                  {activeSessionCard.wordRoot && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Gốc từ: {activeSessionCard.wordRoot}
                    </div>
                  )}
                  <div className="flex-row" style={{ justifyContent: 'center' }}>
                    <button
                      className="btn btn-sm btn-soft"
                      onClick={() =>
                        speakText(activeSessionCard.front, prefs.ttsRate, prefs.ttsVoice, {
                          voiceName: prefs.ttsVoiceName,
                          style: prefs.narrationStyle,
                        })
                      }
                    >
                      <Volume2 size={14} /> Nghe lại
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>THUẬT NGỮ</div>
              <h2 style={{ margin: '4px 0', fontSize: '1.65rem', color: 'var(--accent)' }}>
                {activeSessionCard.front}
              </h2>
              {activeSessionCard.ipa && (
                <div className="mono" style={{ color: 'var(--text-muted)' }}>
                  {activeSessionCard.ipa}
                </div>
              )}
              <div className="flex-row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn btn-sm btn-soft"
                  onClick={() =>
                    speakText(activeSessionCard.front, prefs.ttsRate, prefs.ttsVoice, {
                      voiceName: prefs.ttsVoiceName,
                      style: prefs.narrationStyle,
                    })
                  }
                >
                  <Volume2 size={14} /> Nghe phát âm
                </button>
              </div>
              {!revealed ? (
                <button
                  className="btn btn-primary"
                  style={{ margin: '12px auto 0' }}
                  onClick={() => setRevealed(true)}
                >
                  Lật thẻ (Space)
                </button>
              ) : (
                <div className="card-subtle stack-sm" style={{ marginTop: 10 }}>
                  <div className="flex-row" style={{ justifyContent: 'center' }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => setHideMeaningDuringRecall((v) => !v)}
                    >
                      {hideMeaningDuringRecall ? 'Hiện nghĩa tiếng Việt' : 'Ẩn nghĩa tiếng Việt'}
                    </button>
                  </div>
                  {!hideMeaningDuringRecall && (
                    <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                      {activeSessionCard.meaning}
                    </div>
                  )}
                  {activeSessionCard.wordRoot && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Gốc từ: {activeSessionCard.wordRoot}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {revealed && (
            <div className="grid-4" style={{ marginTop: 18 }}>
              {SM2_OPTIONS.map((opt) => (
                <button
                  key={opt.rating}
                  className={`btn ${opt.rating === 1 ? 'btn-danger' : opt.rating >= 3 ? 'btn-soft' : ''}`}
                  style={{ flexDirection: 'column', padding: '10px 8px', gap: 2 }}
                  onClick={() => handleRate(opt.rating)}
                >
                  <span>
                    <span className="mono" style={{ opacity: 0.7 }}>
                      [{opt.keyHint}]
                    </span>{' '}
                    {opt.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{opt.baseIntervalLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="split-layout">
      <aside className="card stack-sm">
        <div className="flex-between">
          <strong>Thư mục thẻ SRS</strong>
          <button
            className="btn btn-sm btn-icon"
            title="Thêm thư mục mới"
            onClick={() => setNewFolderOpen((v) => !v)}
          >
            <FolderPlus size={15} />
          </button>
        </div>

        {newFolderOpen && (
          <form
            className="stack-sm card-subtle"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newFolderName.trim()) return;
              createSrsFolder(newFolderName);
              setNewFolderName('');
              setNewFolderOpen(false);
            }}
          >
            <input
              className="input"
              placeholder="Tên thư mục..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="flex-row">
              <button type="submit" className="btn btn-sm btn-primary">
                Tạo
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setNewFolderOpen(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        <button
          className={`nav-link ${selectedFolder === 'all' ? 'active' : ''}`}
          style={{ justifyContent: 'space-between' }}
          onClick={() => setSelectedFolder('all')}
        >
          <span>Tất cả thẻ</span>
          <span className="badge">{srs.cards.length}</span>
        </button>

        <button
          className={`nav-link ${selectedFolder === 'starred' ? 'active' : ''}`}
          style={{ justifyContent: 'space-between' }}
          onClick={() => setSelectedFolder('starred')}
        >
          <span>★ Đã đánh dấu</span>
          <span className="badge">{srs.cards.filter((c) => c.starred).length}</span>
        </button>

        {srs.folders.map((folder) => {
          const count = srs.cards.filter((c) => c.folderId === folder.id).length;
          return (
            <div key={folder.id} className="flex-between" style={{ gap: 4 }}>
              {renamingId === folder.id ? (
                <form
                  className="flex-row"
                  style={{ flex: 1 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (renameText.trim()) renameSrsFolder(folder.id, renameText);
                    setRenamingId(null);
                  }}
                >
                  <input
                    className="input"
                    style={{ padding: '4px 8px', fontSize: '0.84rem' }}
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-sm btn-primary">
                    <Check size={13} />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className={`nav-link ${selectedFolder === folder.id ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'space-between' }}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    <span className="badge">{count}</span>
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    title="Đổi tên"
                    onClick={() => {
                      setRenamingId(folder.id);
                      setRenameText(folder.name);
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    title="Xóa thư mục"
                    onClick={() => {
                      deleteSrsFolder(folder.id);
                      if (selectedFolder === folder.id) setSelectedFolder('all');
                    }}
                  >
                    <X size={13} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </aside>

      <section className="stack-md">
        <div className="flex-between flex-wrap">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Ôn tập SRS (CĐHA & DSA)</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Lịch lặp lại ngắt quãng SM-2 lưu bền vững trên thiết bị.
            </p>
          </div>
          <div className="flex-row flex-wrap">
            <button
              className="btn btn-primary"
              disabled={dueCardsInScope.length === 0}
              onClick={() => startSession(dueCardsInScope)}
            >
              <Play size={15} /> Ôn ngay ({dueCardsInScope.length})
            </button>
            {dueCardsInScope.length === 0 && filteredCards.length > 0 && (
              <button className="btn btn-soft" onClick={() => startSession(filteredCards)}>
                Ôn luyện tự do ({filteredCards.length})
              </button>
            )}
            <button className="btn" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Tạo bộ thẻ
            </button>
          </div>
        </div>

        <div className="grid-4">
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tới hạn</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: dueAllCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {dueAllCount}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tổng số thẻ</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700 }}>{srs.cards.length}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đã thuộc (SRS)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--success)' }}>{masteredCount}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Chiều ôn</div>
            <div className="segmented">
              <button
                className={srs.reviewDirection === 'vi_to_en_type' ? 'active' : ''}
                onClick={() => updateSrsSettings({ reviewDirection: 'vi_to_en_type' })}
              >
                Việt → Anh
              </button>
              <button
                className={srs.reviewDirection === 'en_to_vi_recall' ? 'active' : ''}
                onClick={() => updateSrsSettings({ reviewDirection: 'en_to_vi_recall' })}
              >
                Anh → Việt
              </button>
            </div>
          </div>
        </div>

        <div className="flex-row flex-wrap">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
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
              placeholder="Tìm thuật ngữ hoặc nghĩa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 190 }}
            value={srs.sortMode}
            onChange={(e) =>
              updateSrsSettings({ sortMode: e.target.value as RadState['srs']['sortMode'] })
            }
          >
            <option value="due_first">Tới hạn trước</option>
            <option value="newest">Mới thêm trước</option>
            <option value="alpha">Theo bảng chữ cái</option>
            <option value="hardest">Khó nhất trước</option>
            <option value="custom_order">Thứ tự tôi xếp</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="card-subtle flex-between flex-wrap">
            <strong>Đã chọn {selectedIds.length} thẻ</strong>
            <div className="flex-row flex-wrap">
              <select
                className="select"
                style={{ width: 170, padding: '5px 8px', fontSize: '0.82rem' }}
                defaultValue=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  moveSrsCards(selectedIds, val === '__none__' ? null : val);
                  setSelectedIds([]);
                }}
              >
                <option value="">Chuyển vào bộ…</option>
                <option value="__none__">Không thư mục</option>
                {srs.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  deleteSrsCards(selectedIds);
                  setSelectedIds([]);
                }}
              >
                <Trash2 size={14} /> Bỏ {selectedIds.length} thẻ
              </button>
              <button className="btn btn-sm" onClick={() => setSelectedIds([])}>
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {filteredCards.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}>
            <Layers size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>
              Chưa có thẻ nào trong kho ôn tập SRS. Bạn có thể bấm <strong>+ Ôn tập</strong> trong bài học hoặc tạo bộ thẻ mới tại đây.
            </p>
            <div className="flex-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                + Tạo bộ thẻ
              </button>
              <button className="btn" onClick={() => navigate('#/lessons')}>
                Về danh sách bài học
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredCards.length && filteredCards.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ width: 34 }}>★</th>
                  <th>Thuật ngữ</th>
                  <th>Nghĩa tiếng Việt</th>
                  <th>Lịch ôn</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => {
                  const isDue = card.dueAt <= now;
                  const isEditing = editingCardId === card.id;
                  return (
                    <tr key={card.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(card.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, card.id]
                                : prev.filter((id) => id !== card.id)
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                          onClick={() => updateSrsCard(card.id, { starred: !card.starred })}
                          aria-label="Đánh dấu sao"
                        >
                          <Star
                            size={15}
                            fill={card.starred ? '#f59e0b' : 'none'}
                            style={{ color: card.starred ? '#f59e0b' : 'var(--text-muted)' }}
                          />
                        </button>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                          />
                        ) : (
                          <div>
                            <strong>{card.front}</strong>{' '}
                            {card.source === 'custom' && (
                              <span className="badge" style={{ fontSize: '0.68rem' }}>
                                Tự tạo
                              </span>
                            )}
                            {card.ipa && (
                              <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {card.ipa}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            value={editMeaning}
                            onChange={(e) => setEditMeaning(e.target.value)}
                          />
                        ) : (
                          card.meaning
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isDue ? 'badge-danger' : 'badge-success'}`}>
                          {formatDueLabel(card.dueAt, now)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 5 }}>
                          {srs.sortMode === 'custom_order' && (
                            <>
                              <button
                                className="btn btn-sm btn-icon"
                                onClick={() => reorderSrsCard(card.id, 'up')}
                                title="Lên"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                className="btn btn-sm btn-icon"
                                onClick={() => reorderSrsCard(card.id, 'down')}
                                title="Xuống"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </>
                          )}
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  if (editFront.trim() && editMeaning.trim()) {
                                    updateSrsCard(card.id, {
                                      front: editFront.trim(),
                                      meaning: editMeaning.trim(),
                                    });
                                  }
                                  setEditingCardId(null);
                                }}
                              >
                                Lưu
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => setEditingCardId(null)}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-icon"
                                title="Nghe"
                                onClick={() =>
                                  speakText(card.front, prefs.ttsRate, prefs.ttsVoice, {
                                    voiceName: prefs.ttsVoiceName,
                                    style: prefs.narrationStyle,
                                  })
                                }
                              >
                                <Volume2 size={14} />
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => {
                                  setEditingCardId(card.id);
                                  setEditFront(card.front);
                                  setEditMeaning(card.meaning);
                                }}
                              >
                                Sửa
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteSrsCards([card.id])}
                              >
                                Bỏ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCards.length > visibleLimit && (
              <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-sm btn-soft"
                  onClick={() => setVisibleLimit((n) => n + 60)}
                >
                  Hiển thị thêm (+60) · Đang xem {visibleCards.length}/{filteredCards.length} thẻ
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {createOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="backdrop" onClick={() => setCreateOpen(false)}>
            <div className="modal-box stack-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between">
              <h3 style={{ margin: 0 }}>Tạo bộ thẻ SRS của bạn</h3>
              <button className="btn btn-icon btn-sm" onClick={() => setCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="stack-sm">
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Tên thư mục / bộ thẻ (tùy chọn)</label>
              <input
                className="input"
                placeholder="VD: Thuật ngữ DSA Thần kinh, CĐHA Bụng..."
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />
            </div>

            <div className="segmented">
              <button
                className={createTab === 'manual' ? 'active' : ''}
                onClick={() => setCreateTab('manual')}
              >
                Nhập tay
              </button>
              <button
                className={createTab === 'paste' ? 'active' : ''}
                onClick={() => setCreateTab('paste')}
              >
                Dán danh sách
              </button>
              <button
                className={createTab === 'file' ? 'active' : ''}
                onClick={() => setCreateTab('file')}
              >
                Nhập từ file
              </button>
            </div>

            {createTab === 'manual' && (
              <div className="stack-sm">
                {manualRows.map((row, i) => (
                  <div key={i} className="grid-2" style={{ gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Mặt trước (Tiếng Anh)"
                      value={row.front}
                      onChange={(e) =>
                        setManualRows((prev) =>
                          prev.map((r, idx) => (idx === i ? { ...r, front: e.target.value } : r))
                        )
                      }
                    />
                    <input
                      className="input"
                      placeholder="Nghĩa tiếng Việt"
                      value={row.meaning}
                      onChange={(e) =>
                        setManualRows((prev) =>
                          prev.map((r, idx) => (idx === i ? { ...r, meaning: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                ))}
                <button
                  className="btn btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setManualRows((prev) => [...prev, { front: '', meaning: '' }])}
                >
                  + Thêm dòng
                </button>
              </div>
            )}

            {createTab === 'paste' && (
              <div className="stack-sm">
                <div className="flex-row flex-wrap" style={{ fontSize: '0.82rem' }}>
                  <span>Ngăn cách cột:</span>
                  <button
                    className={`chip ${colSep === 'tab' ? 'active' : ''}`}
                    onClick={() => setColSep('tab')}
                  >
                    Tab
                  </button>
                  <button
                    className={`chip ${colSep === 'comma' ? 'active' : ''}`}
                    onClick={() => setColSep('comma')}
                  >
                    Dấu phẩy (,)
                  </button>
                  <span>Ngăn cách thẻ:</span>
                  <button
                    className={`chip ${rowSep === 'newline' ? 'active' : ''}`}
                    onClick={() => setRowSep('newline')}
                  >
                    Xuống dòng
                  </button>
                  <button
                    className={`chip ${rowSep === 'semicolon' ? 'active' : ''}`}
                    onClick={() => setRowSep('semicolon')}
                  >
                    Chấm phẩy (;)
                  </button>
                </div>
                <textarea
                  className="textarea"
                  placeholder={colSep === 'comma' ? 'thrombectomy, lấy huyết khối\npenumbra, vùng tranh tối tranh sáng' : 'thrombectomy\tlấy huyết khối'}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <span className="badge badge-accent">
                  Xem trước: {parsedPasteCards.length} thẻ hợp lệ
                </span>
              </div>
            )}

            {createTab === 'file' && (
              <div className="stack-sm">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Hỗ trợ `.csv`, `.tsv`, `.txt`, `.json` (Cột A = Tiếng Anh, Cột B = Nghĩa Việt).
                </div>
                {fileCards.length > 0 && (
                  <span className="badge badge-success">
                    Đã phân tích {fileCards.length} thẻ sẵn sàng thêm.
                  </span>
                )}
              </div>
            )}

            <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setCreateOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleCreateDeck}>
                Tạo bộ thẻ
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};
