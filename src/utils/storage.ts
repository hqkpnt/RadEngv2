import {
  AppPreferences,
  DEFAULT_SUBSPECIALTIES,
  LessonPack,
  RadState,
} from '../types/schema';

export const PREFS_KEY = 'engapp_v2_prefs';
export const RAD_STATE_KEY = 'engapp_v2_state_rad_dsa';

const IDB_NAME = 'engapp_v2_db';
const IDB_STORE = 'lesson_packs';
const IDB_FALLBACK_KEY = 'engapp_v2_imported_lessons_fallback';

export const TREE_STAGES = [
  { stage: 1, name: '01 Hạt giống', minXp: 0, nextXp: 200, emoji: '🌰' },
  { stage: 2, name: '02 Nảy mầm', minXp: 200, nextXp: 500, emoji: '🌱' },
  { stage: 3, name: '03 Phát triển thân', minXp: 500, nextXp: 1000, emoji: '🌿' },
  { stage: 4, name: '04 Phân cành', minXp: 1000, nextXp: 1800, emoji: '🪴' },
  { stage: 5, name: '05 Ra lá', minXp: 1800, nextXp: 3000, emoji: '🌳' },
  { stage: 6, name: '06 Kết trái', minXp: 3000, nextXp: 3000, emoji: '🍎' },
] as const;

export function getTreeStageInfo(xp: number) {
  let current: (typeof TREE_STAGES)[number] = TREE_STAGES[0];
  for (const s of TREE_STAGES) {
    if (xp >= s.minXp) current = s;
  }
  const isMax = current.stage === 6;
  const span = Math.max(1, current.nextXp - current.minXp);
  const progressPct = isMax ? 100 : Math.min(100, Math.round(((xp - current.minXp) / span) * 100));
  const remainingXp = isMax ? 0 : Math.max(0, current.nextXp - xp);
  const nextStage = isMax ? null : TREE_STAGES.find((s) => s.stage === current.stage + 1) ?? null;
  return { current, nextStage, progressPct, remainingXp, isMax };
}

export function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  const todayStr = getTodayIso();
  if (!set.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    if (set.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getDefaultPreferences(): AppPreferences {
  return {
    theme: 'system',
    fontSize: 'medium',
    ttsRate: 0.95,
    ttsVoice: 'en-US',
    ttsVoiceName: '',
    narrationStyle: 'discovery',
    subspecialties: DEFAULT_SUBSPECIALTIES,
    appsScriptSync: {
      enabled: false,
      url: '',
      autoPush: false,
    },
    reminder: {
      enabled: false,
      dailyGoalXp: 50,
      time: '20:30',
    },
  };
}

export function getDefaultRadState(): RadState {
  return {
    lastModifiedAt: new Date(0).toISOString(),
    xp: 0,
    streakDays: 0,
    weeklyActivity: [],
    dailyXpLog: {},
    lessonProgress: {},
    masteredBank: {},
    customVocabByLesson: {},
    srs: {
      folders: [],
      cards: [],
      reviewDirection: 'vi_to_en_type',
      autoSpeak: true,
      sortMode: 'due_first',
    },
    notebooks: {},
  };
}

export function mergePreferencesDeep(
  base: AppPreferences,
  incoming?: Partial<AppPreferences> | null
): AppPreferences {
  if (!incoming || typeof incoming !== 'object') return base;
  const subs =
    Array.isArray(incoming.subspecialties) && incoming.subspecialties.length > 0
      ? incoming.subspecialties.filter(
          (s): s is { id: string; label: string } =>
            Boolean(s && typeof s.id === 'string' && typeof s.label === 'string' && s.id.trim() && s.label.trim())
        )
      : base.subspecialties;

  return {
    ...base,
    ...incoming,
    subspecialties: subs.length > 0 ? subs : DEFAULT_SUBSPECIALTIES,
    appsScriptSync: {
      ...base.appsScriptSync,
      ...(incoming.appsScriptSync && typeof incoming.appsScriptSync === 'object'
        ? incoming.appsScriptSync
        : {}),
    },
    reminder: {
      ...base.reminder,
      ...(incoming.reminder && typeof incoming.reminder === 'object'
        ? incoming.reminder
        : {}),
    },
  };
}

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return getDefaultPreferences();
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return mergePreferencesDeep(getDefaultPreferences(), parsed);
  } catch {
    return getDefaultPreferences();
  }
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota error
  }
}

export function loadRadState(): RadState {
  try {
    const raw = localStorage.getItem(RAD_STATE_KEY);
    if (!raw) return getDefaultRadState();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultRadState(),
      ...parsed,
      customVocabByLesson: parsed.customVocabByLesson || {},
      srs: {
        ...getDefaultRadState().srs,
        ...(parsed.srs || {}),
      },
    };
  } catch {
    return getDefaultRadState();
  }
}

export function saveRadState(state: RadState): void {
  try {
    localStorage.setItem(RAD_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota error
  }
}

// IndexedDB for imported JSON lesson packs
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadImportedLessons(): Promise<LessonPack[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as LessonPack[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(IDB_FALLBACK_KEY);
      return raw ? (JSON.parse(raw) as LessonPack[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveImportedLesson(lesson: LessonPack): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ ...lesson, builtIn: false });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await loadImportedLessons();
    const filtered = existing.filter((l) => l.id !== lesson.id);
    filtered.push({ ...lesson, builtIn: false });
    localStorage.setItem(IDB_FALLBACK_KEY, JSON.stringify(filtered));
  }
}

export async function deleteImportedLesson(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await loadImportedLessons();
    localStorage.setItem(
      IDB_FALLBACK_KEY,
      JSON.stringify(existing.filter((l) => l.id !== id))
    );
  }
}

/**
 * Replaces the entire IndexedDB lesson_packs store so restore/cloud pull
 * stays strictly synchronized (including clearing when importedLessons is []).
 */
export async function replaceAllImportedLessons(lessons: LessonPack[]): Promise<void> {
  const cleaned = lessons.map((l) => ({ ...l, builtIn: false }));
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      cleaned.forEach((pack) => store.put(pack));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(IDB_FALLBACK_KEY, JSON.stringify(cleaned));
    } catch {
      // ignore quota error
    }
  }
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
