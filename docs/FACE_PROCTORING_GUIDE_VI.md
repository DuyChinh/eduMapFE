# Hướng Dẫn Kỹ Thuật: Face Proctoring (Giám Sát Khuôn Mặt)
*Dành cho Web Developer (Chưa biết gì về AI)*

Chào bạn, tài liệu này được soạn riêng để giải thích toàn bộ cơ chế "Face Proctoring" bằng ngôn ngữ của dân làm Web, cắt bỏ các thuật ngữ hàn lâm khó hiểu.

---

## 1. Sự Khác Biệt Giữa Cách Cũ và Cách Mới

Để hiểu tại sao chúng ta làm như hiện tại, hãy so sánh với cách làm web cổ điển.

### Cách Cũ (Server-side AI) - Giống như "Form Submit truyền thống"
Hãy tưởng tượng bạn làm tính năng Validate Form (kiểm tra form).
*   **Cách hoạt động**: Người dùng nhập tên -> Bấm Submit -> Gửi về Server -> Server kiểm tra -> Trả về lỗi "Tên sai rồi".
*   **Áp dụng vào Face ID**:
    1.  Mỗi giây, trình duyệt chụp 30 tấm ảnh (frames).
    2.  Gửi 30 tấm ảnh đó lên Server qua API.
    3.  Server (Python/Facenet) chạy model nặng nề để soi từng ảnh.
    4.  Server trả về kết quả: "Đúng người" hoặc "Sai người".
*   **Vấn đề (Tại sao tồi tệ?)**:
    *   **Tốn băng thông**: Giống việc bạn upload video HD liên tục lên server. Máy học sinh sẽ lag tung chảo.
    *   **Tốn tiền Server**: Bạn cần thuê Server có GPU (Card màn hình xịn) đắt gấp 10 lần server thường.
    *   **Độ trễ (Latency)**: Ảnh gửi đi mất 1s, xử lý mất 0.5s. Nếu học sinh gian lận, 1.5s sau mới phát hiện thì đã muộn.

### Cách Mới (Client-side AI) - Giống như "JavaScript Client Validation"
*   **Cách hoạt động**: Bạn viết code JS để kiểm tra ngay khi người dùng gõ. Sai là báo lỗi ngay lập tức, không cần gửi gì về Server.
*   **Áp dụng vào Face ID của chúng ta**:
    1.  Trình duyệt tải một "bộ não tí hon" (AI Model) về máy học sinh **một lần duy nhất** lúc đầu.
    2.  "Bộ não" này chạy ngay trên Chrome/Edge của học sinh.
    3.  Nó soi camera và phát hiện gian lận ngay lập tức (mất 0.03 giây).
    4.  Chỉ khi nào **có biến** (vi phạm), nó mới gửi 1 request nhỏ xíu về Server để báo cáo.

---

## 2. Giải Mã Các Khái Niệm "Nguy Hiểm"

### a. AI Model là gì?
*   **Dân Web hiểu là**: Một file `.json` hoặc `.bin` chứa hàng triệu quy tắc (rules) `if-else` cực kỳ phức tạp được nén lại.
*   Thay vì bạn code tay: `if (màu_đỏ && có_hình_tròn) return "quả_táo"`, thì Model là tập hợp các tham số toán học để máy tự suy diễn ra đó là quả táo.
*   Trong dự án này, nó là file `face_landmarker.task` mà chúng ta tải về.

### b. CNN (Convolutional Neural Network) là gì?
*   **Tên tiếng Việt**: Mạng Nơ-ron Tích chập.
*   **Dân Web hiểu là**: Một cái **Bộ lọc (Filter)** nhiều lớp.
    *   Lớp 1: Quét ảnh tìm các đường thẳng, đường cong.
    *   Lớp 2: Ghép các đường đó lại thành hình thù (mắt, mũi).
    *   Lớp 3: Ghép mắt mũi thành khuôn mặt.
*   **Tại sao tối ưu?**: Thay vì quét từng điểm ảnh (pixel) một cách mù quáng, nó quét theo vùng. Giống như bạn nhìn một bức tranh, bạn nhìn tổng thể "đây là ngôi nhà" chứ không soi từng viên gạch.
*   **MobileNet**: Là phiên bản CNN "rút gọn" dành cho điện thoại/web. Nó hy sinh một chút xíu độ chính xác để đổi lấy tốc độ siêu nhanh.

### c. WebAssembly (WASM) là gì?
*   **Dân Web hiểu là**: "Động cơ phản lực" gắn vào trình duyệt.
*   Bình thường, JavaScript chạy khá chậm với các tác vụ tính toán nặng (như xử lý ảnh).
*   **WASM** là code C++ hoặc Rust đã được biên dịch thành dạng nhị phân (binary) để trình duyệt chạy được. Tốc độ của nó gần bằng phần mềm cài trên máy tính (Native App).
*   **Trong code**: `CameraMonitor.jsx` gọi `FilesetResolver` tải file wasm về để chạy cái Model AI kia. Không có WASM, JS sẽ đơ máy ngay lập tức.

### d. Landmarks (478 điểm) là gì?
*   Hãy tưởng tượng bạn trùm một cái **lưới đánh cá** lên mặt học sinh.
*   Cái lưới này có 478 nút thắt.
    *   Nút số 1 luôn dính vào chóp mũi.
    *   Nút số 33 luôn dính vào đuôi mắt trái.
*   Dù học sinh quay ngang, ngửa cổ, cái lưới này vẫn bám dính theo mặt.
*   **Tác dụng**: Giúp ta biết chính xác toạ độ mắt, mũi, miệng đang ở đâu trên màn hình (tọa độ X, Y, Z).

---

## 3. Luồng Hoạt Động Cụ Thể Trong Code (EduMap)

### Bước 1: Khởi động (Setup)
1.  Người dùng vào trang thi -> `CameraMonitor` mount.
2.  Code gọi `FilesetResolver` -> Tải "động cơ" WASM.
3.  Code gọi `FaceLandmarker.createFromOptions` -> Tải "bộ não" Model AI.
4.  Cấu hình `delegate: "GPU"` -> Ra lệnh cho trình duyệt: *"Ê, dùng Card màn hình để tính nhé, đừng dùng CPU kẻo lag chuột của user"*.

### Bước 2: Xác Minh Ban Đầu (Reference)
1.  Học sinh bấm "Xác minh khuôn mặt".
2.  AI quét thấy mặt -> Trả về 478 điểm landmarks.
3.  **Hàm `getFaceSignature` (Chữ ký khuôn mặt)**:
    *   Thay vì so sánh từng điểm ảnh (dễ sai do ánh sáng), ta làm toán hình học:
    *   Tính tỷ lệ: `Khoảng cách mũi-cằm` chia cho `Khoảng cách 2 mắt`.
    *   Tại sao? Vì dù bạn ngồi xa hay gần, tỷ lệ này **không đổi**.
    *   Lưu bộ tỷ lệ này vào biến `referenceLandmarks` (trong RAM).
4.  **Chụp ảnh bằng chứng**:
    *   Tạo một thẻ `<canvas>` ẩn (như tờ giấy vẽ).
    *   Vẽ lại hình ảnh từ Video lên Canvas.
    *   Dùng `canvas.toDataURL()` -> Biến bức tranh thành chuỗi ký tự (Base64) để gửi lên Server lưu làm bằng chứng.

### Bước 3: Giám Sát Liên Tục (Loop)
1.  Hàm `detectLoop` chạy liên tục (như vòng lặp `setInterval` nhưng xịn hơn, theo nhịp màn hình).
2.  Mỗi lần chạy, nó lấy hình ảnh hiện tại từ Webcam -> Quăng vào AI.
3.  AI trả về 478 điểm mới.
4.  Nếu không có mặt (`faces.length === 0`) -> Báo lỗi "Mất tích".
5.  Nếu có mặt -> Tính lạ "Chữ ký" (Tỷ lệ mũi/mắt, rộng/cao) của mặt hiện tại.
6.  **So sánh**: Lấy Chữ Ký Hiện Tại trừ đi Chữ Ký Gốc.
    *   Nếu sai số < 12% (`0.12`): OK, chính chủ.
    *   Nếu sai số > 12%: **BÁO ĐỘNG!** (Người lạ hoặc biến hình).

---

## 4. Tổng Kết
Bạn đã xây dựng một tính năng AI rất hiện đại mà không cần Server khủng. Thông minh ở chỗ:
1.  **Đẩy việc khó cho máy user** (Client-side).
2.  **Dùng WASM + GPU** để máy user không bị lag.
3.  **Dùng Toán Hình Học (Tỷ lệ)** thay vì Deep Learning để so sánh, giúp thuật toán cực nhẹ mà vẫn chính xác.

Hy vọng tài liệu này giúp bạn tự tin "chém gió" về công nghệ này! ^^
