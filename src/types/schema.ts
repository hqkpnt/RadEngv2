export type SkillKey = 'vocabulary' | 'grammar' | 'reading';

export interface SubspecialtyDef {
  id: string;
  label: string;
}

export const DEFAULT_SUBSPECIALTIES: SubspecialtyDef[] = [
  { id: 'imaging', label: 'Chẩn đoán hình ảnh (CĐHA)' },
  { id: 'neuro_dsa', label: 'DSA Thần kinh' },
  { id: 'onco_dsa', label: 'DSA Ung bướu' },
  { id: 'peripheral_dsa', label: 'DSA Mạch máu ngoại biên' },
  { id: 'pain_dsa', label: 'DSA Giảm đau' },
];

export const SKILL_LABELS: Record<SkillKey, { label: string; short: string }> = {
  vocabulary: { label: 'Vocabulary', short: 'V' },
  grammar: { label: 'Grammar', short: 'G' },
  reading: { label: 'Reading', short: 'R' },
};

export interface LessonMeta {
  title: string;
  titleVi: string;
  level: string;
  subspecialty: string;
  sourceBook: string;
  tags: string[];
  estimatedMinutes: number;
  createdAt: string;
}

export interface VocabItem {
  termKey: string;
  term: string;
  ipa: string;
  pos: string;
  wordRoot: string;
  meaningVi: string;
  noteVi: string;
  exampleEn: string;
  exampleVi: string;
  isCustom?: boolean;
}

export interface GrammarExercise {
  id: string;
  type: 'mcq' | 'fill';
  prompt: string;
  options?: string[];
  answer: string;
  explanationVi: string;
}

export interface GrammarPoint {
  id: string;
  topic: string;
  formula: string;
  explanationVi: string;
  sourceSentence: {
    en: string;
    vi: string;
  };
  quickExercises: GrammarExercise[];
}

export interface ReadingParagraph {
  id: string;
  en: string;
  vi: string;
}

export interface GlossaryItem {
  termKey: string;
  term: string;
  ipa: string;
  wordRoot: string;
  meaningVi: string;
}

export interface ReadingMcq {
  id: string;
  question: string;
  options: string[];
  answer: string;
  evidenceParagraph?: string;
  explanationVi?: string;
}

export interface ReadingTfng {
  id: string;
  statement: string;
  answer: 'TRUE' | 'FALSE' | 'NOT GIVEN';
  evidenceParagraph?: string;
  explanationVi?: string;
}

export interface ReadingMatching {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  evidenceParagraph?: string;
  explanationVi?: string;
}

export interface ReadingCompletion {
  id: string;
  prompt: string;
  answer: string;
  evidenceParagraph?: string;
  explanationVi?: string;
}

export interface ReadingSection {
  title: string;
  paragraphs: ReadingParagraph[];
  glossary: GlossaryItem[];
  questions: {
    mcq: ReadingMcq[];
    tfng: ReadingTfng[];
    matching: ReadingMatching[];
    completion: ReadingCompletion[];
  };
}

export interface LessonPack {
  schemaVersion: 2;
  id: string;
  builtIn?: boolean;
  meta: LessonMeta;
  vocabulary: VocabItem[];
  grammar: GrammarPoint[];
  reading: ReadingSection;
}

export interface SrsFolder {
  id: string;
  name: string;
}

export interface SrsCard {
  id: string;
  termKey?: string;
  front: string;
  meaning: string;
  ipa: string;
  wordRoot?: string;
  source: 'custom' | 'lesson';
  lessonId?: string;
  folderId: string | null;
  starred: boolean;
  orderIndex: number;
  status: 'learning' | 'mastered';
  dueAt: number;
  intervalSeconds: number;
  easeFactor: number;
  repetitions: number;
  createdAt: number;
}

export interface MasteredEntry {
  termKey: string;
  term: string;
  ipa: string;
  wordRoot: string;
  meaningVi: string;
  subspecialty: string;
  sourceBook: string;
  lessonId: string;
  masteredAt: number;
}

export interface LessonProgress {
  skillsCompleted: Record<SkillKey, boolean>;
  stars: number;
  lastOpenedAt: number;
}

export interface RadState {
  lastModifiedAt: string;
  xp: number;
  streakDays: number;
  weeklyActivity: string[]; // YYYY-MM-DD
  dailyXpLog: Record<string, number>;
  lessonProgress: Record<string, LessonProgress>;
  masteredBank: Record<string, MasteredEntry>;
  customVocabByLesson: Record<string, VocabItem[]>;
  srs: {
    folders: SrsFolder[];
    cards: SrsCard[];
    reviewDirection: 'vi_to_en_type' | 'en_to_vi_recall';
    autoSpeak: boolean;
    sortMode: 'due_first' | 'newest' | 'alpha' | 'hardest' | 'custom_order';
  };
  notebooks: Record<string, string>;
}

export interface AppsScriptSyncConfig {
  enabled: boolean;
  url: string;
  autoPush: boolean;
  lastSyncedAt?: string;
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  ttsRate: number;
  ttsVoice: 'en-US' | 'en-GB';
  ttsVoiceName: string; // '' = auto-best natural voice
  subspecialties: SubspecialtyDef[];
  appsScriptSync: AppsScriptSyncConfig;
  reminder: {
    enabled: boolean;
    dailyGoalXp: number;
    time: string;
  };
}

export interface BackupPayload {
  backupVersion: 3;
  exportedAt: string;
  preferences: AppPreferences;
  state: RadState;
  importedLessons?: LessonPack[];
}
