# Voice Input Troubleshooting Guide

## Vấn đề: Nút mic không hoạt động trên Vercel

### Các nguyên nhân phổ biến:

## 1. ✅ Kiểm tra trình duyệt hỗ trợ

Speech Recognition API chỉ hoạt động trên:
- ✅ **Chrome** (Desktop & Mobile)
- ✅ **Edge** (Desktop)
- ✅ **Safari** (iOS 14.5+, macOS)
- ❌ **Firefox** (Không hỗ trợ)
- ❌ **Opera** (Hỗ trợ hạn chế)

**Giải pháp:**
- Sử dụng Chrome hoặc Edge để test
- Trên mobile, sử dụng Chrome (Android) hoặc Safari (iOS)

## 2. 🔒 Kiểm tra HTTPS

Speech Recognition API **YÊU CẦU HTTPS** (hoặc localhost).

**Kiểm tra:**
- URL phải bắt đầu bằng `https://`
- Vercel tự động cung cấp HTTPS ✅

## 3. 🎤 Kiểm tra quyền truy cập microphone

### Cách kiểm tra:

**Chrome:**
1. Click vào icon 🔒 hoặc 🔓 bên trái URL
2. Xem "Microphone" - phải là "Allow" ✅
3. Nếu là "Block" ❌, click để thay đổi

**Safari:**
1. Safari > Settings > Websites > Microphone
2. Tìm domain của bạn và set thành "Allow"

### Lỗi phổ biến:

**"NotAllowedError" / "PermissionDeniedError"**
- User đã từ chối quyền microphone
- Giải pháp: Reset permissions trong browser settings

**"NotFoundError"**
- Không tìm thấy microphone
- Giải pháp: Kiểm tra microphone có kết nối không

**"NotSupportedError"**
- Browser không hỗ trợ
- Giải pháp: Đổi sang Chrome/Edge

## 4. 🔍 Debug trong Production (Vercel)

### Bước 1: Mở Developer Console
- Chrome: `F12` hoặc `Cmd+Option+I` (Mac)
- Xem tab **Console** để kiểm tra lỗi

### Bước 2: Kiểm tra các thông báo lỗi

Nếu thấy:
```
Speech recognition is not supported
```
→ Đổi browser hoặc update browser lên phiên bản mới nhất

Nếu thấy:
```
NotAllowedError: Permission denied
```
→ Click vào icon 🔒 bên trái URL và Allow microphone

### Bước 3: Test microphone
```javascript
// Paste vào Console để test microphone
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone works!'))
  .catch(err => console.error('❌ Microphone error:', err));
```

## 5. 🧪 Test cục bộ trước khi deploy

```bash
# Build và preview
npm run build
npm run preview
```

Sau đó test tại `http://localhost:4173`

**Lưu ý:** Localhost luôn được phép dùng microphone, nhưng production cần HTTPS.

## 6. 📱 Test trên Mobile

### iOS Safari:
1. Mở Settings > Safari > Camera & Microphone Access
2. Đảm bảo Safari có quyền truy cập microphone

### Android Chrome:
1. Settings > Site Settings > Microphone
2. Tìm site và set thành "Allow"

## 7. 🔧 Các fix phổ biến

### Fix 1: Clear browser cache
```
Chrome: Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
- Chọn "Cached images and files"
- Chọn "Cookies and site data"
- Clear
```

### Fix 2: Hard refresh
```
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
```

### Fix 3: Incognito mode test
```
Cmd+Shift+N (Mac) / Ctrl+Shift+N (Windows)
```
Nếu hoạt động trong incognito → Clear cache/cookies

## 8. 📊 Kiểm tra Vercel deployment

### Xem logs:
1. Vào Vercel Dashboard
2. Click vào project
3. Click vào deployment
4. Xem "Function Logs" và "Edge Logs"

### Kiểm tra build:
```bash
# Xem có lỗi build không
npm run build
```

## 9. ⚙️ Code đã được cải thiện

Code hiện tại đã có:
- ✅ Error handling cho tất cả cases
- ✅ Permission request tự động
- ✅ Alert messages cho user khi có lỗi
- ✅ Browser support check
- ✅ Fallback UI khi không support

## 10. 🆘 Vẫn không hoạt động?

### Checklist cuối cùng:
- [ ] Đang dùng Chrome/Edge/Safari
- [ ] URL bắt đầu bằng `https://`
- [ ] Đã Allow microphone permission
- [ ] Microphone đang hoạt động (test với app khác)
- [ ] Đã clear cache và hard refresh
- [ ] Đã xem console logs để check lỗi

### Debug thêm:
Thêm đoạn này vào `handleVoiceInput` để xem chi tiết:
```javascript
console.log('Browser supports:', browserSupportsSpeechRecognition);
console.log('Currently listening:', listening);
console.log('Selected language:', voiceLang);
```

### Contact support:
Nếu vẫn không được, gửi:
1. Screenshot của Console tab (F12)
2. Browser name và version
3. URL của site
4. Steps đã thử

