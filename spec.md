# Đặc tả Hệ thống Ứng dụng Web Tự học Tiếng Anh Cá nhân (Dual-Track IELTS & CĐHA/DSA)

- **Phiên bản đặc tả:** `v2.0` (Hợp nhất tinh hoa UX/UI của *ForumFlash* và chuẩn 6 kỹ năng `schemaVersion: 2` của *RadEng*)
- **Mục tiêu sản phẩm:** Ứng dụng web tự học tiếng Anh cá nhân chạy **song song 2 luồng học độc lập** trên cùng một giao diện tối giản, hoàn toàn miễn phí, không yêu cầu đăng nhập hay máy chủ backend, triển khai dạng **web tĩnh trên GitHub Pages**.
- **Thiết bị mục tiêu:** MacBook (Desktop), iPad (Tablet) và Điện thoại (Mobile).
- **Trạng thái hiện tại:** Hoàn thiện đặc tả (`spec.md`) để duyệt — **chưa triển khai mã nguồn**.

---

## Mục lục
1. [Kiến trúc 2 luồng song song (Dual-Track System)](#1-kiến-trúc-2-luồng-song-song-dual-track-system)
2. [Bảng hợp nhất tính năng (Giữ lại · Loại bỏ · Bổ sung mới)](#2-bảng-hợp-nhất-tính-năng-giữ-lại--loại-bỏ--bổ-sung-mới)
3. [Đặc tả chi tiết tính năng theo 6 kỹ năng & chức năng phụ trợ](#3-đặc-tả-chi-tiết-tính-năng-theo-6-kỹ-năng--chức-năng-phụ-trợ)
4. [Cấu trúc giao diện từng màn hình & Responsive (MacBook · iPad · Mobile)](#4-cấu-trúc-giao-diện-từng-màn-hình--responsive-macbook--ipad--mobile)
5. [Chuẩn dữ liệu JSON (`schemaVersion: 2`) & Kiến trúc lưu trữ trình duyệt](#5-chuẩn-dữ-liệu-json-schemaversion-2--kiến-trúc-lưu-trữ-trình-duyệt)
6. [Các cơ chế tương tác trọng tâm & Triển khai GitHub Pages](#6-các-cơ-chế-tương-tác-trọng-tâm--triển-khai-github-pages)

---

## 1. Kiến trúc 2 luồng song song (Dual-Track System)

Ứng dụng vận hành hai không gian học tách biệt hoàn toàn trên cùng một giao diện thông qua **Thanh chuyển đổi nhanh (`Mode Switcher`)** gắn cố định trên Header:

| Thuộc tính | Luồng 1: IELTS & Foundation (`ielts`) | Luồng 2: CĐHA & Điện quang can thiệp — DSA (`rad_dsa`) |
| :--- | :--- | :--- |
| **Mục tiêu học** | Luyện 6 kỹ năng tiếng Anh học thuật chuẩn IELTS & nền tảng CEFR (`A1–C2`). | Học tiếng Anh chuyên ngành từ các quyển sách/tài liệu Y khoa do người dùng biên soạn thành `.json`. |
| **Cách tổ chức nội dung** | Chia theo chặng trình độ (`A1–C2` / `Band 5.5–8.5+`) và chủ đề học thuật IELTS. | Chia theo **Phân môn** (5 nhóm) và **Tên sách nguồn (`sourceBook`)**. |
| **Bộ lọc chuyên biệt** | Bậc CEFR / Band mục tiêu, Chủ đề học thuật, Trạng thái hoàn thành. | **Phân môn:** `Chẩn đoán hình ảnh (CĐHA)`, `DSA Thần kinh`, `DSA Ung bướu`, `DSA Mạch máu ngoại biên`, `DSA Giảm đau` + **Tên sách nguồn** + Trạng thái. |
| **Tính năng đặc thù luồng** | **Bài test xếp lớp nhanh** (Quick Placement Test) gợi ý chặng bắt đầu + **Luyện tập có tính giờ** (Timed Mode). | **Nạp gói bài học `.json` từ sách** trực tiếp trên UI; ưu tiên thuật ngữ y khoa chính xác (`wordRoot`, `termKey`), ví dụ sát thực hành đọc phim & can thiệp nội mạch kèm dịch nghĩa chuẩn. |
| **Cô lập dữ liệu** | Namespace riêng `track: "ielts"` — Tiến độ, `Mastered Bank`, bộ thẻ SRS, XP/Cây luồng, Sổ tay **không trộn lẫn** với Luồng 2. | Namespace riêng `track: "rad_dsa"` — Tiến độ, `Mastered Bank` thuật ngữ y khoa, bộ thẻ SRS, XP/Cây luồng, Sổ tay **tách biệt hoàn toàn** với Luồng 1. |
| **Nhận diện thị giác** | Tông màu nhấn học thuật (VD: Xanh dương Indigo/Blue). | Tông màu nhấn y khoa lâm sàng (VD: Xanh ngọc Teal/Cyan) để người học nhận biết ngay luồng đang mở. |

---

## 2. Bảng hợp nhất tính năng (Giữ lại · Loại bỏ · Bổ sung mới)

### 2.1. Tính năng ĐÃ GIỮ & TỐI ƯU (từ ForumFlash & RadEng)
- **Từ ForumFlash:**
  - Giao diện tối giản, chia chặng/lộ trình rõ ràng, phản hồi đúng/sai tức thì.
  - Chế độ **Dark Mode / Light Mode / Theo máy** và tùy chỉnh **Cỡ chữ (`Nhỏ / Vừa / Lớn`)**.
  - Chế độ đọc tập trung **`Zen Mode`** và ngăn kéo **`Sổ tay`** ghi chú cục bộ.
  - **Gamification cá nhân:** Điểm `XP`, chuỗi ngày học (`Streak` theo tuần T2–CN), **Cây phát triển 6 giai đoạn** (`01 Hạt giống` → `06 Kết trái`).
  - Hệ thống **Ôn tập thẻ SRS (SM-2)** với 2 chiều ôn (`Việt → gõ Anh` và `Anh → nhớ Việt`), 4 mức đánh giá phím `1–4` (`Chưa nhớ / Khó / Nhớ / Dễ`), quản lý thư mục thẻ và lọc/sắp xếp.
  - **Luyện tập có giới hạn thời gian (Timed Practice)** và đánh giá độ khó/sao (`1★–3★`).
- **Từ RadEng (`schemaVersion: 2`):**
  - Chuẩn cấu trúc **6 kỹ năng đồng nhất** trong mỗi gói bài học `.json`: `Vocabulary`, `Grammar`, `Listening`, `Reading`, `Writing`, `Speaking`.
  - **Vocabulary chi tiết:** `ipa`, `wordRoot` (gốc từ/tiền tố-hậu tố), `termKey`, ví dụ song ngữ Anh–Việt, ghi chú chuyên môn.
  - **Grammar chi tiết:** công thức (`formula`), câu nguồn trích ngữ cảnh thật (`sourceSentence`), và **3 bài tập thực hành nhanh** (`quickExercises`).
  - **Listening:** 2 dạng bài `gapFill` + `mcq`.
  - **Reading:** đầy đủ **4 dạng bài** kèm **bản dịch song ngữ từng đoạn** và **Glossary** tra nhanh.
  - **Writing:** **8 câu paraphrase/translation** + **bài luận/báo cáo** kèm **bài mẫu đối chiếu Band 7 / Band 8 / Band 9**.
  - **Speaking:** **3 Stage** + **Shadowing** (2 mức `simple` và `complex`).
  - Ngân hàng từ đã thuộc **`Mastered Bank`** định danh theo `termKey`.

### 2.2. Tính năng ĐÃ LOẠI BỎ (không đưa vào ứng dụng cá nhân)
- **Hệ thống đăng nhập & xác thực tài khoản** (Google OAuth, modal xác nhận điều khoản/16+, chế độ Khách bị khóa từ bài 02+).
- **Bình luận cộng đồng, diễn đàn, bảng xếp hạng công khai**.
- **Các giới hạn trả phí (Paywall) & hạn mức AI máy chủ** (khóa chặng A2–C2, giới hạn 15 lượt chấm Writing/tháng, 20 lượt tra từ/ngày, API chấm bài phụ thuộc backend).
- **Widget màn hình khóa & tính năng native mobile** (iOS/Android lock-screen widgets).
- **Thành phần thương mại/vận hành trung tâm:** Nút nổi `Sản phẩm` (bán sách Shopee/TikTok/Tiki), nút `Hỗ trợ` gửi ticket về máy chủ / QR Zalo OA, trang pháp lý thương mại (`/dieu-khoan`, `/chinh-sach-bao-mat`), và trang `/hoc-lieu` phụ thuộc Google Docs/API riêng.

### 2.3. Tính năng ĐÃ BỔ SUNG MỚI
1. **Thanh chuyển đổi nhanh 2 luồng (`Mode Switcher`)** giữa *IELTS & Foundation* và *CĐHA & DSA* với cơ chế **cô lập dữ liệu hoàn toàn** (tiến độ, SRS, `Mastered Bank`, bộ lọc).
2. **Bộ lọc chuyên ngành CĐHA & DSA** theo 5 phân môn (`CĐHA`, `DSA Thần kinh`, `DSA Ung bướu`, `DSA Mạch máu ngoại biên`, `DSA Giảm đau`) kết hợp lọc theo **Tên sách nguồn**.
3. **Bài test xếp lớp nhanh (Quick Placement Test)** cho Luồng 1 (*IELTS & Foundation*) chạy hoàn toàn phía client để gợi ý chặng khởi đầu.
4. **Trình nạp bài học `.json` trực tiếp trên giao diện (JSON Lesson Importer)** hỗ trợ kiểm tra lược đồ `schemaVersion: 2`, xem trước 6 kỹ năng, gắn phân môn/tên sách và lưu thẳng vào trình duyệt.
5. **Chế độ `Chép chính tả từng câu` (Sentence-by-Sentence Dictation)** trong kỹ năng Listening: nghe từng câu, gõ lại, tự động đối chiếu từng từ và **làm nổi bật từ sai đầu tiên** để sửa dần đến khi chuẩn 100%.
6. **Nút luyện đọc phát âm (`Pronunciation Check`) bằng Web Speech API (`SpeechRecognition`)** trong Speaking & Vocabulary: thu âm trực tiếp trên thiết bị, đối chiếu tức thì từng từ với từ/câu mục tiêu, hiển thị % khớp và tô màu đúng/sai.
7. **Nhắc học cá nhân (Personal Study Reminder):** cài đặt mục tiêu học mỗi ngày (XP hoặc số phút), giờ nhắc nhẹ trên web (Web Notification API tùy chọn + thanh nhắc trong app).
8. **Sao lưu & Khôi phục toàn bộ dữ liệu (`.json` Full Backup / Restore):** xuất/nhập 1 tệp duy nhất để đồng bộ thủ công giữa MacBook, iPad và điện thoại trên nền web tĩnh GitHub Pages.

---

## 3. Đặc tả chi tiết tính năng theo 6 kỹ năng & chức năng phụ trợ

### 3.1. Điều hướng toàn cục & Thanh công cụ cá nhân
- **Mode Switcher (`IELTS & Foundation` | `CĐHA & DSA`):** Chuyển luồng tức thì, cập nhật toàn bộ danh sách bài học, bộ lọc, `Mastered Bank`, thống kê XP/Cây và huy hiệu số thẻ SRS tới hạn của luồng tương ứng.
- **5 khu vực điều hướng chính:**
  1. `Tổng quan` (`#/home`): Cây phát triển 6 giai đoạn, Streak tuần, mục tiêu ngày, nút tiếp tục bài đang học, nút làm **Test xếp lớp nhanh** (Luồng 1) hoặc **Nạp bài từ sách `.json`** (Luồng 2).
  2. `Bài học` (`#/lessons`): Lộ trình / Danh sách các gói bài học 6 kỹ năng theo luồng hiện tại kèm bộ lọc & tìm kiếm.
  3. `Ôn tập SRS` (`#/review`) + huy hiệu số thẻ tới hạn: Kho Flashcard SM-2 tách riêng theo luồng.
  4. `Từ đã thuộc` (`#/mastered`): **`Mastered Bank`** tách riêng theo luồng — quản lý toàn bộ thuật ngữ đã thuộc (`termKey`), xem gốc từ (`wordRoot`), lọc theo phân môn/sách, hoặc đẩy ngược về SRS nếu cần ôn lại.
  5. `Nạp & Dữ liệu` (`#/library`): Quản lý gói bài học `.json` (nạp mới, xem chi tiết, xóa/ghi đè gói tự nạp), Sao lưu/Khôi phục dữ liệu (`.json`), và Cài đặt nhắc học cá nhân.
- **Nút Cài đặt hiển thị nhanh (góc phải Header):** `Giao diện` (`Sáng / Tối / Theo máy`), `Cỡ chữ` (`Nhỏ / Vừa / Lớn`), công tắc `Tự động phát âm (TTS)`, và `Nhắc học cá nhân`.

---

### 3.2. Chi tiết 6 thẻ kỹ năng trong một bài học (`#/lesson/:lessonId`)

Mỗi bài học mở ra với thanh **6 tab kỹ năng** kèm trạng thái tiến độ từng tab (`Chưa học` / `Đang học` / `Hoàn thành`), nút bật **`Zen Mode`** (ẩn khung phụ để tập trung), nút mở **`Sổ tay`** (ghi chú cục bộ gắn với bài học), và công tắc **`Chế độ tính giờ (Timed Mode)`** khi cần luyện áp lực thời gian:

#### Tab 1: Vocabulary (Từ vựng)
- **Chế độ danh sách chi tiết (RadEng Card View):** Hiển thị từng mục từ với đầy đủ: `term`, `ipa`, từ loại (`pos`), phân tích gốc từ **`wordRoot`** (VD: *thromb- (cục máu đông) + -ectomy (lấy bỏ)*), định danh `termKey`, nghĩa tiếng Việt, ghi chú lâm sàng/học thuật, và cặp câu ví dụ song ngữ Anh–Việt.
  - Nút `Nghe (A)`: Phát âm thanh (ưu tiên audio URL nếu có, tự động fallback sang Web Speech API TTS với tùy chọn giọng Anh-Anh/Anh-Mỹ).
  - Nút `Phát âm thử (Mic)`: Đọc thử từ bằng Web Speech API và báo khớp ngay.
  - Nút `+ Ôn tập SRS`: Đẩy vào hàng đợi SM-2 của luồng hiện tại.
  - Nút `Đã thuộc (✓)`: Đưa `termKey` vào `Mastered Bank` của luồng hiện tại (có thể hoàn tác).
- **Chế độ Học thẻ Flashcard (`Flashcard Mode`):** Giao diện lật thẻ toàn vùng (chọn `Mặt trước: Anh/Việt`, phím `Space` lật, `Phóng to`, `Cần ôn` / `Đã nhớ`).
- **Chế độ Luyện tập tính giờ (`Timed Vocab Drill`):** Trắc nghiệm nhanh / gõ từ theo nghĩa với đồng hồ đếm ngược từng câu (VD: 15 giây/câu), phản hồi đúng/sai tức thì và chấm điểm `1★–3★`.

#### Tab 2: Grammar (Ngữ pháp)
- **Khối Lý thuyết cô đọng (RadEng):**
  - Tên điểm ngữ pháp, **Công thức (`formula`)** trình bày nổi bật, giải thích ứng dụng trong viết học thuật IELTS hoặc mô tả kết quả đọc phim/báo cáo DSA.
  - **Câu nguồn (`sourceSentence`)** kèm bản dịch tiếng Việt và phân tích cụm cấu trúc trọng tâm.
- **Khối Thực hành nhanh (3 bài tập chuẩn RadEng — `quickExercises`):**
  - Hỗ trợ điền từ / trắc nghiệm / sửa lỗi sai; bấm `Kiểm tra` cho phản hồi đúng/sai tức thì kèm giải thích chi tiết.
- **Chế độ Luyện tập tính giờ (`Timed Grammar Quiz`):** Khi gói bài cung cấp thêm ngân hàng câu hỏi luyện tập (hoặc bật đồng hồ cho bộ câu hỏi ngữ pháp), hỗ trợ 3 mức độ khó (`Dễ 1★`, `Vừa 2★` đạt ≥80%, `Khó 3★` yêu cầu 100%).

#### Tab 3: Listening & Dictation (Nghe hiểu & Chép chính tả)
Hỗ trợ nguồn âm thanh linh hoạt: tệp audio URL/nhúng **hoặc tự động đọc bằng Web Speech API TTS** (cho phép chọn tốc độ `0.75x`, `0.9x`, `1.0x`, `1.25x` và lặp đoạn) để chạy hoàn toàn offline trên web tĩnh. Gồm 3 chế độ con:
1. **`Gap-Fill` (Điền khuyết RadEng):** Nghe đoạn hội thoại/bài giảng chuyên môn và điền từ còn thiếu vào chỗ trống; kiểm tra tức thì, hiện đáp án và bản dịch.
2. **`MCQ` (Trắc nghiệm RadEng):** Các câu hỏi trắc nghiệm 4 lựa chọn kèm giải thích trích từ transcript.
3. **`Chép chính tả từng câu` (Sentence-by-Sentence Dictation — Bổ sung mới):**
   - Chia bài nghe thành danh sách các câu độc lập (`Câu 1/N`).
   - Thanh điều khiển: `Phát lại câu (R)`, đổi tốc độ (`0.75x / 1.0x`), `Gợi ý từ tiếp theo`, `Xem đáp án`.
   - Ô nhập câu trả lời → bấm `Kiểm tra (Enter)`:
     - Chuẩn hóa văn bản (bỏ qua hoa/thường và dấu câu tùy chọn) rồi **đối chiếu từng từ (word-by-word comparison)**.
     - Hiển thị từng từ đã đúng bằng màu xanh, **làm nổi bật rõ ràng từ sai đầu tiên (first mismatch highlight)** (cùng dấu vị trí thiếu/thừa từ) để người học nghe lại và tự sửa đúng từ đó trước khi chuyển sang câu tiếp theo.

#### Tab 4: Reading (Đọc hiểu)
- **Khung đọc văn bản (bên trái trên MacBook/iPad, phía trên trên Mobile):**
  - Công tắc **`Song ngữ từng đoạn`** (Bilingual Toggle): Bật/tắt bản dịch tiếng Việt ngay dưới từng đoạn văn (hoặc bấm biểu tượng dịch riêng từng đoạn).
  - **Glossary tương tác:** Các thuật ngữ quan trọng trong bài đọc được gạch chân nhẹ; bấm vào mở popover hiển thị nghĩa tiếng Việt, IPA, `wordRoot` và nút `+ Ôn tập SRS` / `Đã thuộc`.
  - Hỗ trợ **`Zen Mode`** và công tắc **Đồng hồ tính giờ (Timed Reading)**.
- **Khung bài tập 4 dạng chuẩn RadEng (bên phải trên MacBook/iPad, phía dưới trên Mobile):**
  1. `MCQ` (Trắc nghiệm 4 đáp án).
  2. `TFNG` (True / False / Not Given — hoặc Yes / No / Not Given).
  3. `Matching` (Nối tiêu đề đoạn / nối thuật ngữ – định nghĩa / nối thông tin).
  4. `Completion / Short Answer` (Điền từ vào tóm tắt hoặc trả lời ngắn theo giới hạn số từ).
  - Nút `Kiểm tra` cho phản hồi đúng/sai tức thì, hiện giải thích và tự động cuộn/nhấn mạnh đoạn văn chứa bằng chứng (`evidenceParagraphIndex`).

#### Tab 5: Writing (Viết học thuật & Chuyên ngành)
Chia thành 2 phần rõ ràng:
1. **Phần 1 — 8 câu Paraphrase / Translation (RadEng):**
   - Hiển thị lần lượt hoặc dạng danh sách 8 câu gốc (câu tiếng Anh cần viết lại hoặc câu tiếng Việt cần dịch sang tiếng Anh học thuật/y khoa).
   - Gợi ý từ khóa mục tiêu (`targetKeywords`), ô soạn câu của người học, nút `So sánh đáp án` để đối chiếu với câu chuẩn (`modelAnswer`) + giải thích cấu trúc, và nút tự đánh dấu `Đã hoàn thành câu`.
2. **Phần 2 — Bài luận / Báo cáo chuyên môn & Bài mẫu Band 7 / 8 / 9:**
   - Hiển thị đề bài (IELTS Task 1/2 ở Luồng 1; hoặc tóm tắt ca lâm sàng / mô tả hình ảnh / tường trình DSA ở Luồng 2).
   - Trình soạn thảo tích hợp: **Bộ đếm từ trực tiếp** (hiển thị mục tiêu từ tối thiểu, VD: `150` hoặc `250` từ), **Đồng hồ bấm giờ** (20 phút / 40 phút tùy chọn), **Tự động lưu bản nháp** vào bộ nhớ trình duyệt.
   - Bảng tự kiểm tra **Rubric 4 tiêu chí** (checkbox tự đánh giá: Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
   - Tab xem **Bài mẫu đối chiếu 3 cấp độ: `Band 7` | `Band 8` | `Band 9`** (cho phép mở song song với bài tự viết, làm nổi bật cụm từ nâng cấp và ghi chú giải thích vì sao đạt Band tương ứng).

#### Tab 6: Speaking & Pronunciation (Nói, Shadowing & Luyện phát âm)
1. **Luyện nói 3 giai đoạn (`3 Stages` chuẩn RadEng):**
   - *Stage 1:* Câu hỏi khởi động / trả lời ngắn kèm gợi ý ý tưởng và từ vựng mục tiêu.
   - *Stage 2:* Trình bày có cấu trúc (IELTS Cue Card hoặc Trình bày ca bệnh CĐHA/DSA) kèm đồng hồ `1 phút chuẩn bị` + `2 phút nói` và dàn ý gợi ý.
   - *Stage 3:* Câu hỏi thảo luận sâu / phản biện chuyên môn kèm câu trả lời tham khảo.
2. **Luyện `Shadowing` (2 mức: `Simple` & `Complex`):**
   - Chuyển đổi giữa tab `Simple` (câu ngắn, đánh dấu nhịp ngắt `/`) và `Complex` (câu phức dài học thuật / mô tả thủ thuật chuyên sâu).
   - Nút `Nghe mẫu` (tùy chỉnh tốc độ `0.75x / 0.9x / 1.0x`, lặp lại từng câu), hiển thị phiên âm/nghĩa tiếng Việt để bắt chước ngữ điệu.
3. **Luyện đọc phát âm bằng Web Speech API (`Pronunciation Check` — Bổ sung mới):**
   - Gắn trực tiếp trên từng câu Shadowing, câu mẫu Speaking và thẻ từ vựng.
   - Nhấn nút **`Luyện đọc (Mic)`** → dùng `window.SpeechRecognition` / `webkitSpeechRecognition` (`lang: "en-US"` hoặc `"en-GB"`) lắng nghe trực tiếp trên trình duyệt.
   - **Đối chiếu từng từ với câu/từ mục tiêu:**
     - Tính % độ chính xác (VD: `92% khớp`), hiển thị văn bản nhận diện được.
     - Tô **xanh** các từ đọc khớp, tô **đỏ/gạch chân** các từ thiếu hoặc nhận diện lệch để người học bấm nghe mẫu và đọc lại ngay.
   - **Cơ chế dự phòng (Fallback):** Nếu trình duyệt không hỗ trợ `SpeechRecognition` hoặc chưa cấp quyền micro, hiển thị thông báo hướng dẫn thân thiện và vẫn giữ nguyên tính năng nghe mẫu + ghi âm tự nghe lại (`MediaRecorder` tùy chọn nếu hỗ trợ).

---

### 3.3. Tính năng hỗ trợ theo luồng & Gamification cá nhân
- **Bài test xếp lớp nhanh (Luồng 1 — IELTS & Foundation):**
  - 15–20 câu ngắn gọn kết hợp Từ vựng, Ngữ pháp, Đọc nhanh có đếm giờ (khoảng 5–8 phút), chấm điểm tức thì phía client và đề xuất bậc khởi đầu (`A1–C2` / mục tiêu Band tương ứng). Có thể làm lại bất cứ lúc nào.
- **Gamification cá nhân (Không cộng đồng, không paywall):**
  - **Điểm XP:** Cộng tự động khi hoàn thành từng kỹ năng (VD: +20 XP/kỹ năng), đạt chuẩn Timed Quiz (+30 XP), hoàn thành phiên ôn SRS (+15 XP).
  - **Cây phát triển 6 chặng:** `01 Hạt giống` → `02 Nảy mầm` → `03 Phát triển thân` → `04 Phân cành` → `05 Ra lá` → `06 Kết trái` (hiển thị riêng cho từng luồng và chế độ xem tổng hợp).
  - **Chuỗi ngày học (`Streak`) & Lịch tuần (`T2–CN`):** Đánh dấu hoàn thành ngày khi đạt mục tiêu XP/phút cá nhân.
  - **Nhắc học cá nhân:** Người dùng tự chọn mục tiêu ngày (VD: `15 phút/ngày` hoặc `50 XP/ngày`) và khung giờ nhắc; hiển thị banner nhắc nhẹ trên app + thông báo trình duyệt (Notification API nếu người dùng cho phép).

---

## 4. Cấu trúc giao diện từng màn hình & Responsive (MacBook · iPad · Mobile)

### 4.1. Nguyên tắc thiết kế thị giác (Design System)
- **Phong cách:** Tối giản, thoáng mắt, giảm nhiễu thị giác (lấy cảm hứng từ ForumFlash).
- **Typography:** Font `sans-serif` rõ nét (`Inter`, `Plus Jakarta Sans`, fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`); font `monospace` cho phiên âm IPA, bộ đếm giờ và nhãn `termKey`. Hỗ trợ 3 cỡ chữ (`Nhỏ / Vừa / Lớn`).
- **Màu sắc & Dark Mode:** Quản lý bằng CSS Variables (`:root` và `[data-theme="dark"]`), khởi tạo theme trước khi render để không bị nháy sáng. Tông nhấn phân biệt rõ 2 luồng (`Indigo` cho IELTS, `Teal` cho CĐHA & DSA) và màu phản hồi nhất quán (`Xanh lá` đúng, `Đỏ san hô` sai/từ sai đầu tiên, `Vàng hổ phách` cần ôn).

### 4.2. Ma trận hiển thị đa thiết bị (Responsive Layout)

| Khu vực | MacBook / Desktop (`>= 1200px`) | iPad / Tablet (`768px – 1199px`) | Điện thoại / Mobile (`<= 767px`) |
| :--- | :--- | :--- | :--- |
| **Header** | 1 hàng cố định (`64px`): Logo (trái) · **Mode Switcher 2 luồng** · 5 mục điều hướng (giữa) · Cài đặt Theme/Font (phải). | 1 hàng gọn (`60px`): Logo rút gọn · Mode Switcher · 5 mục nav icon+chữ gọn · Cài đặt. | Header gọn (`56px`) gồm Logo + **Mode Switcher dạng pill** + nút Dark Mode/Cài đặt. **Thanh điều hướng chính chuyển xuống Bottom Navigation Bar (5 nút icon+nhãn ngắn)** cố định đáy màn hình — khắc phục triệt để lỗi thanh nav tràn 2 dòng của ForumFlash trên mobile. |
| **Sidebar / Bộ lọc (`/lessons`, `/review`, `/mastered`)** | Cột trái cố định (`260–280px`) hiển thị chặng/phân môn/sách hoặc thư mục thẻ. | Thanh lọc ngang gập gọn trên đầu danh sách (chip cuộn ngang + dropdown tên sách). | Thanh lọc dạng chip cuộn ngang + nút `Lọc` mở Bottom Sheet gọn gàng. |
| **Khu vực học 6 kỹ năng (`/lesson/:id`)** | Thanh 6 tab kỹ năng nằm ngang đầu trang. Riêng **Reading** & **Writing** dùng bố cục **2 cột độc lập** (văn bản/bài mẫu song song với câu hỏi/khung viết). | Thanh 6 tab ngang; Reading/Writing dùng 2 cột tỉ lệ `50/50` ở màn hình ngang và xếp dọc ở màn hình dọc. | Thanh 6 tab cuộn ngang dính trên (sticky) kèm chấm trạng thái hoàn thành; toàn bộ nội dung xếp **1 cột dọc**, nút kiểm tra/micro cố định dễ chạm bằng ngón cái. |
| **Sổ tay (`Notebook`)** | Drawer trượt từ cạnh phải (`360px`), không che mất nội dung chính. | Drawer trượt phủ cạnh phải (`340px`). | Bottom Sheet / Modal toàn màn hình có nút đóng nhanh. |
| **Footer** | Footer tối giản 1 dòng (phiên bản ứng dụng, trạng thái lưu cục bộ, nút nhanh Sao lưu JSON). | Footer tối giản 1 dòng. | Ẩn hoặc thu gọn trên đáy trang (nhường chỗ cho Bottom Navigation Bar). |

### 4.3. Sơ đồ bố cục từng màn hình chính
1. **`#/home` (Tổng quan):**
   - *Header* (có Mode Switcher) → *Hero Banner gọn* (lời chào theo luồng đang chọn + nút `Học tiếp bài gần nhất` + nút hành động chính: `Test xếp lớp nhanh` ở Luồng 1 hoặc `+ Nạp gói bài học .json` ở Luồng 2) → *Lưới 2 cột Gamification* (Trái: Cây 6 chặng + thanh XP; Phải: Streak 7 ngày + Tiến độ mục tiêu ngày) → *Thẻ tóm tắt nhanh* (Số thẻ SRS tới hạn, Số từ trong `Mastered Bank`, Tiến độ 6 kỹ năng).
2. **`#/lessons` (Lộ trình & Thư viện bài học):**
   - *Sidebar / Thanh lọc* (Luồng 1: chặng CEFR/chủ đề; Luồng 2: 5 phân môn CĐHA/DSA + dropdown `Tên sách nguồn` + ô tìm kiếm) → *Khu vực chính* hiển thị lưới/danh sách thẻ bài học, mỗi thẻ hiện tên bài, nguồn sách/chặng, 6 chấm trạng thái kỹ năng (`V·G·L·R·W·S`), số sao đạt được và nút `Vào học`.
3. **`#/lesson/:id` (Không gian học 6 kỹ năng):**
   - *Thanh tiêu đề bài học* (nút `< Quay lại`, tên bài, nhãn phân môn/sách, nút `Timed Mode`, `Zen`, `Sổ tay`) → *Thanh 6 tab kỹ năng* → *Vùng tương tác chính theo từng kỹ năng* (mô tả tại Mục 3.2).
4. **`#/review` (Ôn tập SRS):**
   - *Sidebar `Thư mục thẻ`* (cô lập theo luồng) → *Khối thống kê 4 chỉ số* (`Tới hạn`, `Tổng thẻ`, `Đã thuộc`, `Đang học`) + chọn `Chiều ôn` + nút `Ôn ngay` / `+ Tạo bộ thẻ` → *Thanh tìm kiếm & sắp xếp* → *Bảng thẻ* (hoặc giao diện *Phiên ôn SM-2* toàn vùng khi bấm `Ôn ngay`).
5. **`#/mastered` (`Mastered Bank`):**
   - *Bộ lọc theo nguồn/phân môn/sách + Ô tìm kiếm* → *Danh sách thẻ từ đã thuộc* (hiển thị `term`, `ipa`, `wordRoot`, nghĩa tiếng Việt, bài gốc, ngày thuộc) kèm nút `Nghe`, `Phát âm thử`, và `Đưa lại vào SRS`.
6. **`#/library` (Nạp bài `.json` & Quản lý dữ liệu):**
   - *Khối 1 — Nạp gói bài học `.json`:* Vùng kéo thả tệp, trình kiểm tra hợp lệ `schemaVersion: 2`, chọn/xác nhận `track`, `subspecialty`, `sourceBook`, nút tải **tệp `.json` mẫu chuẩn** cho cả 2 luồng.
   - *Khối 2 — Danh sách gói đã nạp:* Bật/tắt, xem thống kê 6 kỹ năng, xuất lại hoặc xóa từng gói.
   - *Khối 3 — Sao lưu & Cài đặt cá nhân:* Nút `Xuất toàn bộ sao lưu (.json)`, `Khôi phục từ sao lưu (.json)`, cài đặt `Nhắc học cá nhân`, và nút `Đặt lại dữ liệu luồng hiện tại` (có hộp thoại xác nhận).

---

## 5. Chuẩn dữ liệu JSON (`schemaVersion: 2`) & Kiến trúc lưu trữ trình duyệt

### 5.1. Kiến trúc lưu trữ phía Client (Không cần Server / DB)
Để ứng dụng chạy mượt trên **GitHub Pages** và nạp được nhiều sách CĐHA/DSA mà **không bị tràn giới hạn ~5 MB của `localStorage`**:

| Thành phần dữ liệu | Nơi lưu trữ | Key / Store đề xuất | Lý do kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Cài đặt UI & Luồng đang chọn** (theme, cỡ chữ, activeTrack, nhắc học) | `localStorage` | `engapp_v2_prefs` | Đọc đồng bộ ngay khi mở trang để áp dụng Dark Mode không nháy màn hình. |
| **Tiến độ, XP, Streak, Mastered Bank, Sổ tay, Thẻ SRS** (tách theo `ielts` và `rad_dsa`) | `localStorage` | `engapp_v2_state_ielts`, `engapp_v2_state_rad_dsa` | Dữ liệu gọn (vài trăm KB), lưu tức thì sau mọi tương tác, dễ kiểm tra và xuất JSON. |
| **Nội dung các gói bài học `.json` người dùng nạp thêm** | `IndexedDB` (tự động fallback sang `localStorage` nếu dữ liệu nhỏ) | DB `engapp_v2_db` → store `lesson_packs` | Gói 6 kỹ năng đầy đủ từ nhiều quyển sách y khoa có thể lên tới hàng chục MB; `IndexedDB` cho phép lưu thoải mái trên MacBook, iPad và điện thoại. |
| **Gói bài học mẫu tích hợp sẵn (Built-in Starter Packs)** | Tệp tĩnh trong thư mục `public/lessons/*.json` | Tải qua `fetch('./lessons/index.json')` | Triển khai thẳng cùng GitHub Pages, người dùng mở lên là học thử được ngay cả 2 luồng. |

---

### 5.2. Lược đồ chuẩn gói bài học `.json` (RadEng `schemaVersion: 2` mở rộng Dual-Track)

Mọi tệp bài học `.json` nạp vào hệ thống (cho cả Luồng 1 và Luồng 2) dùng chung một lược đồ thống nhất:

```json
{
  "schemaVersion": 2,
  "id": "dsa-neuro-01-mechanical-thrombectomy",
  "track": "rad_dsa",
  "meta": {
    "title": "Mechanical Thrombectomy in Acute Ischemic Stroke",
    "titleVi": "Lấy huyết khối cơ học trong đột quỵ thiếu máu não cấp",
    "level": "C1",
    "subspecialty": "neuro_dsa",
    "sourceBook": "Handbook of Neuroendovascular Intervention (Ch. 4)",
    "tags": ["stroke", "LVO", "stent-retriever", "TICI"],
    "estimatedMinutes": 45,
    "createdAt": "2026-11-25"
  },
  "vocabulary": [
    {
      "termKey": "mechanical_thrombectomy",
      "term": "mechanical thrombectomy",
      "ipa": "/məˈkæn.ɪ.kəl θrɒmˈbek.tə.mi/",
      "pos": "noun phrase",
      "wordRoot": "thromb- (cục máu đông) + -ectomy (phẫu thuật lấy bỏ)",
      "meaningVi": "Lấy huyết khối cơ học (qua đường nội mạch)",
      "noteVi": "Thủ thuật tiêu chuẩn vàng điều trị tắc mạch máu lớn (LVO) trong cửa sổ điều trị.",
      "exampleEn": "Mechanical thrombectomy significantly improves functional outcomes in patients with anterior circulation LVO.",
      "exampleVi": "Lấy huyết khối cơ học cải thiện rõ rệt kết cục chức năng ở bệnh nhân tắc mạch lớn tuần hoàn trước.",
      "audioUrl": ""
    }
  ],
  "grammar": {
    "topic": "Passive Voice in Procedural Reporting",
    "formula": "S (catheter / lesion / vessel) + be (was/were) + V3/ed (+ via/using + device)",
    "explanationVi": "Dùng câu bị động thì quá khứ đơn để mô tả khách quan từng bước can thiệp DSA trong tường trình thủ thuật.",
    "sourceSentence": {
      "en": "A 6F guiding catheter was navigated into the proximal internal carotid artery under roadmap guidance.",
      "vi": "Một ống thông dẫn đường 6F được luồn vào đoạn gần động mạch cảnh trong dưới hướng dẫn bản đồ mạch."
    },
    "quickExercises": [
      {
        "id": "g1",
        "type": "mcq",
        "prompt": "Complete recanalization (TICI 3) _____ after the first pass of the stent retriever.",
        "options": ["achieved", "was achieved", "has achieving", "were achieved"],
        "answer": "was achieved",
        "explanationVi": "Chủ ngữ số ít 'Complete recanalization' chịu tác động nên dùng bị động quá khứ đơn 'was achieved'."
      },
      {
        "id": "g2",
        "type": "fill",
        "prompt": "The microcatheter was _____ (advance) distal to the occlusive thrombus.",
        "answer": "advanced",
        "explanationVi": "Quá khứ phân từ của 'advance' là 'advanced'."
      },
      {
        "id": "g3",
        "type": "mcq",
        "prompt": "Choose the most accurate procedural sentence:",
        "options": [
          "We were navigated the wire into the M1 segment.",
          "The microwire was navigated into the M1 segment.",
          "The microwire navigated into the M1 segment by us."
        ],
        "answer": "The microwire was navigated into the M1 segment.",
        "explanationVi": "Văn phong tường trình y khoa ưu tiên bị động với dụng cụ làm chủ ngữ."
      }
    ]
  },
  "listening": {
    "title": "Cath-Lab Briefing: Approaching an M1 Occlusion",
    "audioUrl": "",
    "transcriptSentences": [
      {
        "id": "s1",
        "en": "Baseline CTA confirmed a proximal left M1 occlusion with good collateral flow.",
        "vi": "CTA nền xác nhận tắc đoạn gần M1 trái với tuần hoàn bàng hệ tốt."
      },
      {
        "id": "s2",
        "en": "We will use a combined aspiration and stent-retriever technique for first-pass reperfusion.",
        "vi": "Chúng ta sẽ dùng kỹ thuật kết hợp hút huyết khối và stent kéo để tái thông ngay lần đầu."
      }
    ],
    "gapFill": [
      {
        "id": "lg1",
        "sentence": "Baseline CTA confirmed a proximal left M1 _____ with good collateral flow.",
        "answer": "occlusion",
        "hint": "sự tắc mạch"
      }
    ],
    "mcq": [
      {
        "id": "lm1",
        "question": "What technique is planned for first-pass reperfusion?",
        "options": [
          "Balloon angioplasty alone",
          "Combined aspiration and stent-retriever",
          "Intra-arterial thrombolysis only",
          "Conservative medical management"
        ],
        "answer": "Combined aspiration and stent-retriever",
        "explanationVi": "Câu 2 nêu rõ dùng kỹ thuật kết hợp hút huyết khối và stent kéo."
      }
    ]
  },
  "reading": {
    "title": "Collateral Circulation and Infarct Core Assessment",
    "paragraphs": [
      {
        "id": "p1",
        "en": "Accurate assessment of the ischemic core and penumbra on CT perfusion guides patient selection in late time windows.",
        "vi": "Đánh giá chính xác lõi nhồi máu và vùng tranh tối tranh sáng trên CT tưới máu giúp chọn lựa bệnh nhân ở cửa sổ muộn."
      }
    ],
    "glossary": [
      {
        "termKey": "penumbra",
        "term": "penumbra",
        "ipa": "/pəˈnʌm.brə/",
        "wordRoot": "paene (gần như) + umbra (bóng tối)",
        "meaningVi": "Vùng tranh tối tranh sáng (mô não thiếu máu còn khả năng cứu vãn)"
      }
    ],
    "questions": {
      "mcq": [
        {
          "id": "r_mcq1",
          "question": "Which modality guides late-window patient selection?",
          "options": ["Plain X-ray", "CT perfusion", "Ultrasound", "Bone scan"],
          "answer": "CT perfusion",
          "evidenceParagraph": "p1",
          "explanationVi": "Đoạn 1 chỉ rõ CT perfusion dùng để đánh giá lõi nhồi máu và penumbra."
        }
      ],
      "tfng": [
        {
          "id": "r_tf1",
          "statement": "CT perfusion only evaluates hemorrhagic strokes.",
          "answer": "FALSE",
          "evidenceParagraph": "p1",
          "explanationVi": "Đoạn 1 nêu CT tưới máu đánh giá lõi thiếu máu (ischemic core) và penumbra."
        }
      ],
      "matching": [
        {
          "id": "r_m1",
          "prompt": "Match 'penumbra' to its clinical definition",
          "options": [
            "Irreversibly infarcted core",
            "Salvageable hypoperfused brain tissue",
            "Venous sinus thrombosis"
          ],
          "answer": "Salvageable hypoperfused brain tissue",
          "evidenceParagraph": "p1"
        }
      ],
      "completion": [
        {
          "id": "r_c1",
          "prompt": "CT perfusion helps assess both the ischemic core and the _____.",
          "answer": "penumbra",
          "evidenceParagraph": "p1"
        }
      ]
    }
  },
  "writing": {
    "paraphraseTasks": [
      {
        "id": "w1",
        "type": "translation",
        "prompt": "Tái thông hoàn toàn đạt mức TICI 3 sau lần kéo đầu tiên.",
        "targetKeywords": ["recanalization", "TICI 3", "first pass"],
        "modelAnswer": "Complete recanalization (TICI 3) was achieved after the first pass.",
        "noteVi": "Dùng bị động quá khứ đơn kết hợp thuật ngữ chuẩn TICI 3."
      }
    ],
    "essayTask": {
      "prompt": "Summarize the imaging criteria and endovascular strategy for an acute M1 occlusion presenting at 8 hours from onset.",
      "minWords": 150,
      "recommendedMinutes": 20,
      "models": {
        "band7": "Sample Band 7 response focusing on clear structure and accurate clinical terminology...",
        "band8": "Sample Band 8 response demonstrating cohesive academic/clinical phrasing and precise lexical range...",
        "band9": "Sample Band 9 response with natural, concise publication-grade radiological prose..."
      }
    }
  },
  "speaking": {
    "stages": [
      {
        "stage": 1,
        "title": "Quick Imaging Check",
        "prompts": [
          {
            "question": "How do you briefly describe a hyperdense MCA sign on non-contrast CT?",
            "sampleAnswer": "It appears as increased attenuation within the M1 segment, suggesting acute intraluminal thrombus."
          }
        ]
      },
      {
        "stage": 2,
        "title": "Case Presentation (2-minute Cue Card)",
        "prepSeconds": 60,
        "speakSeconds": 120,
        "cueCard": "Present a patient with acute right hemiparesis undergoing mechanical thrombectomy.",
        "bulletPoints": ["Baseline NIHSS & CT/CTA findings", "Device selection", "Final TICI grade & outcome"],
        "sampleAnswer": "This is a 68-year-old patient who presented three hours after onset..."
      },
      {
        "stage": 3,
        "title": "Clinical Discussion",
        "prompts": [
          {
            "question": "What factors influence the choice between contact aspiration and stent-retriever?",
            "sampleAnswer": "Vessel tortuosity, clot composition, and operator experience all play a major role..."
          }
        ]
      }
    ],
    "shadowing": {
      "simple": [
        {
          "id": "sh_s1",
          "en": "The angiogram shows / complete occlusion / of the left M1 segment.",
          "vi": "Hình chụp mạch cho thấy tắc hoàn toàn đoạn M1 trái."
        }
      ],
      "complex": [
        {
          "id": "sh_c1",
          "en": "Following deployment of the stent retriever / under continuous proximal aspiration, / full TICI 3 reperfusion was restored / without distal embolization.",
          "vi": "Sau khi bung stent kéo kết hợp hút liên tục đầu gần, tái tưới máu hoàn toàn TICI 3 đã đạt được mà không gây thuyên tắc xa."
        }
      ]
    }
  }
}
```

- **Quy ước giá trị trường `track` & `subspecialty`:**
  - `track`: `"ielts"` | `"rad_dsa"`
  - `meta.subspecialty` (áp dụng khi `track === "rad_dsa"`):
    - `"imaging"` → Chẩn đoán hình ảnh (CĐHA)
    - `"neuro_dsa"` → DSA Thần kinh
    - `"onco_dsa"` → DSA Ung bướu
    - `"peripheral_dsa"` → DSA Mạch máu ngoại biên
    - `"pain_dsa"` → DSA Giảm đau
  - `writing.paraphraseTasks`: Chuẩn mỗi bài chứa đủ **8 câu** (`w1`–`w8`).

---

### 5.3. Lược đồ trạng thái tiến độ & Sao lưu cục bộ (Track-Isolated State)

```json
{
  "backupVersion": 2,
  "exportedAt": "2026-11-25T17:45:00+07:00",
  "preferences": {
    "activeTrack": "rad_dsa",
    "theme": "system",
    "fontSize": "medium",
    "ttsRate": 1.0,
    "ttsVoice": "en-US",
    "reminder": {
      "enabled": true,
      "dailyGoalXp": 50,
      "time": "20:30"
    }
  },
  "tracks": {
    "ielts": {
      "placementLevel": "B2",
      "xp": 320,
      "treeStage": 2,
      "streakDays": 5,
      "weeklyActivity": ["2026-11-23", "2026-11-24", "2026-11-25"],
      "lessonProgress": {},
      "masteredBank": {},
      "srs": { "folders": [], "cards": [] },
      "notebooks": {}
    },
    "rad_dsa": {
      "xp": 480,
      "treeStage": 2,
      "streakDays": 5,
      "weeklyActivity": ["2026-11-23", "2026-11-24", "2026-11-25"],
      "lessonProgress": {
        "dsa-neuro-01-mechanical-thrombectomy": {
          "skillsCompleted": {
            "vocabulary": true,
            "grammar": true,
            "listening": false,
            "reading": false,
            "writing": false,
            "speaking": false
          },
          "stars": 2,
          "writingDraft": "",
          "lastOpenedAt": 1795601624000
        }
      },
      "masteredBank": {
        "mechanical_thrombectomy": {
          "term": "mechanical thrombectomy",
          "ipa": "/məˈkæn.ɪ.kəl θrɒmˈbek.tə.mi/",
          "wordRoot": "thromb- (cục máu đông) + -ectomy (phẫu thuật lấy bỏ)",
          "meaningVi": "Lấy huyết khối cơ học (qua đường nội mạch)",
          "subspecialty": "neuro_dsa",
          "sourceBook": "Handbook of Neuroendovascular Intervention (Ch. 4)",
          "lessonId": "dsa-neuro-01-mechanical-thrombectomy",
          "masteredAt": 1795601624000
        }
      },
      "srs": { "folders": [], "cards": [] },
      "notebooks": {
        "dsa-neuro-01-mechanical-thrombectomy": "Lưu ý phân biệt thang điểm mTICI 2b và 2c..."
      }
    }
  }
}
```

---

## 6. Các cơ chế tương tác trọng tâm & Triển khai GitHub Pages

### 6.1. Tìm kiếm & Lọc dữ liệu
- **Tìm kiếm thời gian thực phía Client (Client-side Live Search):** Không trễ mạng, hỗ trợ tìm không phân biệt hoa/thường và tìm theo cả tiếng Anh (`term`, `title`, `tags`) lẫn tiếng Việt (`titleVi`, `meaningVi`).
- **Bộ lọc đa tầng theo từng luồng:**
  - *Luồng 2 (CĐHA & DSA):* Lọc đồng thời theo `Phân môn` (5 phân môn) × `Tên sách nguồn` (tự sinh từ metadata các gói `.json` đang có) × `Trạng thái` (`Tất cả` / `Chưa học` / `Đang học` / `Đã xong`).
  - *Luồng 1 (IELTS & Foundation):* Lọc theo `Bậc CEFR / Band` × `Chủ đề học thuật` × `Trạng thái`.
  - *`/review` & `/mastered`:* Lọc theo thư mục/phân môn/sách và 5 chế độ sắp xếp (`Tới hạn trước`, `Mới thêm`, `A–Z`, `Khó nhất`, `Thứ tự tự xếp`).

### 6.2. Cơ chế Đối chiếu Chép chính tả & Nhận diện Phát âm
1. **Chép chính tả từng câu (`Sentence Dictation Diff`):**
   - Tách câu chuẩn và câu người học thành mảng từ đã chuẩn hóa (`lowercase`, loại dấu câu rìa từ).
   - Quét từ trái sang phải để tìm **chỉ số từ sai đầu tiên (`firstMismatchIndex`)**:
     - Các từ trước `firstMismatchIndex`: tô xanh lá (đạt).
     - Tại `firstMismatchIndex`: **làm nổi bật bằng viền/nền đỏ cam + biểu tượng cảnh báo** (phân biệt rõ gõ sai chính tả, thiếu từ, hoặc dư từ).
     - Người học có thể bấm `Gợi ý 1 chữ cái` hoặc nghe lại câu rồi sửa ngay tại chỗ cho tới khi đạt 100%.
2. **Kiểm tra phát âm (`Web Speech API — SpeechRecognition`):**
   - Dùng `SpeechRecognition` cục bộ trên trình duyệt (`continuous: false`, `interimResults: true`, `lang: "en-US"` / `"en-GB"`).
   - So sánh chuỗi transcript nhận diện được với câu mục tiêu bằng thuật toán căn chỉnh từ (LCS / token matching): tính `% độ khớp`, tô xanh từ khớp và đỏ từ chưa rõ.

### 6.3. Lưu tiến độ & Thuật toán SRS (SM-2)
- **Auto-save tức thì:** Mọi thao tác (làm bài tập, đánh dấu `Đã thuộc`, gõ bản nháp Writing, ghi `Sổ tay`, chấm SRS) đều ghi ngay vào bộ nhớ trình duyệt.
- **Lịch ôn SRS (SM-2) tách riêng theo luồng:** Thẻ mới tới hạn sau 1 phút; 4 mức đánh giá phím `1–4` (`Chưa nhớ · 10 phút`, `Khó · 1 ngày`, `Nhớ · 2 ngày`, `Dễ · 3 ngày`, sau đó nhân theo `easeFactor`). Đạt chuỗi nhớ liên tiếp có gợi ý chuyển sang `Mastered Bank`.

### 6.4. Nạp bài `.json` & Xuất/Nhập dữ liệu
- **Nạp gói bài học `.json` trực tiếp trên UI:**
  - Chọn 1 hoặc nhiều tệp `.json` (kéo thả hoặc chọn file) → kiểm tra tự động `schemaVersion === 2` và 6 khối kỹ năng → hiển thị bản xem trước (tên bài, luồng, phân môn, tên sách, số từ vựng/câu hỏi) → cho phép chỉnh nhanh `track` / `subspecialty` / `sourceBook` trước khi bấm `Lưu vào thư viện`.
  - Hỗ trợ kiểm tra trùng `id` (chọn `Ghi đè bản cũ` hoặc `Lưu thành bản mới`).
- **Xuất / Nhập Sao lưu & Bộ thẻ:**
  - `Xuất toàn bộ sao lưu (.json)`: Gồm tiến độ 2 luồng, `Mastered Bank`, thẻ SRS, Sổ tay, cài đặt (và tùy chọn kèm gói bài học tự nạp) để chuyển sang iPad/điện thoại chỉ với 1 tệp.
  - `Nhập / Xuất bộ thẻ SRS (.csv / .tsv / .json)` cho mục `/review`.

### 6.5. Định hướng công nghệ & Triển khai GitHub Pages
- **Stack đề xuất (100% Static Web App):** **Vite + React + TypeScript** (hoặc thuần HTML/CSS/JS module — khuyến nghị Vite + React + TypeScript để quản lý chặt chẽ lược đồ `schemaVersion: 2`, state 2 luồng tách biệt và 6 kỹ năng phức tạp mà vẫn biên dịch ra bộ tệp tĩnh gọn nhẹ).
- **Routing tương thích GitHub Pages:** Sử dụng **Hash Routing (`#/...`)** để mọi đường dẫn con không bao giờ bị lỗi `404` khi tải lại trang trên GitHub Pages, cấu hình `base: './'` để chạy ổn định dưới mọi tên repository.
- **Đóng gói & Triển khai:** Build ra thư mục `dist/` hoàn toàn tĩnh, đẩy trực tiếp lên nhánh `gh-pages` hoặc triển khai tự động qua **GitHub Actions** (`actions/deploy-pages`). Không cần khóa API, không cần cơ sở dữ liệu hay máy chủ trả phí.
