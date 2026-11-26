import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  Edit3,
  FileJson,
  FolderUp,
  HelpCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LessonPack } from '../types/schema';
import {
  APPS_SCRIPT_CODE_TEMPLATE,
  isOfficialAppsScriptHost,
  isValidAppsScriptUrl,
} from '../utils/cloudSync';
import { normalizeLessonInput } from '../utils/normalizer';
import { downloadJsonFile } from '../utils/storage';

interface LibraryPageProps {
  navigate: (hash: string) => void;
}

const RADENG_V31_SAMPLE = {
  schemaVersion: '3.1',
  id: 'radeng-sample-tace-hcc',
  title: 'Transarterial Chemoembolization (TACE) in HCC',
  titleVi: 'Nút mạch hóa chất xuyên động mạch (TACE) trong HCC',
  level: 'C1',
  subspecialty: 'onco_dsa',
  sourceBook: 'Interventional Oncology Practical Guide (Ch. 2)',
  vocabulary: [
    {
      word: 'chemoembolization',
      ipa: '/ˌkiː.məʊˌem.bə.laɪˈzeɪ.ʃən/',
      wordRoot: 'chemo- (hóa chất) + embolos (nút tắc)',
      meaning: 'Nút mạch hóa chất',
      example: 'Superselective chemoembolization spares adjacent healthy hepatic parenchyma.',
      translation: 'Nút mạch hóa chất siêu chọn lọc bảo tồn nhu mô gan lành lân cận.',
    },
  ],
  grammar: [
    {
      topic: 'Past Simple Passive with Adverbs',
      formula: 'S + was / were + V3/ed + adverb of manner (+ prepositional phrase)',
      explanation: 'Dùng trạng từ chỉ cách thức (superselectively, slowly, carefully) bổ nghĩa trực tiếp cho động từ ở thể bị động quá khứ đơn.',
      sourceSentence:
        'A 2.4F microcatheter was advanced superselectively into the right hepatic feeding branch.',
      quickPractice: [
        {
          question: 'Drug-eluting beads were _____ slowly under fluoroscopic guidance.',
          options: ['infused', 'infusing', 'infuse'],
          correctAnswer: 'infused',
          explanation: 'Dùng quá khứ phân từ sau "were" trong cấu trúc bị động quá khứ đơn.',
        },
      ],
    },
  ],
  listening: {
    title: 'Tumor Board Discussion: BCLC Stage B HCC',
    notesTemplate: [
      'Target lesion: 4.5 cm hypervascular HCC in segment VIII.',
      'Delivery: Superselective DEB-TACE to stasis.',
    ],
    transcript:
      'Contrast-enhanced MRI confirmed a hypervascular hepatocellular carcinoma in segment eight. Superselective catheterization minimizes non-target embolization.',
    gapFill: [
      {
        sentence: 'Superselective catheterization minimizes _____ embolization.',
        answer: 'non-target',
        hint: 'ngoài đích',
      },
    ],
    mcq: [
      {
        question: 'Which hepatic segment contains the target HCC lesion?',
        options: ['Segment II', 'Segment IV', 'Segment VIII'],
        answer: 'Segment VIII',
      },
    ],
  },
  reading: {
    title: 'Dual Blood Supply of the Liver & Rationale for TACE',
    paragraphs: [
      {
        en: 'Hepatocellular carcinoma derives its blood supply predominantly from the hepatic artery, whereas normal liver parenchyma is perfused mainly by the portal vein.',
        vi: 'Ung thư biểu mô tế bào gan nhận máu chủ yếu từ động mạch gan, trong khi nhu mô gan bình thường được tưới máu chủ yếu qua tĩnh mạch cửa.',
      },
    ],
    glossary: [
      {
        term: 'parenchyma',
        ipa: '/pəˈreŋ.kɪ.mə/',
        wordRoot: 'para- (bên cạnh) + enchyma (chất lấp đầy)',
        meaningVi: 'Nhu mô (gan)',
      },
    ],
    questions: [
      {
        type: 'tfng',
        statement: 'Normal liver parenchyma relies predominantly on the hepatic artery.',
        answer: 'FALSE',
        evidenceParagraph: 'p1',
      },
    ],
  },
  writing: {
    sentenceTasks: [
      {
        type: 'translation',
        prompt:
          'Vi ống thông được luồn siêu chọn lọc vào nhánh động mạch nuôi u ở hạ phân thùy VIII.',
        keywords: ['microcatheter', 'superselectively', 'segment VIII'],
        modelAnswer:
          'A microcatheter was advanced superselectively into the segment VIII tumor-feeding artery.',
      },
    ],
    essayTask: {
      prompt: 'Summarize the vascular rationale and procedural endpoint for superselective TACE.',
      minWords: 120,
      band7: 'TACE relies on the dual blood supply of the liver to treat HCC selectively...',
      band8:
        'Exploiting the predominantly arterial supply of hepatocellular carcinoma, superselective TACE delivers concentrated therapy...',
      band9:
        'By leveraging the hemodynamic contrast between arterialized HCC lesions and portally perfused parenchyma...',
    },
  },
  speaking: {
    stage1: [
      {
        question: 'Why is superselective microcatheter placement critical during TACE?',
        sampleAnswer:
          'It maximizes drug concentration inside the tumor while preserving healthy liver function.',
      },
    ],
    stage2: {
      title: 'Present a BCLC-B HCC TACE Case',
      cueCard: 'Describe arterial mapping and endpoint assessment for a segment VIII HCC.',
      bulletPoints: [
        'CT/MRI arterial hyperenhancement',
        'Cone-beam CT confirmation',
        'Near-stasis endpoint',
      ],
      sampleAnswer:
        'This patient presented with a solitary 4.5 cm hypervascular segment VIII lesion...',
    },
    stage3: [
      {
        question: 'How does cone-beam CT improve technical success in interventional oncology?',
        sampleAnswer:
          'It identifies occult feeding vessels and confirms complete tumor coverage before embolization.',
      },
    ],
    shadowing: {
      simple: ['The hepatic artery / supplies most hepatocellular carcinomas.'],
      complex: [
        'Following cone-beam CT confirmation, / chemoembolization was delivered / to near-stasis.',
      ],
    },
  },
};

export const LibraryPage: React.FC<LibraryPageProps> = ({ navigate }) => {
  const {
    prefs,
    state,
    lessons,
    subspecialties,
    getSubspecialtyLabel,
    addSubspecialty,
    renameSubspecialty,
    deleteSubspecialty,
    setGuideOpen,
    updateAppsScriptSync,
    syncStatus,
    syncError,
    pushToCloud,
    pullFromCloud,
    importLessons,
    updateImportedLessonMeta,
    removeImportedLesson,
    exportFullBackup,
    restoreFullBackup,
    resetProgress,
    showToast,
  } = useApp();

  const [copiedScript, setCopiedScript] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [overrideSub, setOverrideSub] = useState<string>('auto');
  const [overrideBook, setOverrideBook] = useState('');
  const [previewPacks, setPreviewPacks] = useState<LessonPack[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [includePacksInBackup, setIncludePacksInBackup] = useState(true);

  // Subspecialty CRUD state
  const [newSubLabel, setNewSubLabel] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubText, setEditingSubText] = useState('');

  // Lesson metadata inline editor
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editPackSub, setEditPackSub] = useState('');
  const [editPackBook, setEditPackBook] = useState('');

  const importedOnly = lessons.filter((l) => !l.builtIn);

  const parseFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setWarnings([]);
    const collected: LessonPack[] = [];
    const allWarnings: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = normalizeLessonInput(json, {
          subspecialty: overrideSub === 'auto' ? undefined : overrideSub,
          sourceBook: overrideBook.trim() || undefined,
        });
        collected.push(...res.lessons);
        allWarnings.push(...res.warnings);
      } catch (err) {
        setErrorMsg(
          `Lỗi đọc tệp "${file.name}": ${err instanceof Error ? err.message : 'JSON không hợp lệ'}`
        );
      }
    }

    setPreviewPacks(collected);
    setWarnings(allWarnings);
  };

  const handleConfirmImport = async () => {
    if (previewPacks.length === 0) return;
    await importLessons(previewPacks);
    setPreviewPacks([]);
    setWarnings([]);
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      await restoreFullBackup(json);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể khôi phục tệp sao lưu.');
    }
  };

  return (
    <div className="stack-lg">
      <div className="flex-between flex-wrap">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem' }}>
            Nạp bài học (.json), Phân môn & Sao lưu
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hỗ trợ cả chuẩn <strong>RadEng v3.1 gốc</strong> lẫn chuẩn <code className="mono">schemaVersion: 2</code>, tự động làm sạch dữ liệu chống XSS.
          </p>
        </div>
        <button className="btn btn-soft" onClick={() => setGuideOpen(true)}>
          <HelpCircle size={15} /> Mở Hướng dẫn & Prompt Gemini
        </button>
      </div>

      {/* Block 1: Dynamic Subspecialty Label Manager */}
      <section className="card stack-md">
        <div className="flex-between flex-wrap">
          <div className="flex-row">
            <Tag size={19} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              1. Quản lý Nhãn Phân môn chuyên khoa ({subspecialties.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Thêm, đổi tên hoặc xóa các phân môn hiển thị ở bộ lọc & khi nạp bài
          </span>
        </div>

        <div className="grid-2">
          {subspecialties.map((sub) => (
            <div key={sub.id} className="card-subtle flex-between" style={{ padding: '10px 12px' }}>
              {editingSubId === sub.id ? (
                <form
                  className="flex-row"
                  style={{ flex: 1 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingSubText.trim()) renameSubspecialty(sub.id, editingSubText);
                    setEditingSubId(null);
                  }}
                >
                  <input
                    className="input"
                    style={{ padding: '5px 9px' }}
                    value={editingSubText}
                    onChange={(e) => setEditingSubText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-sm btn-primary">
                    <Check size={14} /> Lưu
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setEditingSubId(null)}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{sub.label}</strong>
                    <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      id: {sub.id}
                    </div>
                  </div>
                  <div className="flex-row" style={{ gap: 5 }}>
                    <button
                      className="btn btn-sm btn-icon"
                      title="Sửa tên nhãn"
                      onClick={() => {
                        setEditingSubId(sub.id);
                        setEditingSubText(sub.label);
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      className="btn btn-sm btn-icon btn-danger"
                      title="Xóa nhãn phân môn"
                      disabled={subspecialties.length <= 1}
                      onClick={() => deleteSubspecialty(sub.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex-row flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newSubLabel.trim()) return;
            addSubspecialty(newSubLabel);
            setNewSubLabel('');
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder="Nhập nhãn phân môn mới (VD: DSA Tim mạch, CĐHA Cơ xương khớp)..."
            value={newSubLabel}
            onChange={(e) => setNewSubLabel(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={15} /> Thêm nhãn phân môn
          </button>
        </form>
      </section>

      {/* Block 2: Smart JSON Importer */}
      <section className="card stack-md">
        <div className="flex-between flex-wrap">
          <div className="flex-row">
            <FolderUp size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              2. Nạp gói bài học .json từ sách (lưu IndexedDB)
            </h2>
          </div>
          <div className="flex-row flex-wrap">
            <button
              className="btn btn-sm"
              onClick={() => downloadJsonFile('radeng-v3.1-sample-tace.json', RADENG_V31_SAMPLE)}
            >
              <FileJson size={14} /> Tải mẫu RadEng v3.1 (TACE)
            </button>
            <button
              className="btn btn-sm btn-soft"
              onClick={() => {
                const res = normalizeLessonInput(RADENG_V31_SAMPLE, {
                  subspecialty: overrideSub === 'auto' ? undefined : overrideSub,
                  sourceBook: overrideBook.trim() || undefined,
                });
                setPreviewPacks(res.lessons);
                setWarnings(res.warnings);
                setErrorMsg(null);
              }}
            >
              Thử nạp mẫu RadEng v3.1 ngay
            </button>
          </div>
        </div>

        <div className="grid-2">
          <div className="stack-sm">
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              GÁN NHÃN PHÂN MÔN (TÙY CHỌN GHI ĐÈ)
            </label>
            <select
              className="select"
              value={overrideSub}
              onChange={(e) => setOverrideSub(e.target.value)}
            >
              <option value="auto">Tự động nhận diện từ JSON</option>
              {subspecialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="stack-sm">
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              TÊN SÁCH NGUỒN (TÙY CHỌN GHI ĐÈ)
            </label>
            <input
              className="input"
              placeholder="VD: Handbook of Interventional Radiology (Ch. 3)"
              value={overrideBook}
              onChange={(e) => setOverrideBook(e.target.value)}
            />
          </div>
        </div>

        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) parseFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={26} style={{ color: 'var(--accent)', marginBottom: 6 }} />
          <div style={{ fontWeight: 600 }}>
            Kéo thả 1 hoặc nhiều tệp .json vào đây, hoặc bấm để chọn tệp
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Hỗ trợ tệp đơn bài học, mảng nhiều bài học, RadEng v3.1 và Spec v2.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                parseFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </div>

        {errorMsg && (
          <div className="card-subtle" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {errorMsg}
          </div>
        )}

        {warnings.length > 0 && (
          <div
            className="card-subtle"
            style={{ borderColor: 'var(--warning)', color: 'var(--warning)', fontSize: '0.84rem' }}
          >
            {warnings.map((w, i) => (
              <div key={i}>• {w}</div>
            ))}
          </div>
        )}

        {previewPacks.length > 0 && (
          <div className="card-subtle stack-sm">
            <div className="flex-between flex-wrap">
              <strong style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Đã chuẩn hóa sẵn sàng nạp: {previewPacks.length} bài học
              </strong>
              <div className="flex-row">
                <button className="btn btn-sm" onClick={() => setPreviewPacks([])}>
                  Hủy
                </button>
                <button className="btn btn-sm btn-primary" onClick={handleConfirmImport}>
                  Lưu vào thư viện (IndexedDB)
                </button>
              </div>
            </div>
            {previewPacks.map((p) => (
              <div key={p.id} className="card" style={{ padding: 12 }}>
                <div className="flex-between flex-wrap">
                  <div>
                    <strong>{p.meta.title}</strong>
                    {p.meta.titleVi && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {p.meta.titleVi}
                      </div>
                    )}
                  </div>
                  <div className="flex-row flex-wrap" style={{ gap: 5 }}>
                    <span className="badge badge-accent">
                      {getSubspecialtyLabel(p.meta.subspecialty)}
                    </span>
                    {p.meta.sourceBook && <span className="badge">📖 {p.meta.sourceBook}</span>}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Vocab: {p.vocabulary.length} · Grammar: {p.grammar.length} điểm · Listening:{' '}
                  {p.listening.transcriptSentences.length} câu · Reading: {p.reading.paragraphs.length} đoạn · Writing:{' '}
                  {p.writing.paraphraseTasks.length} câu + Essay · Speaking: {p.speaking.stages.length} stages
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Block 3: Imported Packs with Metadata Editing */}
      <section className="card stack-md">
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          3. Gói bài học đã nạp trong trình duyệt ({importedOnly.length})
        </h2>
        {importedOnly.length === 0 ? (
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Chưa có gói bài tự nạp nào. Hiện ứng dụng có sẵn 1 bài mẫu CĐHA/DSA Neuro Thrombectomy.
          </div>
        ) : (
          <div className="stack-sm">
            {importedOnly.map((pack) => {
              const isEditing = editingPackId === pack.id;
              return (
                <div key={pack.id} className="card-subtle stack-sm">
                  <div className="flex-between flex-wrap">
                    <div>
                      <strong>{pack.meta.title}</strong>
                      <div className="flex-row flex-wrap" style={{ gap: 6, marginTop: 4 }}>
                        <span className="badge badge-accent">
                          {getSubspecialtyLabel(pack.meta.subspecialty)}
                        </span>
                        {pack.meta.sourceBook && <span className="badge">📖 {pack.meta.sourceBook}</span>}
                      </div>
                    </div>
                    <div className="flex-row flex-wrap">
                      <button
                        className="btn btn-sm btn-soft"
                        onClick={() => navigate(`#/lesson/${encodeURIComponent(pack.id)}`)}
                      >
                        Mở bài
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setEditingPackId(pack.id);
                          setEditPackSub(pack.meta.subspecialty);
                          setEditPackBook(pack.meta.sourceBook);
                        }}
                      >
                        <Edit3 size={13} /> Đổi nhãn/sách
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => downloadJsonFile(`${pack.id}.json`, pack)}
                      >
                        <Download size={14} /> Xuất
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeImportedLesson(pack.id)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="grid-3" style={{ marginTop: 6 }}>
                      <select
                        className="select"
                        value={editPackSub}
                        onChange={(e) => setEditPackSub(e.target.value)}
                      >
                        {subspecialties.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={editPackBook}
                        onChange={(e) => setEditPackBook(e.target.value)}
                        placeholder="Tên sách nguồn..."
                      />
                      <div className="flex-row">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={async () => {
                            await updateImportedLessonMeta(pack.id, {
                              subspecialty: editPackSub,
                              sourceBook: editPackBook,
                            });
                            setEditingPackId(null);
                          }}
                        >
                          Lưu thay đổi
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => setEditingPackId(null)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Block 4: Fast Cloud Sync via Google Apps Script Web App */}
      <section className="card stack-md">
        <div className="flex-between flex-wrap">
          <div className="flex-row">
            <Cloud size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              4. Đồng bộ nhanh qua Google Drive (Apps Script Web App)
            </h2>
          </div>
          <label className="flex-row" style={{ fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.appsScriptSync.enabled}
              onChange={(e) => updateAppsScriptSync({ enabled: e.target.checked })}
            />
            <span>{prefs.appsScriptSync.enabled ? 'Đang bật đồng bộ' : 'Đang tắt'}</span>
          </label>
        </div>

        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Đồng bộ tiến độ, thẻ SRS, Mastered Bank, nhãn phân môn và các gói bài đã nạp trực tiếp lên file JSON trong Google Drive cá nhân — <strong>miễn phí 100%, không cần cấu hình Google Cloud OAuth</strong>.
        </p>

        <div className="stack-sm">
          <div className="flex-between flex-wrap">
            <label
              htmlFor="apps-script-url-input"
              style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}
            >
              GOOGLE APPS SCRIPT WEB APP URL (HTTPS)
            </label>
            {prefs.appsScriptSync.url && (
              <span
                className={`badge ${
                  isOfficialAppsScriptHost(prefs.appsScriptSync.url)
                    ? 'badge-success'
                    : isValidAppsScriptUrl(prefs.appsScriptSync.url)
                      ? 'badge-warning'
                      : 'badge-danger'
                }`}
              >
                {isOfficialAppsScriptHost(prefs.appsScriptSync.url)
                  ? '✓ URL Apps Script hợp lệ'
                  : isValidAppsScriptUrl(prefs.appsScriptSync.url)
                    ? 'HTTPS tùy chỉnh'
                    : 'URL phải bắt đầu bằng https://'}
              </span>
            )}
          </div>
          <input
            id="apps-script-url-input"
            className="input mono"
            style={{ fontSize: '0.84rem' }}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            value={prefs.appsScriptSync.url}
            onChange={(e) => updateAppsScriptSync({ url: e.target.value })}
          />
        </div>

        <label className="flex-row" style={{ fontSize: '0.86rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            disabled={!prefs.appsScriptSync.enabled}
            checked={prefs.appsScriptSync.autoPush}
            onChange={(e) => updateAppsScriptSync({ autoPush: e.target.checked })}
          />
          <span>
            Tự động đẩy sau khi thay đổi (debounce 3 giây)
          </span>
        </label>

        <div className="flex-row flex-wrap">
          <button
            className="btn btn-primary"
            disabled={
              syncStatus === 'pushing' ||
              syncStatus === 'pulling' ||
              !isValidAppsScriptUrl(prefs.appsScriptSync.url)
            }
            onClick={() => void pushToCloud(false)}
          >
            <CloudUpload size={15} />{' '}
            {syncStatus === 'pushing' ? 'Đang đẩy lên Drive...' : 'Đẩy lên Drive ngay'}
          </button>

          <button
            className="btn btn-soft"
            disabled={
              syncStatus === 'pushing' ||
              syncStatus === 'pulling' ||
              !isValidAppsScriptUrl(prefs.appsScriptSync.url)
            }
            onClick={() => void pullFromCloud(true)}
          >
            <CloudDownload size={15} />{' '}
            {syncStatus === 'pulling' ? 'Đang kéo từ Drive...' : 'Kéo từ Drive về'}
          </button>

          <button
            className="btn"
            disabled={
              syncStatus === 'pushing' ||
              syncStatus === 'pulling' ||
              !isValidAppsScriptUrl(prefs.appsScriptSync.url)
            }
            onClick={() => void pullFromCloud(false)}
            title="Chỉ ghi đè khi bản trên Google Drive mới hơn thiết bị này"
          >
            <RefreshCw size={14} /> Kiểm tra bản mới hơn
          </button>
        </div>

        <div className="card-subtle flex-between flex-wrap" style={{ fontSize: '0.82rem' }}>
          <span>
            <strong>Đồng bộ gần nhất:</strong>{' '}
            {prefs.appsScriptSync.lastSyncedAt
              ? new Date(prefs.appsScriptSync.lastSyncedAt).toLocaleString('vi-VN')
              : 'Chưa đồng bộ'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Cập nhật cục bộ:{' '}
            {state.lastModifiedAt && Date.parse(state.lastModifiedAt) > 0
              ? new Date(state.lastModifiedAt).toLocaleString('vi-VN')
              : 'Chưa có thay đổi'}
          </span>
        </div>

        {syncError && (
          <div
            className="card-subtle"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.84rem' }}
          >
            <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {syncError}
          </div>
        )}

        <details className="card-subtle">
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' }}>
            Xem mã Google Apps Script mẫu (tạo Web App URL trong 1 phút)
          </summary>
          <div className="stack-sm" style={{ marginTop: 10 }}>
            <div className="flex-between flex-wrap" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span>
                Mở <strong>script.google.com</strong> → New Project → dán mã dưới → <strong>Deploy → Web App</strong> (Execute as: <em>Me</em>, Access: <em>Anyone</em>) → dán URL vào ô trên.
              </span>
              <button
                className="btn btn-sm btn-soft"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
                    setCopiedScript(true);
                    showToast('Đã sao chép mã Google Apps Script!');
                    window.setTimeout(() => setCopiedScript(false), 2000);
                  } catch {
                    showToast('Hãy bôi đen mã và nhấn Cmd+C.');
                  }
                }}
              >
                {copiedScript ? <Check size={14} /> : <Copy size={14} />}{' '}
                {copiedScript ? 'Đã chép' : 'Sao chép Code.gs'}
              </button>
            </div>
            <pre className="prompt-box">{APPS_SCRIPT_CODE_TEMPLATE}</pre>
          </div>
        </details>
      </section>

      {/* Block 5: Full Backup & Restore */}
      <section className="card stack-md">
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          5. Sao lưu & Khôi phục tệp thủ công (.json)
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Xuất toàn bộ tiến độ, thẻ SRS, thẻ tự thêm trong bài, Mastered Bank, nhãn phân môn và sách đã nạp thành 1 tệp <code className="mono">.json</code> duy nhất để mở lại trên thiết bị khác.
        </p>

        <label className="flex-row" style={{ fontSize: '0.86rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includePacksInBackup}
            onChange={(e) => setIncludePacksInBackup(e.target.checked)}
          />
          <span>Đính kèm các gói bài học .json tự nạp (IndexedDB) trong tệp sao lưu</span>
        </label>

        <div className="flex-row flex-wrap">
          <button className="btn btn-primary" onClick={() => exportFullBackup(includePacksInBackup)}>
            <Download size={15} /> Xuất toàn bộ sao lưu (.json)
          </button>
          <button className="btn" onClick={() => backupInputRef.current?.click()}>
            <Upload size={15} /> Khôi phục từ sao lưu (.json)
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRestoreFile(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn btn-danger"
            onClick={() => {
              if (
                window.confirm(
                  'Bạn chắc chắn muốn đặt lại toàn bộ tiến độ, SRS và Mastered Bank?'
                )
              ) {
                resetProgress();
              }
            }}
          >
            <RotateCcw size={15} /> Đặt lại tiến độ
          </button>
        </div>
      </section>
    </div>
  );
};
