# Frontend Update: Async PDF Processing trong Chat

## ✅ Đã hoàn thành

### 1. Update Chat API (`src/api/chatApi.js`)
Thêm endpoint mới:
```javascript
checkMessageStatus: (messageId) => {
    const url = `/ai/message/${messageId}/status`;
    return axiosClient.get(url);
}
```

### 2. Update ChatWidget Component (`src/components/ChatWidget/ChatWidget.jsx`)

#### a) Thêm function polling
```javascript
const pollMessageStatus = useCallback(async (messageId, botMessageTempId) => {
    // Poll mỗi 2 giây, tối đa 60 lần (2 phút)
    // Khi completed: update message với nội dung đầy đủ
    // Khi error: hiển thị thông báo lỗi
    // Timeout: hiển thị thông báo timeout
}, [t]);
```

#### b) Sửa handleSendMessage
- Detect response có `status: 'pending'` và `messageId`
- Nếu có: bắt đầu poll
- Hiển thị message với indicator "Đang xử lý..."
- Khi poll xong: update message với kết quả đầy đủ

#### c) Sửa handleSessionClick
- Khi load history, check messages có `status: 'pending'`
- Tự động bắt đầu poll cho các pending messages
- User reload lại trang vẫn thấy được kết quả

#### d) Visual Indicator
- Thêm spinner + text "Đang xử lý..." cho pending messages
- User biết được message đang được xử lý

### 3. Update Translations
Thêm keys mới vào 3 file ngôn ngữ:
- `chat.processing`: "Đang xử lý..." / "Processing..." / "処理中..."
- `chat.timeout`: "Quá thời gian chờ..." / "Request timeout..." / "タイムアウト..."

**Files đã update:**
- ✅ `src/i18n/locales/vi.json`
- ✅ `src/i18n/locales/en.json`
- ✅ `src/i18n/locales/jp.json`

## 🎯 Cách hoạt động

### Flow 1: Upload PDF mới
```
1. User upload PDF + gửi message
   ↓
2. Backend trả về ngay:
   {
     status: "pending",
     messageId: "abc123",
     response: "⏳ Đang xử lý file PDF..."
   }
   ↓
3. Frontend hiển thị message với spinner "Đang xử lý..."
   ↓
4. Frontend bắt đầu poll GET /ai/message/abc123/status mỗi 2 giây
   ↓
5. Khi backend xử lý xong (status = "completed"):
   - Frontend update message với nội dung đầy đủ
   - Tắt loading indicator
   - User thấy kết quả trích xuất đầy đủ
```

### Flow 2: Reload lại trang khi đang xử lý
```
1. User reload trang trong lúc PDF đang được xử lý
   ↓
2. Frontend fetch history của session
   ↓
3. Phát hiện message có status = "pending"
   ↓
4. Tự động bắt đầu poll lại
   ↓
5. Khi completed: update UI
```

## 🧪 Testing

### Test Case 1: Upload PDF dài
1. Mở chat widget, expand
2. Upload file PDF dài (>30 câu)
3. Gửi message: "Trích xuất tất cả câu hỏi"
4. **Expected:**
   - Response trả về ngay lập tức (không timeout)
   - Hiển thị "⏳ Đang xử lý file PDF của bạn..."
   - Có spinner "Đang xử lý..." ở dưới message
   - Sau 20-60 giây: message tự động update với kết quả đầy đủ
   - Loading indicator biến mất

### Test Case 2: Reload trong lúc processing
1. Upload PDF như test case 1
2. Trong lúc đang "Đang xử lý...", reload lại trang
3. Mở lại session đó
4. **Expected:**
   - Thấy message "Đang xử lý..." với spinner
   - Poll tiếp tục tự động
   - Sau khi xong: message update với kết quả

### Test Case 3: Upload ảnh/text thông thường
1. Gửi message text hoặc upload ảnh (không phải PDF)
2. **Expected:**
   - Xử lý bình thường như cũ (synchronous)
   - Không có pending status
   - Response trả về ngay

### Test Case 4: Timeout
1. Giả lập backend bị stuck (không response)
2. Sau 2 phút (60 attempts × 2s)
3. **Expected:**
   - Hiển thị message timeout
   - Hướng dẫn user reload trang

## 📝 Technical Details

### Polling Configuration
```javascript
const maxAttempts = 60;        // Tối đa 60 lần
const pollInterval = 2000;     // Mỗi 2 giây
// => Timeout sau 2 phút
```

### Message States
```javascript
{
  id: "msg123",
  text: "Message content",
  sender: "bot",
  isPending: true,      // ← New field
  isError: false,
  attachments: []
}
```

### Backend Response Format
```javascript
// Pending response
{
  ok: true,
  data: {
    response: "⏳ Đang xử lý file PDF...",
    sessionId: "session123",
    sessionTitle: "Chat title",
    status: "pending",        // ← Key field
    messageId: "msg123"       // ← For polling
  }
}

// Completed response (khi poll)
{
  ok: true,
  data: {
    messageId: "msg123",
    status: "completed",      // ← Changed
    message: "Full extracted content...",
    isError: false
  }
}
```

## 🔧 Maintenance

### Nếu cần tăng timeout
Sửa trong `ChatWidget.jsx`:
```javascript
const maxAttempts = 120; // Tăng lên 120 = 4 phút
```

### Nếu cần giảm polling interval
```javascript
const pollInterval = setInterval(async () => {
  // ...
}, 1000); // Giảm xuống 1 giây
```

### Nếu muốn implement WebSocket thay vì polling
- Tạo WebSocket connection khi chat widget mở
- Backend emit event khi message completed
- Frontend listen event và update UI
- Hiệu quả hơn polling, nhưng phức tạp hơn

## 📊 Performance

### Polling Overhead
- 1 request mỗi 2 giây
- Response size: ~200 bytes
- Bandwidth: 100 bytes/s (negligible)
- Tự động dừng khi completed/error/timeout

### User Experience
- ✅ Không còn timeout error
- ✅ Visual feedback rõ ràng
- ✅ Tự động update, không cần manual refresh
- ✅ Works với reload/refresh

## 🚀 Future Improvements

1. **WebSocket**: Replace polling với real-time push
2. **Progress bar**: Hiển thị % tiến trình xử lý
3. **Cancel button**: Cho phép user hủy processing
4. **Notification**: Desktop notification khi xử lý xong
5. **Retry**: Auto retry khi poll failed

---

**Updated by:** Tech Lead Senior Developer  
**Date:** 11/12/2025  
**Version:** 1.0

