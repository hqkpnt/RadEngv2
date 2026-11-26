export type SkillKey =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking';

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
  listening: { label: 'Listening', short: 'L' },
  reading: { label: 'Reading', short: 'R' },
  writing: { label: 'Writing', short: 'W' },
  speaking: { label: 'Speaking', short: 'S' },
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
  audioUrl?: string;
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

export interface ListeningSentence {
  id: string;
  en: string;
  vi: string;
}

export interface ListeningGapFill {
  id: string;
  sentence: string;
  answer: string;
  hint?: string;
}

export interface ListeningMcq {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanationVi: string;
}

export interface ListeningSection {
  title: string;
  audioUrl?: string;
  notesTemplate?: string[];
  transcriptSentences: ListeningSentence[];
  gapFill: ListeningGapFill[];
  mcq: ListeningMcq[];
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

export interface WritingParaphraseTask {
  id: string;
  type: 'paraphrase' | 'translation';
  prompt: string;
  targetKeywords: string[];
  modelAnswer: string;
  noteVi: string;
}

export interface WritingEssayTask {
  prompt: string;
  minWords: number;
  recommendedMinutes: number;
  models: {
    band7: string;
    band8: string;
    band9: string;
  };
}

export interface WritingSection {
  paraphraseTasks: WritingParaphraseTask[];
  essayTask: WritingEssayTask;
}

export interface SpeakingPrompt {
  question: string;
  sampleAnswer: string;
  hintVi?: string;
}

export interface SpeakingStage {
  stage: 1 | 2 | 3;
  title: string;
  prepSeconds?: number;
  speakSeconds?: number;
  cueCard?: string;
  bulletPoints?: string[];
  sampleAnswer?: string;
  prompts: SpeakingPrompt[];
}

export interface ShadowingItem {
  id: string;
  en: string;
  vi: string;
}

export interface SpeakingSection {
  stages: SpeakingStage[];
  shadowing: {
    simple: ShadowingItem[];
    complex: ShadowingItem[];
  };
}

export interface LessonPack {
  schemaVersion: 2;
  id: string;
  builtIn?: boolean;
  meta: LessonMeta;
  vocabulary: VocabItem[];
  grammar: GrammarPoint[];
  listening: ListeningSection;
  reading: ReadingSection;
  writing: WritingSection;
  speaking: SpeakingSection;
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
  writingDraft: string;
  paraphraseDoneIds: string[];
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
  narrationStyle: 'discovery' | 'standard';
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
