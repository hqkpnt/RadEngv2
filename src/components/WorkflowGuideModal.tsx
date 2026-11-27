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

QUY TẮC BẮT BUỘC (TẬP TRUNG 3 KỸ NĂNG: VOCABULARY · GRAMMAR · READING):
1. Chính xác tuyệt đối về thuật ngữ y khoa CĐHA & DSA (không bịa số liệu hoặc phác đồ ngoài tài liệu).
2. Toàn bộ trường dịch nghĩa tiếng Việt (*Vi) phải chuẩn thuật ngữ chuyên khoa Việt Nam.
3. Vocabulary: 6–10 thuật ngữ cốt lõi nhất của chương, bắt buộc có ipa, wordRoot (phân tích gốc Hy Lạp/Latinh), termKey (snake_case không dấu), noteVi lâm sàng, và ví dụ song ngữ Anh–Việt sát thực hành đọc phim/can thiệp.
4. Grammar: 1–2 điểm ngữ pháp tiêu biểu trong chương.
   - ĐẶT TÊN điểm ngữ pháp ("topic") PHẢI ngắn gọn, chuẩn tên ngữ pháp tiếng Anh (2–5 từ, ví dụ: "Passive Modal Verbs", "Past Simple Passive", "Participle Clauses", "Reduced Relative Clauses", "Concession Clauses") — KHÔNG nhồi ngữ cảnh dài dòng vào tên điểm ngữ pháp (tránh kiểu "Passive Modal Verbs for Clinical Recommendations & Protocols").
   - Đưa ngữ cảnh CĐHA/DSA hoặc học thuật một cách tự nhiên vào phần explanationVi, sourceSentence và 3 câu quickExercises (trộn mcq + fill, mỗi câu có id riêng như "gp1_q1", "gp1_q2", "gp1_q3").
5. Reading: 2–3 đoạn tổng hợp kiến thức trọng tâm từ chương (có bản dịch tiếng Việt từng đoạn), glossary (3–5 thuật ngữ khó) và ĐỦ 4 dạng câu hỏi: mcq, tfng (TRUE/FALSE/NOT GIVEN), matching, completion (có evidenceParagraph).

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
    "estimatedMinutes": 30,
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
                  <strong>Bước 1 — Tạo tệp JSON 3 kỹ năng từ Gemini</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Mở tab <strong>3. Prompt Gemini (.json)</strong>, chọn <em>Phân môn</em>, điền tên sách &amp; chương rồi bấm <strong>Sao chép Prompt</strong> và gửi kèm PDF/ảnh tài liệu cho Gemini để nhận 1 tệp <code className="mono">.json</code> gọn nhẹ tập trung vào <strong>Vocabulary · Grammar · Reading</strong>. Bạn có thể tùy chỉnh nhãn Phân môn bất cứ lúc nào ở trang <strong>Bài học</strong> hoặc <strong>Nạp &amp; Dữ liệu</strong>.
                  </div>
                </div>

                <div className="card-subtle stack-sm">
                  <strong>Bước 2A — Nạp nhanh trực tiếp trên web (Khuyên dùng hàng ngày)</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Vào <strong>Nạp &amp; Dữ liệu</strong> → kéo thả tệp <code className="mono">.json</code> hoặc dán chuỗi JSON trực tiếp. Hệ thống kiểm tra schema chặt chẽ (báo lỗi rõ từng trường thiếu/sai) rồi lưu vào <code className="mono">IndexedDB</code> và đồng bộ lên Google Drive qua Apps Script Web App.
                  </div>
                </div>

                <div className="card-subtle stack-sm">
                  <strong>Bước 2B — Hoặc lưu bài cố định vào kho GitHub Pages</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Lưu tệp JSON vào <code className="mono">public/lessons/ten-bai.json</code>, thêm tên tệp vào <code className="mono">public/lessons/index.json</code>, chạy <code className="mono">npm run build</code> (tự chạy <code className="mono">validate-lessons</code> kiểm tra cú pháp, ID trùng &amp; cấu trúc) rồi <code className="mono">git push origin main</code> để GitHub Actions tự phát hành.
                  </div>
                </div>

                <div className="card-subtle stack-sm">
                  <strong>Bước 3 — Học 3 kỹ năng, Lưu nhanh &amp; Dán hàng loạt Flashcard</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Trong tab <strong>Vocabulary</strong>, bấm <strong>+ Thêm thẻ thủ công</strong> hỗ trợ cả nhập lẻ lẫn <strong>Dán nhanh hàng loạt (JSON)</strong> (5–20 thẻ/lần, tự lọc trùng &amp; đẩy SRS SM-2). Từ tab <strong>Grammar</strong> và <strong>Reading</strong> đều có nút lưu nhanh thuật ngữ/cấu trúc kèm câu ngữ cảnh gốc sang Flashcard; bài đọc Reading chia 2 cột cuộn độc lập kiểu IELTS.
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
                  <strong>Cách 1 — Đồng bộ nhanh qua Google Apps Script Web App (Khuyên dùng)</strong>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    <li>Vào <strong>Nạp &amp; Dữ liệu</strong> → dán Web App URL có đuôi <code className="mono">/exec</code> (URL được ẩn bảo mật và có xác nhận trước khi ghi đè).</li>
                    <li>Bật tự động đẩy hoặc bấm <strong>Đẩy lên Cloud / Tải từ Cloud</strong> để đồng bộ toàn bộ bài JSON tự nạp, tiến độ 3 kỹ năng, thẻ SRS (SM-2) và Mastered Bank giữa MacBook ↔ iPad ↔ điện thoại.</li>
                  </ol>
                </div>

                <div className="card-subtle stack-sm">
                  <strong>Cách 2 — Sao lưu &amp; Khôi phục thủ công (.json)</strong>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    <li>Vào <strong>Nạp &amp; Dữ liệu</strong> → tích chọn <em>Đính kèm các gói bài học .json tự nạp</em> → bấm <strong>Xuất toàn bộ sao lưu (.json)</strong>.</li>
                    <li>Lưu tệp sao lưu vào <strong>iCloud Drive / Google Drive</strong> hoặc gửi qua <strong>AirDrop</strong> sang thiết bị khác, rồi chọn <strong>Khôi phục từ sao lưu (.json)</strong>.</li>
                  </ol>
                </div>

                <div className="flex-between flex-wrap">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Mẹo: Nên xuất thêm 1 bản sao lưu .json mỗi tuần để phòng khi xóa dữ liệu trình duyệt.
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
