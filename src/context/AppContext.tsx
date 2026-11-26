import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppPreferences,
  AppsScriptSyncConfig,
  BackupPayload,
  LessonPack,
  LessonProgress,
  MasteredEntry,
  RadState,
  SkillKey,
  SrsCard,
  SubspecialtyDef,
  VocabItem,
} from '../types/schema';
import {
  extractPayloadTimestamp,
  isCloudNewer,
  isValidAppsScriptUrl,
  pullStateFromCloud,
  pushStateToCloud,
} from '../utils/cloudSync';
import { normalizeLessonInput, slugifyKey } from '../utils/normalizer';
import { sanitizePlainText, sanitizeSyncUrl } from '../utils/security';
import { scheduleSm2, Sm2Rating } from '../utils/sm2';
import {
  computeStreak,
  deleteImportedLesson,
  downloadJsonFile,
  getDefaultRadState,
  getTodayIso,
  loadImportedLessons,
  loadPreferences,
  loadRadState,
  mergePreferencesDeep,
  replaceAllImportedLessons,
  saveImportedLesson,
  savePreferences,
  saveRadState,
} from '../utils/storage';

export type CloudSyncStatus = 'idle' | 'pushing' | 'pulling' | 'error';

interface AppContextValue {
  prefs: AppPreferences;
  state: RadState;
  lessons: LessonPack[];
  subspecialties: SubspecialtyDef[];
  getSubspecialtyLabel: (id: string) => string;
  addSubspecialty: (label: string) => string;
  renameSubspecialty: (id: string, newLabel: string) => void;
  deleteSubspecialty: (id: string) => void;
  dueCount: number;
  zenMode: boolean;
  setZenMode: (v: boolean) => void;
  guideOpen: boolean;
  setGuideOpen: (v: boolean) => void;
  updatePrefs: (patch: Partial<AppPreferences>) => void;
  updateReminder: (patch: Partial<AppPreferences['reminder']>) => void;
  updateAppsScriptSync: (patch: Partial<AppsScriptSyncConfig>) => void;
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  pushToCloud: (silent?: boolean) => Promise<boolean>;
  pullFromCloud: (force?: boolean) => Promise<'updated' | 'up_to_date' | 'error'>;
  addXp: (amount: number) => void;
  markSkillComplete: (lessonId: string, skill: SkillKey, bonusXp?: number, stars?: number) => void;
  saveWritingDraft: (lessonId: string, text: string) => void;
  toggleParaphraseDone: (lessonId: string, taskId: string) => void;
  saveNotebook: (lessonId: string, content: string) => void;
  addLessonVocab: (lessonId: string, item: VocabItem, alsoAddToSrs?: boolean) => void;
  bulkAddLessonVocab: (lessonId: string, items: VocabItem[], alsoAddToSrs?: boolean) => number;
  removeLessonVocab: (lessonId: string, termKey: string) => void;
  toggleMastered: (lesson: LessonPack, item: VocabItem) => void;
  removeMastered: (termKey: string) => void;
  addCardToSrs: (cardInput: {
    front: string;
    meaning: string;
    ipa?: string;
    wordRoot?: string;
    termKey?: string;
    source: 'custom' | 'lesson';
    lessonId?: string;
    folderId?: string | null;
  }) => boolean;
  bulkAddSrsCards: (
    cards: Array<{ front: string; meaning: string; ipa?: string }>,
    folderName?: string
  ) => number;
  rateSrsCard: (cardId: string, rating: Sm2Rating) => void;
  updateSrsCard: (cardId: string, patch: Partial<SrsCard>) => void;
  deleteSrsCards: (cardIds: string[]) => void;
  moveSrsCards: (cardIds: string[], folderId: string | null) => void;
  reorderSrsCard: (cardId: string, direction: 'up' | 'down') => void;
  createSrsFolder: (name: string) => string;
  renameSrsFolder: (id: string, name: string) => void;
  deleteSrsFolder: (id: string) => void;
  updateSrsSettings: (patch: Partial<RadState['srs']>) => void;
  importLessons: (packs: LessonPack[]) => Promise<void>;
  updateImportedLessonMeta: (
    id: string,
    patch: { subspecialty?: string; sourceBook?: string }
  ) => Promise<void>;
  removeImportedLesson: (id: string) => Promise<void>;
  exportFullBackup: (includeImportedLessons: boolean) => void;
  restoreFullBackup: (
    raw: unknown,
    options?: { preserveSyncConfig?: boolean }
  ) => Promise<void>;
  resetProgress: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function emptyLessonProgress(): LessonProgress {
  return {
    skillsCompleted: {
      vocabulary: false,
      grammar: false,
      listening: false,
      reading: false,
      writing: false,
      speaking: false,
    },
    stars: 0,
    writingDraft: '',
    paraphraseDoneIds: [],
    lastOpenedAt: Date.now(),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  const [state, setState] = useState<RadState>(() => loadRadState());
  const [builtInLessons, setBuiltInLessons] = useState<LessonPack[]>([]);
  const [importedLessons, setImportedLessons] = useState<LessonPack[]>([]);
  const [zenMode, setZenMode] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [changeCounter, setChangeCounter] = useState(0);

  // Refs for debounced persistence, beforeunload flush, and avoiding auto-push loops
  const latestStateRef = useRef<RadState>(state);
  const latestPrefsRef = useRef<AppPreferences>(prefs);
  const latestImportedRef = useRef<LessonPack[]>(importedLessons);
  const isStateDirtyRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const skipNextAutoPushRef = useRef(false);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    latestPrefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    latestImportedRef.current = importedLessons;
  }, [importedLessons]);

  const showToast = useCallback((msg: string) => {
    setToast(sanitizePlainText(msg, 300));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Apply theme & font size to <html> and persist preferences
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const resolved =
        prefs.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : prefs.theme;
      root.setAttribute('data-theme', resolved);
    };
    applyTheme();
    root.setAttribute('data-font', prefs.fontSize);
    root.setAttribute('data-track', 'rad_dsa');
    savePreferences(prefs);

    if (prefs.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [prefs]);

  useEffect(() => {
    document.body.classList.toggle('zen-active', zenMode);
    return () => document.body.classList.remove('zen-active');
  }, [zenMode]);

  // Debounced (~400ms) save of RadState to localStorage
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    isStateDirtyRef.current = true;
    const timer = window.setTimeout(() => {
      saveRadState(latestStateRef.current);
      isStateDirtyRef.current = false;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);

  // Immediate flush when user navigates away or closes tab (critical for iPad/Safari/Mobile)
  useEffect(() => {
    const flushNow = () => {
      if (isStateDirtyRef.current) {
        saveRadState(latestStateRef.current);
        isStateDirtyRef.current = false;
      }
    };
    window.addEventListener('beforeunload', flushNow);
    window.addEventListener('pagehide', flushNow);
    return () => {
      window.removeEventListener('beforeunload', flushNow);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

  // Helper that stamps lastModifiedAt automatically on every user mutation
  const mutateState = useCallback((updater: (prev: RadState) => RadState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      return {
        ...next,
        lastModifiedAt: new Date().toISOString(),
      };
    });
    setChangeCounter((c) => c + 1);
  }, []);

  // Load built-in CĐHA/DSA starter pack + IndexedDB imported packs
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('./lessons/index.json');
        if (res.ok) {
          const manifest = (await res.json()) as { files?: string[] };
          const loaded: LessonPack[] = [];
          for (const file of manifest.files || []) {
            const fRes = await fetch(`./lessons/${file}`);
            if (fRes.ok) {
              const json = await fRes.json();
              const { lessons } = normalizeLessonInput(json);
              lessons.forEach((l) => loaded.push({ ...l, builtIn: true }));
            }
          }
          if (active) setBuiltInLessons(loaded);
        }
      } catch {
        // ignore offline fetch issues
      }

      try {
        const stored = await loadImportedLessons();
        if (active) setImportedLessons(stored);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const lessons = useMemo(() => {
    const map = new Map<string, LessonPack>();
    builtInLessons.forEach((l) => map.set(l.id, l));
    importedLessons.forEach((l) => map.set(l.id, { ...l, builtIn: false }));
    return Array.from(map.values()).map((lesson) => {
      const extras = state.customVocabByLesson[lesson.id] || [];
      if (extras.length === 0) return lesson;
      return {
        ...lesson,
        vocabulary: [...extras, ...lesson.vocabulary],
      };
    });
  }, [builtInLessons, importedLessons, state.customVocabByLesson]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const dueCount = useMemo(
    () => state.srs.cards.filter((c) => c.dueAt <= nowTick).length,
    [state.srs.cards, nowTick]
  );

  const updatePrefs = useCallback((patch: Partial<AppPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateReminder = useCallback((patch: Partial<AppPreferences['reminder']>) => {
    setPrefs((prev) => ({
      ...prev,
      reminder: { ...prev.reminder, ...patch },
    }));
  }, []);

  const updateAppsScriptSync = useCallback((patch: Partial<AppsScriptSyncConfig>) => {
    setPrefs((prev) => ({
      ...prev,
      appsScriptSync: {
        ...prev.appsScriptSync,
        ...patch,
        url:
          patch.url !== undefined
            ? sanitizePlainText(patch.url, 500).trim()
            : prev.appsScriptSync.url,
      },
    }));
    setSyncError(null);
  }, []);

  // Dynamic Subspecialty CRUD
  const getSubspecialtyLabel = useCallback(
    (id: string) => {
      const found = prefs.subspecialties.find((s) => s.id === id);
      return found ? found.label : id || 'Chưa phân loại';
    },
    [prefs.subspecialties]
  );

  const addSubspecialty = useCallback(
    (label: string) => {
      const cleanLabel = sanitizePlainText(label, 80).trim();
      if (!cleanLabel) return '';
      const baseId = slugifyKey(cleanLabel);
      let finalId = baseId;
      setPrefs((prev) => {
        if (prev.subspecialties.some((s) => s.id === finalId)) {
          finalId = `${baseId}_${Date.now().toString(36).slice(-3)}`;
        }
        return {
          ...prev,
          subspecialties: [...prev.subspecialties, { id: finalId, label: cleanLabel }],
        };
      });
      mutateState((prev) => ({ ...prev }));
      showToast(`Đã thêm nhãn phân môn "${cleanLabel}"`);
      return finalId;
    },
    [mutateState, showToast]
  );

  const renameSubspecialty = useCallback(
    (id: string, newLabel: string) => {
      const cleanLabel = sanitizePlainText(newLabel, 80).trim();
      if (!cleanLabel) return;
      setPrefs((prev) => ({
        ...prev,
        subspecialties: prev.subspecialties.map((s) =>
          s.id === id ? { ...s, label: cleanLabel } : s
        ),
      }));
      mutateState((prev) => ({ ...prev }));
      showToast(`Đã đổi tên phân môn thành "${cleanLabel}"`);
    },
    [mutateState, showToast]
  );

  const deleteSubspecialty = useCallback(
    (id: string) => {
      setPrefs((prev) => {
        if (prev.subspecialties.length <= 1) return prev;
        return {
          ...prev,
          subspecialties: prev.subspecialties.filter((s) => s.id !== id),
        };
      });
      mutateState((prev) => ({ ...prev }));
      showToast('Đã xóa nhãn phân môn');
    },
    [mutateState, showToast]
  );

  const addXp = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const today = getTodayIso();
      mutateState((prev) => {
        const weekly = prev.weeklyActivity.includes(today)
          ? prev.weeklyActivity
          : [...prev.weeklyActivity, today].slice(-60);
        return {
          ...prev,
          xp: prev.xp + amount,
          weeklyActivity: weekly,
          streakDays: computeStreak(weekly),
          dailyXpLog: {
            ...prev.dailyXpLog,
            [today]: (prev.dailyXpLog[today] || 0) + amount,
          },
        };
      });
    },
    [mutateState]
  );

  const markSkillComplete = useCallback(
    (lessonId: string, skill: SkillKey, bonusXp = 20, stars?: number) => {
      const today = getTodayIso();
      mutateState((prev) => {
        const cur = prev.lessonProgress[lessonId] || emptyLessonProgress();
        const alreadyDone = cur.skillsCompleted[skill];
        const gained = alreadyDone ? Math.round(bonusXp * 0.25) : bonusXp;
        const weekly = prev.weeklyActivity.includes(today)
          ? prev.weeklyActivity
          : [...prev.weeklyActivity, today].slice(-60);
        return {
          ...prev,
          xp: prev.xp + gained,
          weeklyActivity: weekly,
          streakDays: computeStreak(weekly),
          dailyXpLog: {
            ...prev.dailyXpLog,
            [today]: (prev.dailyXpLog[today] || 0) + gained,
          },
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...cur,
              skillsCompleted: { ...cur.skillsCompleted, [skill]: true },
              stars: stars !== undefined ? Math.max(cur.stars, stars) : cur.stars,
              lastOpenedAt: Date.now(),
            },
          },
        };
      });
    },
    [mutateState]
  );

  const saveWritingDraft = useCallback(
    (lessonId: string, text: string) => {
      const clean = sanitizePlainText(text, 30000);
      mutateState((prev) => {
        const cur = prev.lessonProgress[lessonId] || emptyLessonProgress();
        return {
          ...prev,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: { ...cur, writingDraft: clean, lastOpenedAt: Date.now() },
          },
        };
      });
    },
    [mutateState]
  );

  const toggleParaphraseDone = useCallback(
    (lessonId: string, taskId: string) => {
      mutateState((prev) => {
        const cur = prev.lessonProgress[lessonId] || emptyLessonProgress();
        const set = new Set(cur.paraphraseDoneIds);
        if (set.has(taskId)) set.delete(taskId);
        else set.add(taskId);
        return {
          ...prev,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...cur,
              paraphraseDoneIds: Array.from(set),
              lastOpenedAt: Date.now(),
            },
          },
        };
      });
    },
    [mutateState]
  );

  const saveNotebook = useCallback(
    (lessonId: string, content: string) => {
      const clean = sanitizePlainText(content, 20000);
      mutateState((prev) => ({
        ...prev,
        notebooks: { ...prev.notebooks, [lessonId]: clean },
      }));
    },
    [mutateState]
  );

  const addCardToSrs = useCallback(
    (input: {
      front: string;
      meaning: string;
      ipa?: string;
      wordRoot?: string;
      termKey?: string;
      source: 'custom' | 'lesson';
      lessonId?: string;
      folderId?: string | null;
    }): boolean => {
      const cleanFront = sanitizePlainText(input.front, 300).trim();
      const cleanMeaning = sanitizePlainText(input.meaning, 500).trim();
      if (!cleanFront || !cleanMeaning) return false;
      let added = false;
      mutateState((prev) => {
        const exists = prev.srs.cards.some(
          (c) => c.front.trim().toLowerCase() === cleanFront.toLowerCase()
        );
        if (exists) return prev;
        added = true;
        const now = Date.now();
        const newCard: SrsCard = {
          id: `card_${now}_${Math.random().toString(36).slice(2, 7)}`,
          termKey: input.termKey,
          front: cleanFront,
          meaning: cleanMeaning,
          ipa: sanitizePlainText(input.ipa || '', 120),
          wordRoot: sanitizePlainText(input.wordRoot || '', 250) || undefined,
          source: input.source,
          lessonId: input.lessonId,
          folderId: input.folderId ?? null,
          starred: false,
          orderIndex: prev.srs.cards.length,
          status: 'learning',
          dueAt: now + 60 * 1000,
          intervalSeconds: 60,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: now,
        };
        return {
          ...prev,
          srs: { ...prev.srs, cards: [newCard, ...prev.srs.cards] },
        };
      });
      if (added) showToast(`Đã thêm "${cleanFront}" vào hàng ôn tập SRS`);
      else showToast(`"${cleanFront}" đã có sẵn trong bộ ôn tập SRS`);
      return added;
    },
    [mutateState, showToast]
  );

  const addLessonVocab = useCallback(
    (lessonId: string, item: VocabItem, alsoAddToSrs = false) => {
      const cleanTerm = sanitizePlainText(item.term, 200).trim();
      const cleanMeaning = sanitizePlainText(item.meaningVi, 400).trim();
      if (!cleanTerm || !cleanMeaning) return;

      const cleanItem: VocabItem = {
        termKey:
          item.termKey || `custom_${slugifyKey(cleanTerm)}_${Date.now().toString(36).slice(-3)}`,
        term: cleanTerm,
        ipa: sanitizePlainText(item.ipa, 120).trim(),
        pos: sanitizePlainText(item.pos || 'term', 40).trim(),
        wordRoot: sanitizePlainText(item.wordRoot, 250).trim(),
        meaningVi: cleanMeaning,
        noteVi: sanitizePlainText(item.noteVi, 500).trim(),
        exampleEn: sanitizePlainText(item.exampleEn, 600).trim(),
        exampleVi: sanitizePlainText(item.exampleVi, 600).trim(),
        isCustom: true,
      };

      mutateState((prev) => {
        const cur = prev.customVocabByLesson[lessonId] || [];
        return {
          ...prev,
          customVocabByLesson: {
            ...prev.customVocabByLesson,
            [lessonId]: [cleanItem, ...cur],
          },
        };
      });

      if (alsoAddToSrs) {
        addCardToSrs({
          front: cleanItem.term,
          meaning: cleanItem.meaningVi,
          ipa: cleanItem.ipa,
          wordRoot: cleanItem.wordRoot,
          termKey: cleanItem.termKey,
          source: 'lesson',
          lessonId,
        });
      } else {
        showToast(`Đã thêm thẻ "${cleanItem.term}" vào bài học!`);
      }
    },
    [mutateState, addCardToSrs, showToast]
  );

  const bulkAddLessonVocab = useCallback(
    (lessonId: string, items: VocabItem[], alsoAddToSrs = false): number => {
      const now = Date.now();
      const cleanedList: VocabItem[] = [];
      const seenBatch = new Set<string>();

      items.forEach((item, idx) => {
        const cleanTerm = sanitizePlainText(item.term, 200).trim();
        const cleanMeaning = sanitizePlainText(item.meaningVi, 400).trim();
        if (!cleanTerm || !cleanMeaning) return;
        const lower = cleanTerm.toLowerCase();
        if (seenBatch.has(lower)) return;
        seenBatch.add(lower);

        cleanedList.push({
          termKey:
            sanitizePlainText(item.termKey, 100).trim() ||
            `custom_${slugifyKey(cleanTerm)}_${(now + idx).toString(36).slice(-4)}`,
          term: cleanTerm,
          ipa: sanitizePlainText(item.ipa, 120).trim(),
          pos: sanitizePlainText(item.pos || 'term', 40).trim(),
          wordRoot: sanitizePlainText(item.wordRoot, 250).trim(),
          meaningVi: cleanMeaning,
          noteVi: sanitizePlainText(item.noteVi, 500).trim(),
          exampleEn: sanitizePlainText(item.exampleEn, 600).trim(),
          exampleVi: sanitizePlainText(item.exampleVi, 600).trim(),
          isCustom: true,
        });
      });

      if (cleanedList.length === 0) return 0;

      const currentSnap = latestStateRef.current;
      const existingCustomSnap = currentSnap.customVocabByLesson[lessonId] || [];
      const existingTermSetSnap = new Set(
        existingCustomSnap.map((v) => v.term.trim().toLowerCase())
      );
      const toInsertLesson = cleanedList.filter(
        (v) => !existingTermSetSnap.has(v.term.toLowerCase())
      );
      const addedLessonCount = toInsertLesson.length;

      let addedSrsCount = 0;
      if (alsoAddToSrs && addedLessonCount > 0) {
        const existingSrsSnap = new Set(
          currentSnap.srs.cards.map((c) => c.front.trim().toLowerCase())
        );
        toInsertLesson.forEach((v) => {
          if (!existingSrsSnap.has(v.term.toLowerCase())) {
            existingSrsSnap.add(v.term.toLowerCase());
            addedSrsCount += 1;
          }
        });
      }

      if (addedLessonCount === 0) {
        showToast('Các thuật ngữ này đã có sẵn trong danh sách tự thêm của bài học.');
        return 0;
      }

      mutateState((prev) => {
        const existingCustom = prev.customVocabByLesson[lessonId] || [];
        const existingTermSet = new Set(existingCustom.map((v) => v.term.trim().toLowerCase()));
        const freshLessonCards = cleanedList.filter(
          (v) => !existingTermSet.has(v.term.toLowerCase())
        );
        if (freshLessonCards.length === 0) return prev;

        let nextSrsCards = prev.srs.cards;
        if (alsoAddToSrs) {
          const existingSrsFronts = new Set(
            prev.srs.cards.map((c) => c.front.trim().toLowerCase())
          );
          const newSrs: SrsCard[] = [];
          freshLessonCards.forEach((v, i) => {
            if (existingSrsFronts.has(v.term.toLowerCase())) return;
            existingSrsFronts.add(v.term.toLowerCase());
            newSrs.push({
              id: `card_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
              termKey: v.termKey,
              front: v.term,
              meaning: v.meaningVi,
              ipa: v.ipa,
              wordRoot: v.wordRoot || undefined,
              source: 'lesson',
              lessonId,
              folderId: null,
              starred: false,
              orderIndex: prev.srs.cards.length + i,
              status: 'learning',
              dueAt: now + 60 * 1000,
              intervalSeconds: 60,
              easeFactor: 2.5,
              repetitions: 0,
              createdAt: now,
            });
          });
          if (newSrs.length > 0) {
            nextSrsCards = [...newSrs, ...prev.srs.cards];
          }
        }

        return {
          ...prev,
          customVocabByLesson: {
            ...prev.customVocabByLesson,
            [lessonId]: [...freshLessonCards, ...existingCustom],
          },
          srs: {
            ...prev.srs,
            cards: nextSrsCards,
          },
        };
      });

      showToast(
        alsoAddToSrs && addedSrsCount > 0
          ? `Đã thêm ${addedLessonCount} thẻ vào bài học & ${addedSrsCount} thẻ vào hàng SRS!`
          : `Đã thêm ${addedLessonCount} thẻ mới vào bài học!`
      );

      return addedLessonCount;
    },
    [mutateState, showToast]
  );

  const removeLessonVocab = useCallback(
    (lessonId: string, termKey: string) => {
      mutateState((prev) => {
        const cur = prev.customVocabByLesson[lessonId] || [];
        return {
          ...prev,
          customVocabByLesson: {
            ...prev.customVocabByLesson,
            [lessonId]: cur.filter((v) => v.termKey !== termKey),
          },
        };
      });
      showToast('Đã xóa thẻ tự thêm khỏi bài học');
    },
    [mutateState, showToast]
  );

  const toggleMastered = useCallback(
    (lesson: LessonPack, item: VocabItem) => {
      let added = false;
      mutateState((prev) => {
        const next = { ...prev.masteredBank };
        if (next[item.termKey]) {
          delete next[item.termKey];
        } else {
          added = true;
          const entry: MasteredEntry = {
            termKey: item.termKey,
            term: item.term,
            ipa: item.ipa,
            wordRoot: item.wordRoot,
            meaningVi: item.meaningVi,
            subspecialty: lesson.meta.subspecialty,
            sourceBook: lesson.meta.sourceBook,
            lessonId: lesson.id,
            masteredAt: Date.now(),
          };
          next[item.termKey] = entry;
        }
        return { ...prev, masteredBank: next };
      });
      if (added) {
        addXp(5);
        showToast(`Đã lưu "${item.term}" vào Mastered Bank (+5 XP)`);
      } else {
        showToast(`Đã bỏ "${item.term}" khỏi Mastered Bank`);
      }
    },
    [mutateState, addXp, showToast]
  );

  const removeMastered = useCallback(
    (termKey: string) => {
      mutateState((prev) => {
        const next = { ...prev.masteredBank };
        delete next[termKey];
        return { ...prev, masteredBank: next };
      });
    },
    [mutateState]
  );

  const bulkAddSrsCards = useCallback(
    (cards: Array<{ front: string; meaning: string; ipa?: string }>, folderName?: string) => {
      let count = 0;
      mutateState((prev) => {
        let folderId: string | null = null;
        let folders = [...prev.srs.folders];
        const cleanFolder = sanitizePlainText(folderName || '', 80).trim();
        if (cleanFolder) {
          const existing = folders.find(
            (f) => f.name.toLowerCase() === cleanFolder.toLowerCase()
          );
          if (existing) {
            folderId = existing.id;
          } else {
            folderId = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            folders = [...folders, { id: folderId, name: cleanFolder }];
          }
        }
        const existingFronts = new Set(prev.srs.cards.map((c) => c.front.trim().toLowerCase()));
        const now = Date.now();
        const created: SrsCard[] = [];
        cards.forEach((item, i) => {
          const f = sanitizePlainText(item.front, 300).trim();
          const m = sanitizePlainText(item.meaning, 500).trim();
          if (!f || !m || existingFronts.has(f.toLowerCase())) return;
          existingFronts.add(f.toLowerCase());
          created.push({
            id: `card_${now}_${i}_${Math.random().toString(36).slice(2, 5)}`,
            front: f,
            meaning: m,
            ipa: sanitizePlainText(item.ipa || '', 120),
            source: 'custom',
            folderId,
            starred: false,
            orderIndex: prev.srs.cards.length + i,
            status: 'learning',
            dueAt: now,
            intervalSeconds: 60,
            easeFactor: 2.5,
            repetitions: 0,
            createdAt: now,
          });
        });
        count = created.length;
        return {
          ...prev,
          srs: {
            ...prev.srs,
            folders,
            cards: [...created, ...prev.srs.cards],
          },
        };
      });
      setNowTick(Date.now() + 1000);
      return count;
    },
    [mutateState]
  );

  const rateSrsCard = useCallback(
    (cardId: string, rating: Sm2Rating) => {
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          cards: prev.srs.cards.map((c) => (c.id === cardId ? scheduleSm2(c, rating) : c)),
        },
      }));
      addXp(rating >= 3 ? 5 : 2);
    },
    [mutateState, addXp]
  );

  const updateSrsCard = useCallback(
    (cardId: string, patch: Partial<SrsCard>) => {
      const cleanPatch: Partial<SrsCard> = { ...patch };
      if (patch.front !== undefined) cleanPatch.front = sanitizePlainText(patch.front, 300).trim();
      if (patch.meaning !== undefined)
        cleanPatch.meaning = sanitizePlainText(patch.meaning, 500).trim();
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          cards: prev.srs.cards.map((c) => (c.id === cardId ? { ...c, ...cleanPatch } : c)),
        },
      }));
    },
    [mutateState]
  );

  const deleteSrsCards = useCallback(
    (cardIds: string[]) => {
      const set = new Set(cardIds);
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          cards: prev.srs.cards.filter((c) => !set.has(c.id)),
        },
      }));
    },
    [mutateState]
  );

  const moveSrsCards = useCallback(
    (cardIds: string[], folderId: string | null) => {
      const set = new Set(cardIds);
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          cards: prev.srs.cards.map((c) => (set.has(c.id) ? { ...c, folderId } : c)),
        },
      }));
    },
    [mutateState]
  );

  const reorderSrsCard = useCallback(
    (cardId: string, direction: 'up' | 'down') => {
      mutateState((prev) => {
        const sorted = [...prev.srs.cards].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex((c) => c.id === cardId);
        if (idx === -1) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
        const tmp = sorted[idx];
        sorted[idx] = sorted[swapIdx];
        sorted[swapIdx] = tmp;
        const reindexed = sorted.map((c, i) => ({ ...c, orderIndex: i }));
        return { ...prev, srs: { ...prev.srs, cards: reindexed } };
      });
    },
    [mutateState]
  );

  const createSrsFolder = useCallback(
    (name: string) => {
      const clean = sanitizePlainText(name, 80).trim();
      const id = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (!clean) return id;
      mutateState((prev) => ({
        ...prev,
        srs: { ...prev.srs, folders: [...prev.srs.folders, { id, name: clean }] },
      }));
      return id;
    },
    [mutateState]
  );

  const renameSrsFolder = useCallback(
    (id: string, name: string) => {
      const clean = sanitizePlainText(name, 80).trim();
      if (!clean) return;
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          folders: prev.srs.folders.map((f) => (f.id === id ? { ...f, name: clean } : f)),
        },
      }));
    },
    [mutateState]
  );

  const deleteSrsFolder = useCallback(
    (id: string) => {
      mutateState((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          folders: prev.srs.folders.filter((f) => f.id !== id),
          cards: prev.srs.cards.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)),
        },
      }));
    },
    [mutateState]
  );

  const updateSrsSettings = useCallback(
    (patch: Partial<RadState['srs']>) => {
      mutateState((prev) => ({
        ...prev,
        srs: { ...prev.srs, ...patch },
      }));
    },
    [mutateState]
  );

  const importLessons = useCallback(
    async (packs: LessonPack[]) => {
      for (const pack of packs) {
        await saveImportedLesson(pack);
      }
      const updated = await loadImportedLessons();
      setImportedLessons(updated);
      mutateState((prev) => ({ ...prev }));
      showToast(`Đã nạp thành công ${packs.length} gói bài học vào IndexedDB`);
    },
    [mutateState, showToast]
  );

  const updateImportedLessonMeta = useCallback(
    async (id: string, patch: { subspecialty?: string; sourceBook?: string }) => {
      const target = importedLessons.find((l) => l.id === id);
      if (!target) return;
      const updatedPack: LessonPack = {
        ...target,
        meta: {
          ...target.meta,
          subspecialty: patch.subspecialty ?? target.meta.subspecialty,
          sourceBook:
            patch.sourceBook !== undefined
              ? sanitizePlainText(patch.sourceBook, 150).trim() || 'Tài liệu tự nạp'
              : target.meta.sourceBook,
        },
      };
      await saveImportedLesson(updatedPack);
      setImportedLessons(await loadImportedLessons());
      mutateState((prev) => ({ ...prev }));
      showToast('Đã cập nhật phân môn / đầu sách cho bài học');
    },
    [importedLessons, mutateState, showToast]
  );

  const removeImportedLesson = useCallback(
    async (id: string) => {
      await deleteImportedLesson(id);
      setImportedLessons(await loadImportedLessons());
      mutateState((prev) => ({ ...prev }));
      showToast('Đã xóa gói bài học tự nạp');
    },
    [mutateState, showToast]
  );

  const buildBackupPayload = useCallback((includeImportedLessons: boolean): BackupPayload => {
    const currentState = latestStateRef.current;
    const currentPrefs = latestPrefsRef.current;
    const currentImported = latestImportedRef.current;
    return {
      backupVersion: 3,
      exportedAt: new Date().toISOString(),
      preferences: currentPrefs,
      state: {
        ...currentState,
        lastModifiedAt: currentState.lastModifiedAt || new Date().toISOString(),
      },
      importedLessons: includeImportedLessons ? currentImported : [],
    };
  }, []);

  const exportFullBackup = useCallback(
    (includeImportedLessons: boolean) => {
      saveRadState(latestStateRef.current);
      isStateDirtyRef.current = false;
      const payload = buildBackupPayload(includeImportedLessons);
      downloadJsonFile(`raddsa-backup-${getTodayIso()}.json`, payload);
      showToast('Đã xuất tệp sao lưu toàn bộ dữ liệu (.json)');
    },
    [buildBackupPayload, showToast]
  );

  const restoreFullBackup = useCallback(
    async (raw: unknown, options?: { preserveSyncConfig?: boolean }) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error('Tệp sao lưu không hợp lệ.');
      }
      const obj = raw as Record<string, unknown>;
      const incomingState =
        (obj.state as Partial<RadState> | undefined) ||
        ((obj.tracks as Record<string, Partial<RadState>> | undefined)?.rad_dsa);
      if (!incomingState || typeof incomingState !== 'object') {
        throw new Error('Không tìm thấy dữ liệu tiến độ CĐHA & DSA trong tệp sao lưu.');
      }

      // Deep-merge preferences (reminder, subspecialties, appsScriptSync)
      if (obj.preferences && typeof obj.preferences === 'object') {
        const rawPrefs = obj.preferences as Partial<AppPreferences>;
        const sanitizedSubs = Array.isArray(rawPrefs.subspecialties)
          ? rawPrefs.subspecialties
              .map((s) => ({
                id: sanitizePlainText(s?.id, 80).trim(),
                label: sanitizePlainText(s?.label, 80).trim(),
              }))
              .filter((s) => s.id && s.label)
          : undefined;

        setPrefs((prev) => {
          const merged = mergePreferencesDeep(prev, {
            ...rawPrefs,
            subspecialties:
              sanitizedSubs && sanitizedSubs.length > 0 ? sanitizedSubs : prev.subspecialties,
          });
          if (options?.preserveSyncConfig) {
            return {
              ...merged,
              appsScriptSync: prev.appsScriptSync,
            };
          }
          return merged;
        });
      }

      const restoredTimestamp =
        (typeof incomingState.lastModifiedAt === 'string' && incomingState.lastModifiedAt) ||
        extractPayloadTimestamp(obj);

      const mergedState: RadState = {
        ...getDefaultRadState(),
        ...incomingState,
        lastModifiedAt: restoredTimestamp,
        customVocabByLesson: incomingState.customVocabByLesson || {},
        srs: { ...getDefaultRadState().srs, ...(incomingState.srs || {}) },
      };

      skipNextAutoPushRef.current = true;
      setState(mergedState);
      latestStateRef.current = mergedState;
      saveRadState(mergedState);
      isStateDirtyRef.current = false;

      // Strictly sync IndexedDB whenever backup has 'importedLessons' (including empty [])
      if ('importedLessons' in obj && Array.isArray(obj.importedLessons)) {
        const normalizedPacks: LessonPack[] = [];
        for (const pack of obj.importedLessons) {
          const { lessons: normalized } = normalizeLessonInput(pack);
          normalizedPacks.push(...normalized);
        }
        await replaceAllImportedLessons(normalizedPacks);
        const refreshed = await loadImportedLessons();
        setImportedLessons(refreshed);
        latestImportedRef.current = refreshed;
      }

      showToast('Đã khôi phục toàn bộ dữ liệu từ bản sao lưu!');
    },
    [showToast]
  );

  // Cloud Sync: Push to Google Apps Script Web App
  const pushToCloud = useCallback(
    async (silent = false): Promise<boolean> => {
      const cfg = latestPrefsRef.current.appsScriptSync;
      const cleanUrl = sanitizeSyncUrl(cfg.url);
      if (!cleanUrl || !isValidAppsScriptUrl(cleanUrl)) {
        const msg = 'Vui lòng nhập Apps Script Web App URL hợp lệ (HTTPS).';
        setSyncError(msg);
        if (!silent) showToast(msg);
        return false;
      }

      setSyncStatus('pushing');
      setSyncError(null);
      try {
        saveRadState(latestStateRef.current);
        isStateDirtyRef.current = false;
        const payload = buildBackupPayload(true);
        const { syncedAt } = await pushStateToCloud(cleanUrl, payload);
        setPrefs((prev) => ({
          ...prev,
          appsScriptSync: {
            ...prev.appsScriptSync,
            lastSyncedAt: syncedAt,
          },
        }));
        setSyncStatus('idle');
        if (!silent) showToast('Đã đẩy dữ liệu lên Google Drive thành công!');
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi đẩy dữ liệu lên Google Drive.';
        setSyncStatus('error');
        setSyncError(msg);
        if (!silent) showToast(msg);
        return false;
      }
    },
    [buildBackupPayload, showToast]
  );

  // Cloud Sync: Pull from Google Apps Script Web App
  const pullFromCloud = useCallback(
    async (force = false): Promise<'updated' | 'up_to_date' | 'error'> => {
      const cfg = latestPrefsRef.current.appsScriptSync;
      const cleanUrl = sanitizeSyncUrl(cfg.url);
      if (!cleanUrl || !isValidAppsScriptUrl(cleanUrl)) {
        const msg = 'Vui lòng nhập Apps Script Web App URL hợp lệ (HTTPS).';
        setSyncError(msg);
        showToast(msg);
        return 'error';
      }

      setSyncStatus('pulling');
      setSyncError(null);
      try {
        const { payload, cloudTimestamp } = await pullStateFromCloud(cleanUrl);
        const localTimestamp = latestStateRef.current.lastModifiedAt;

        if (!force && !isCloudNewer(cloudTimestamp, localTimestamp)) {
          setSyncStatus('idle');
          setPrefs((prev) => ({
            ...prev,
            appsScriptSync: {
              ...prev.appsScriptSync,
              lastSyncedAt: new Date().toISOString(),
            },
          }));
          showToast('Dữ liệu trên thiết bị đã là bản mới nhất (không ghi đè).');
          return 'up_to_date';
        }

        await restoreFullBackup(payload, { preserveSyncConfig: true });
        setPrefs((prev) => ({
          ...prev,
          appsScriptSync: {
            ...prev.appsScriptSync,
            lastSyncedAt: new Date().toISOString(),
          },
        }));
        setSyncStatus('idle');
        showToast('Đã kéo & đồng bộ dữ liệu mới nhất từ Google Drive!');
        return 'updated';
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi kéo dữ liệu từ Google Drive.';
        setSyncStatus('error');
        setSyncError(msg);
        showToast(msg);
        return 'error';
      }
    },
    [restoreFullBackup, showToast]
  );

  // Auto-push after changes (3-second debounce)
  useEffect(() => {
    if (changeCounter === 0) return;
    if (skipNextAutoPushRef.current) {
      skipNextAutoPushRef.current = false;
      return;
    }
    const cfg = prefs.appsScriptSync;
    if (!cfg.enabled || !cfg.autoPush || !isValidAppsScriptUrl(cfg.url)) return;

    const timer = window.setTimeout(() => {
      void pushToCloud(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [
    changeCounter,
    prefs.appsScriptSync.enabled,
    prefs.appsScriptSync.autoPush,
    prefs.appsScriptSync.url,
    pushToCloud,
  ]);

  const resetProgress = useCallback(() => {
    mutateState(() => getDefaultRadState());
    showToast('Đã đặt lại toàn bộ tiến độ, SRS và Mastered Bank');
  }, [mutateState, showToast]);

  return (
    <AppContext.Provider
      value={{
        prefs,
        state,
        lessons,
        subspecialties: prefs.subspecialties,
        getSubspecialtyLabel,
        addSubspecialty,
        renameSubspecialty,
        deleteSubspecialty,
        dueCount,
        zenMode,
        setZenMode,
        guideOpen,
        setGuideOpen,
        updatePrefs,
        updateReminder,
        updateAppsScriptSync,
        syncStatus,
        syncError,
        pushToCloud,
        pullFromCloud,
        addXp,
        markSkillComplete,
        saveWritingDraft,
        toggleParaphraseDone,
        saveNotebook,
        addLessonVocab,
        bulkAddLessonVocab,
        removeLessonVocab,
        toggleMastered,
        removeMastered,
        addCardToSrs,
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
        importLessons,
        updateImportedLessonMeta,
        removeImportedLesson,
        exportFullBackup,
        restoreFullBackup,
        resetProgress,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
