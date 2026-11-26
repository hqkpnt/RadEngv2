import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  CloudDownload,
  Copy,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WorkflowGuideModal: React.FC = () => {
  const { guideOpen, setGuideOpen, subspecialties, exportFullBackup, showToast } = useApp();
  const [tab, setTab] = useState<'workflow' | 'sync' | 'prompt'>('workflow');
  const [promptSub, setPromptSub] = useState(subspecialties[1]?.id || subspecialties[0]?.id || 'neuro_dsa');
  const [promptBook, setPromptBook] = useState('Handbook of Neuroendovascular Intervention');
  const [promptChapter, setPromptChapter] = useState('Ch. 5 — Intracranial Aneurysm Coiling');
  const [copied, setCopied] = useState(false);

  const selectedSubLabel =
    subspecialties.find((s) => s.id === promptSub)?.label || 'DSA Thần kinh';

  const geminiPrompt = useMemo(() => {
    return `Bạn là chuyên gia Chẩn đoán hình ảnh & Điện quang can thiệp (DSA) kiêm giảng viên tiếng Anh y khoa học thuật.
Hãy đọc kỹ chương sách / tài liệu đính kèm và trích xuất thành ĐÚNG 1 tệp JSON hợp lệ (KHÔNG thêm văn bản giải thích ngoài khối JSON) theo chuẩn RadEng v4.0 (schemaVersion: 2) dưới đây.

THÔNG TIN NGỮ CẢNH:
- Phân môn (subspecialty): "${promptSub}" (${selectedSubLabel})
- Sách nguồn (sourceBook): "${promptBook}"
- Chương / Chủ đề: "${promptChapter}"

QUY TẮC BẮT BUỘC:
1. Chính xác tuyệt đối về thuật ngữ y khoa CĐHA & DSA (không bịa số liệu hoặc phác đồ ngoài tài liệu).
2. Toàn bộ trường dịch nghĩa tiếng Việt (*Vi) phải chuẩn thuật ngữ chuyên khoa Việt Nam.
3. Vocabulary: 6–10 thuật ngữ cốt lõi nhất của chương, bắt buộc có ipa, wordRoot (phân tích gốc Hy Lạp/Latinh), termKey (snake_case không dấu), noteVi lâm sàng, và ví dụ song ngữ Anh–Việt sát thực hành đọc phim/can thiệp.
4. Grammar: 1–2 điểm ngữ pháp tiêu biểu trong chương.
   - ĐẶT TÊN điểm ngữ pháp ("topic") PHẢI ngắn gọn, chuẩn tên ngữ pháp tiếng Anh (2–5 từ, ví dụ: "Passive Modal Verbs", "Past Simple Passive", "Participle Clauses", "Reduced Relative Clauses", "Concession Clauses") — KHÔNG nhồi ngữ cảnh dài dòng vào tên điểm ngữ pháp (tránh kiểu "Passive Modal Verbs for Clinical Recommendations & Protocols").
   - Đưa ngữ cảnh CĐHA/DSA hoặc học thuật một cách tự nhiên vào phần explanationVi, sourceSentence và 3 câu quickExercises (trộn mcq + fill, mỗi câu có id riêng như "gp1_q1", "gp1_q2", "gp1_q3").
5. Listening: Viết kịch bản thuyết minh/bàn giao ca bệnh hấp dẫn kiểu phim tài liệu khoa học (4–6 câu ngắn gọn có nhịp ngắt rõ ràng), kèm notesTemplate (3 ý), gapFill (2–3 câu) và mcq (2–3 câu).
6. Reading: 2–3 đoạn tổng hợp kiến thức trọng tâm từ chương (có bản dịch tiếng Việt từng đoạn), glossary (3–5 thuật ngữ khó) và ĐỦ 4 dạng câu hỏi: mcq, tfng (TRUE/FALSE/NOT GIVEN), matching, completion (có evidenceParagraph).
7. Writing: ĐÚNG 8 câu paraphraseTasks (trộn translation Việt→Anh và paraphrase y khoa có targetKeywords) + 1 essayTask (viết tóm tắt hình ảnh/tường trình ca lâm sàng >=150 từ) kèm 3 bài mẫu đối chiếu band7, band8, band9.
8. Speaking: Đủ 3 stages (Stage 1 hỏi nhanh, Stage 2 Cue Card trình bày ca bệnh 1p chuẩn bị + 2p nói, Stage 3 thảo luận chuyên sâu) + shadowing gồm simple (2–3 câu) và complex (2–3 câu, dùng dấu "/" ngắt nhịp hơi).

MẪU CẤU TRÚC JSON BẮT BUỘC:
{
  "schemaVersion": 2,
  "id": "rad-${promptSub}-ten-bai-khong-dau",
  "meta": {
    "title": "English Lesson Title",
    "titleVi": "Tiêu đề tiếng Việt chuẩn chuyên ngành",
    "level": "C1",
    "subspecialty": "${promptSub}",
    "sourceBook": "${promptBook} (${promptChapter})",
    "tags": ["DSA", "CT/MRI", "Keyword3"],
    "estimatedMinutes": 45,
    "createdAt": "${new Date().toISOString().slice(0, 10)}"
  },
  "vocabulary": [
    {
      "termKey": "example_term",
      "term": "exact English medical term",
      "ipa": "/.../",
      "pos": "noun phrase",
      "wordRoot": "gốc từ + nghĩa",
      "meaningVi": "Nghĩa tiếng Việt chuẩn y khoa",
      "noteVi": "Lưu ý lâm sàng / đọc phim / thủ thuật",
      "exampleEn": "Clinical example sentence in English.",
      "exampleVi": "Dịch câu ví dụ sang tiếng Việt."
    }
  ],
  "grammar": [
    {
      "id": "gp_1",
      "topic": "Passive Modal Verbs",
      "formula": "S + modal (should / must / may / can) + be + V3/ed",
      "explanationVi": "Dùng thể bị động với động từ khuyết thiếu để nêu khuyến cáo, chỉ định hoặc nguyên tắc thực hành một cách khách quan.",
      "sourceSentence": { "en": "...", "vi": "..." },
      "quickExercises": [
        { "id": "gp1_q1", "type": "mcq", "prompt": "...", "options": ["A", "B", "C"], "answer": "A", "explanationVi": "..." },
        { "id": "gp1_q2", "type": "fill", "prompt": "...", "answer": "...", "explanationVi": "..." },
        { "id": "gp1_q3", "type": "mcq", "prompt": "...", "options": ["A", "B", "C"], "answer": "B", "explanationVi": "..." }
      ]
    }
  ],
  "listening": {
    "title": "Documentary / Cath-Lab Briefing Title",
    "notesTemplate": ["Điểm ghi chú 1", "Điểm ghi chú 2", "Điểm ghi chú 3"],
    "transcriptSentences": [
      { "id": "s1", "en": "Sentence 1 with natural documentary cadence.", "vi": "Dịch câu 1." }
    ],
    "gapFill": [
      { "id": "lg1", "sentence": "Sentence with _____ blank.", "answer": "keyword", "hint": "gợi ý tiếng Việt" }
    ],
    "mcq": [
      { "id": "lm1", "question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanationVi": "..." }
    ]
  },
  "reading": {
    "title": "Passage Title",
    "paragraphs": [
      { "id": "p1", "en": "...", "vi": "..." }
    ],
    "glossary": [
      { "termKey": "glossary_term", "term": "...", "ipa": "/.../", "wordRoot": "...", "meaningVi": "..." }
    ],
    "questions": {
      "mcq": [{ "id": "r_mcq1", "question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "evidenceParagraph": "p1", "explanationVi": "..." }],
      "tfng": [{ "id": "r_tf1", "statement": "...", "answer": "TRUE", "evidenceParagraph": "p1", "explanationVi": "..." }],
      "matching": [{ "id": "r_m1", "prompt": "...", "options": ["A", "B", "C"], "answer": "A", "evidenceParagraph": "p1" }],
      "completion": [{ "id": "r_c1", "prompt": "... _____ ...", "answer": "word", "evidenceParagraph": "p1" }]
    }
  },
  "writing": {
    "paraphraseTasks": [
      { "id": "w1", "type": "translation", "prompt": "...", "targetKeywords": ["kw1", "kw2"], "modelAnswer": "...", "noteVi": "..." }
    ],
    "essayTask": {
      "prompt": "...",
      "minWords": 150,
      "recommendedMinutes": 20,
      "models": { "band7": "...", "band8": "...", "band9": "..." }
    }
  },
  "speaking": {
    "stages": [
      { "stage": 1, "title": "Stage 1 — Quick Clinical Check", "prompts": [{ "question": "...", "sampleAnswer": "...", "hintVi": "..." }] },
      { "stage": 2, "title": "Stage 2 — Case Cue Card", "prepSeconds": 60, "speakSeconds": 120, "cueCard": "...", "bulletPoints": ["..."], "sampleAnswer": "...", "prompts": [] },
      { "stage": 3, "title": "Stage 3 — Interventional Discussion", "prompts": [{ "question": "...", "sampleAnswer": "...", "hintVi": "..." }] }
    ],
    "shadowing": {
      "simple": [{ "id": "sh_s1", "en": "Short clinical phrase / with natural pauses.", "vi": "..." }],
      "complex": [{ "id": "sh_c1", "en": "Longer academic sentence / with clear rhetorical breaks.", "vi": "..." }]
    }
  }
}`;
  }, [promptSub, selectedSubLabel, promptBook, promptChapter]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(geminiPrompt);
      setCopied(true);
      showToast('Đã sao chép Prompt chuẩn cho Gemini!');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast('Không thể sao chép tự động — hãy bôi đen khung Prompt và nhấn Cmd+C.');
    }
  };

  return (
    <AnimatePresence>
      {guideOpen && (
        <motion.div
          className="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setGuideOpen(false)}
        >
          <motion.div
            className="modal-box stack-md"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between">
              <div className="flex-row">
                <Sparkles size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0 }}>Hướng dẫn Quy trình & Prompt chuẩn Gemini</h3>
              </div>
              <button
                className="btn btn-icon btn-sm"
                onClick={() => setGuideOpen(false)}
                aria-label="Đóng hướng dẫn"
              >
                <X size={16} />
              </button>
            </div>

            <div className="segmented">
              <button
                className={tab === 'workflow' ? 'active' : ''}
                onClick={() => setTab('workflow')}
              >
                1. Quản lý bài & sách
              </button>
              <button className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>
                2. Sao lưu & Đồng bộ
              </button>
              <button className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>
                3. Prompt Gemini (.json)
              </button>
            </div>

            {tab === 'workflow' && (
              <div className="stack-sm">
                <div className="card-subtle stack-sm">
                  <strong>Bước 1 — Tùy chỉnh nhãn Phân môn chuyên khoa</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Vào mục <strong>Bài học</strong> (bấm nút <em>Quản lý phân môn</em> ở cột lọc) hoặc mục <strong>Nạp & Dữ liệu</strong> để thêm mới (VD: <em>DSA Tim mạch</em>, <em>CĐHA Cơ xương khớp</em>), đổi tên hoặc xóa nhãn phân môn bất cứ lúc nào.
                  </div>
                </div>
                <div className="card-subtle stack-sm">
                  <strong>Bước 2 — Dùng Gemini trích xuất chương sách thành file .json</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Chuyển sang tab <strong>3. Prompt Gemini (.json)</strong> ngay bên cạnh, điền tên sách & phân môn, bấm <strong>Sao chép Prompt</strong> rồi dán cùng file PDF/ảnh trang sách vào Gemini. Lưu kết quả thành tệp <code className="mono">.json</code>.
                  </div>
                </div>
                <div className="card-subtle stack-sm">
                  <strong>Bước 3 — Nạp bài học vào thư viện (IndexedDB)</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Vào <strong>Nạp & Dữ liệu</strong> → kéo thả 1 hoặc nhiều tệp <code className="mono">.json</code> (hỗ trợ cả chuẩn <strong>RadEng v3.1</strong> lẫn <strong>v2</strong>). Bạn có thể gán lại <em>Phân môn</em> hoặc <em>Tên sách nguồn</em> trước khi bấm Lưu.
                  </div>
                </div>
                <div className="card-subtle stack-sm">
                  <strong>Bước 4 — Học 6 kỹ năng & Bổ sung thẻ thủ công trong từng bài</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Trong tab <strong>Vocabulary</strong> của từng bài học, bạn có thể bấm <strong>+ Thêm thẻ thủ công</strong> để bổ sung thuật ngữ gặp khi đi buồng/đọc phim, nhấn <strong>+ Ôn tập SRS</strong> để đẩy sang lịch lặp lại ngắt quãng SM-2, hoặc đánh dấu <strong>Đã thuộc ✓</strong> để lưu vào Mastered Bank.
                  </div>
                </div>
                <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setTab('prompt')}>
                    <BookOpen size={15} /> Lấy Prompt chuẩn cho Gemini →
                  </button>
                </div>
              </div>
            )}

            {tab === 'sync' && (
              <div className="stack-md">
                <div className="card-subtle stack-sm">
                  <strong>Vì sao cần Sao lưu thủ công?</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Ứng dụng chạy dạng <strong>Web tĩnh 100% riêng tư</strong> (không máy chủ, không đăng nhập). Toàn bộ tiến độ, SRS, Mastered Bank, nhãn phân môn được lưu trong <code className="mono">LocalStorage</code> và các gói bài học tự nạp lưu trong <code className="mono">IndexedDB</code> của chính trình duyệt trên thiết bị đó.
                  </div>
                </div>

                <div className="card-subtle stack-sm">
                  <strong>Quy trình đồng bộ MacBook ↔ iPad ↔ Điện thoại (chỉ mất 10 giây):</strong>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    <li>Trên thiết bị chính (VD: MacBook), vào <strong>Nạp & Dữ liệu</strong> → tích chọn <em>Đính kèm các gói bài học .json tự nạp</em> → bấm <strong>Xuất toàn bộ sao lưu (.json)</strong>.</li>
                    <li>Lưu tệp <code className="mono">raddsa-backup-YYYY-MM-DD.json</code> vào <strong>iCloud Drive / Google Drive</strong> hoặc gửi nhanh qua <strong>AirDrop</strong> sang iPad/iPhone.</li>
                    <li>Mở trang web trên iPad/điện thoại → vào <strong>Nạp & Dữ liệu</strong> → bấm <strong>Khôi phục từ sao lưu (.json)</strong> và chọn tệp vừa gửi.</li>
                    <li>Toàn bộ sách đã nạp, thẻ SRS, Mastered Bank, XP và Streak sẽ đồng bộ trọn vẹn tức thì!</li>
                  </ol>
                </div>

                <div className="flex-between flex-wrap">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Mẹo: Nên xuất 1 bản sao lưu cuối mỗi tuần để không mất dữ liệu khi xóa cache trình duyệt.
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => exportFullBackup(true)}
                  >
                    <CloudDownload size={15} /> Xuất sao lưu ngay (.json)
                  </button>
                </div>
              </div>
            )}

            {tab === 'prompt' && (
              <div className="stack-md">
                <div className="grid-3">
                  <div className="stack-sm">
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      CHỌN PHÂN MÔN
                    </label>
                    <select
                      className="select"
                      value={promptSub}
                      onChange={(e) => setPromptSub(e.target.value)}
                    >
                      {subspecialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="stack-sm">
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      TÊN SÁCH NGUỒN
                    </label>
                    <input
                      className="input"
                      value={promptBook}
                      onChange={(e) => setPromptBook(e.target.value)}
                    />
                  </div>
                  <div className="stack-sm">
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      CHƯƠNG / CHỦ ĐỀ
                    </label>
                    <input
                      className="input"
                      value={promptChapter}
                      onChange={(e) => setPromptChapter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-between flex-wrap">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Dán Prompt dưới đây vào <strong>Gemini</strong> kèm file PDF/chương sách, rồi lưu output thành tệp <code className="mono">.json</code>:
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={handleCopyPrompt}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
                    {copied ? 'Đã sao chép!' : 'Sao chép Prompt cho Gemini'}
                  </button>
                </div>

                <pre className="prompt-box">{geminiPrompt}</pre>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
