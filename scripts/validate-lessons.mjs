#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const lessonsDir = path.join(rootDir, 'public', 'lessons');
const manifestPath = path.join(lessonsDir, 'index.json');

const errors = [];
const warnings = [];

if (!existsSync(lessonsDir)) {
  console.error(`[validate-lessons] Không tìm thấy thư mục: ${lessonsDir}`);
  process.exit(1);
}

let manifestFiles = [];
if (!existsSync(manifestPath)) {
  errors.push('Thiếu tệp manifest public/lessons/index.json.');
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    if (!manifest || !Array.isArray(manifest.files)) {
      errors.push('public/lessons/index.json phải có trường "files" là mảng tên tệp.');
    } else {
      manifestFiles = manifest.files;
      for (const f of manifestFiles) {
        const full = path.join(lessonsDir, f);
        if (!existsSync(full)) {
          errors.push(`Tệp "${f}" được khai báo trong index.json nhưng không tồn tại trong public/lessons/.`);
        }
      }
    }
  } catch (err) {
    errors.push(`public/lessons/index.json sai cú pháp JSON: ${err.message}`);
  }
}

const diskFiles = readdirSync(lessonsDir).filter(
  (name) => name.endsWith('.json') && name !== 'index.json'
);

for (const f of diskFiles) {
  if (!manifestFiles.includes(f)) {
    warnings.push(`Tệp "${f}" nằm trong public/lessons/ nhưng chưa được liệt kê trong index.json.`);
  }
}

const seenIds = new Map();
let totalLessonsChecked = 0;

for (const fileName of diskFiles) {
  const fullPath = path.join(lessonsDir, fileName);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fullPath, 'utf-8'));
  } catch (err) {
    errors.push(`${fileName}: Sai cú pháp JSON (${err.message})`);
    continue;
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.lessons)
      ? parsed.lessons
      : [parsed];

  list.forEach((lesson, idx) => {
    totalLessonsChecked += 1;
    const prefix = `${fileName}${list.length > 1 ? ` [bài #${idx + 1}]` : ''}`;
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
      errors.push(`${prefix}: Không phải đối tượng bài học hợp lệ.`);
      return;
    }

    const id = String(lesson.id || lesson.meta?.id || '').trim();
    const title = String(lesson.meta?.title || lesson.title || '').trim();

    if (!id) {
      errors.push(`${prefix}: Thiếu trường bắt buộc "id".`);
    } else if (seenIds.has(id)) {
      errors.push(`${prefix}: Trùng ID "${id}" với tệp "${seenIds.get(id)}".`);
    } else {
      seenIds.set(id, fileName);
    }

    if (!title) {
      errors.push(`${prefix}: Thiếu trường bắt buộc "meta.title" (hoặc "title").`);
    }

    const vocab = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [];
    const grammar = Array.isArray(lesson.grammar)
      ? lesson.grammar
      : lesson.grammar && typeof lesson.grammar === 'object'
        ? [lesson.grammar]
        : [];
    const listeningSentences = Array.isArray(lesson.listening?.transcriptSentences)
      ? lesson.listening.transcriptSentences
      : [];
    const readingParas = Array.isArray(lesson.reading?.paragraphs)
      ? lesson.reading.paragraphs
      : [];
    const writingTasks = Array.isArray(lesson.writing?.paraphraseTasks)
      ? lesson.writing.paraphraseTasks
      : Array.isArray(lesson.writing?.sentenceTasks)
        ? lesson.writing.sentenceTasks
        : [];
    const speakingStages = Array.isArray(lesson.speaking?.stages)
      ? lesson.speaking.stages
      : [];

    if (
      vocab.length === 0 &&
      grammar.length === 0 &&
      listeningSentences.length === 0 &&
      readingParas.length === 0 &&
      writingTasks.length === 0 &&
      speakingStages.length === 0
    ) {
      errors.push(`${prefix} ("${title}"): Không có dữ liệu hợp lệ ở bất kỳ kỹ năng nào.`);
    }

    const seenTermKeys = new Set();
    vocab.forEach((v, vIdx) => {
      const term = String(v?.term || v?.word || '').trim();
      const meaning = String(v?.meaningVi || v?.meaning || '').trim();
      if (!term || !meaning) {
        errors.push(`${prefix}: vocabulary[${vIdx}] thiếu term hoặc meaningVi.`);
      }
      if (v?.termKey) {
        if (seenTermKeys.has(v.termKey)) {
          errors.push(`${prefix}: Trùng termKey "${v.termKey}" trong vocabulary.`);
        }
        seenTermKeys.add(v.termKey);
      }
      if (typeof v?.audioUrl === 'string' && /^\s*(javascript|vbscript|data):/i.test(v.audioUrl)) {
        errors.push(`${prefix}: vocabulary[${vIdx}].audioUrl chứa giao thức không an toàn.`);
      }
    });

    if (
      typeof lesson.listening?.audioUrl === 'string' &&
      /^\s*(javascript|vbscript|data):/i.test(lesson.listening.audioUrl)
    ) {
      errors.push(`${prefix}: listening.audioUrl chứa giao thức không an toàn.`);
    }
  });
}

if (warnings.length > 0) {
  warnings.forEach((w) => console.warn(`[validate-lessons] WARN: ${w}`));
}

if (errors.length > 0) {
  console.error(`[validate-lessons] FAILED (${errors.length} lỗi):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(
  `[validate-lessons] PASS: ${totalLessonsChecked} gói bài học hợp lệ (${diskFiles.length} tệp JSON, 0 trùng ID, 0 lỗi cấu trúc).`
);
