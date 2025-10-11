# 🔍 Debug Guide - Azota Mini

## 🐛 Common Issues & Solutions

### Issue 1: Login không redirect đến Dashboard

#### ✅ Đã Fix!

**Vấn đề**: Backend API có thể trả về response format khác với expected.

**Solution**: Updated `authStore.js` để handle nhiều format response:
- Format 1: `{ token, data: { user } }`
- Format 2: `{ token, user }`
- Format 3: `{ success, token, data }`

#### 🔍 Debug Steps:

1. **Mở Browser Console** (F12)

2. **Login và xem console logs**:
```javascript
// Bạn sẽ thấy:
Login result: { success: true, user: {...} }
```

3. **Kiểm tra user object**:
```javascript
// User object phải có:
{
  name: "Tên người dùng",
  email: "email@example.com",
  role: "teacher" hoặc "student",
  id: "user_id"
}
```

4. **Nếu không redirect**:
- Check console có error không
- Verify `user.role` có đúng giá trị không ("teacher" hoặc "student")
- Check localStorage có token không: `localStorage.getItem('auth_token')`

#### 📋 Test Backend Response:

Bạn có thể test API response trực tiếp trong browser console:

```javascript
// Test login API
fetch('https://edu-map-be.vercel.app/v1/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!'
  })
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('Error:', err));
```

---

### Issue 2: UI Auth Pages cần scroll

#### ✅ Đã Fix!

**Changes**:
- ✅ Container: `height: 100vh` (thay vì `min-height`)
- ✅ Overflow: `overflow: hidden` trên container
- ✅ Overflow-y: `auto` trên auth-right
- ✅ Reduced padding & margins
- ✅ Smaller font sizes
- ✅ Compact form items (16px margin)

#### 📐 Measurements:
- Auth card: max-width 450px (giảm từ 480px)
- Card padding: 30px (giảm từ 40px)
- Logo: 50px (giảm từ 60px)
- Title: 24px (giảm từ 28px)
- Buttons: 44px height (giảm từ 48px)

#### ✅ Kết quả:
- Login page: NO SCROLL ✓
- Register page: NO SCROLL ✓ (với compact spacing)
- Forgot/Reset: NO SCROLL ✓

---

## 🛠️ Debug Tools

### 1. Check Auth State

Mở Browser Console và chạy:

```javascript
// Check Zustand store
const authState = JSON.parse(
  localStorage.getItem('auth-storage')
);
console.log('Auth State:', authState);
```

### 2. Check Token

```javascript
const token = localStorage.getItem('auth_token');
console.log('Token:', token);

// Decode JWT (if you want to see payload)
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token Payload:', payload);
}
```

### 3. Clear Auth State

Nếu bị stuck, clear state và login lại:

```javascript
localStorage.clear();
window.location.reload();
```

### 4. Test API từ Console

```javascript
// Test với token
const token = localStorage.getItem('auth_token');

fetch('https://edu-map-be.vercel.app/v1/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Profile:', data));
```

---

## 🔍 Expected API Responses

### Login Response (Backend should return):

**Option 1** (Preferred):
```json
{
  "success": true,
  "token": "jwt_token_here",
  "data": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "teacher"
  }
}
```

**Option 2**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**Option 3**:
```json
{
  "token": "jwt_token_here",
  "data": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**Frontend sẽ handle TẤT CẢ 3 formats trên!**

---

## ⚠️ Common Errors

### Error 1: "Token not found in response"

**Cause**: Backend không trả về token trong response

**Solution**: 
- Check backend API có return token không
- Verify API endpoint đúng chưa
- Check network tab trong DevTools

### Error 2: Network Error

**Cause**: 
- Backend server down
- CORS issues
- Wrong API URL

**Solution**:
```javascript
// Check API URL
console.log('API Base:', import.meta.env.VITE_API_BASE_URL);

// Test connection
fetch('https://edu-map-be.vercel.app/v1/api/auth/login')
  .then(r => console.log('Server is up!'))
  .catch(e => console.error('Server error:', e));
```

### Error 3: 401 Unauthorized

**Cause**: Token expired hoặc invalid

**Solution**:
- Clear localStorage: `localStorage.clear()`
- Login lại
- Check token expiry

### Error 4: Role not defined

**Cause**: Backend không trả về role trong user object

**Solution**:
- Verify backend trả về `role` field
- Default fallback đã được thêm vào frontend

---

## 📱 Mobile/Responsive Testing

### Test Breakpoints:

1. **Desktop** (>1024px):
   - Should show left illustration
   - Card centered on right side
   - No scroll needed

2. **Tablet** (768px - 1024px):
   - Hide left illustration
   - Card centered
   - Gradient background full screen
   - No scroll needed

3. **Mobile** (<576px):
   - Compact layout
   - Smaller fonts
   - Reduced padding
   - Should fit in viewport

### Test Commands:

```bash
# Test on different screen sizes
# Option 1: Browser DevTools
# - Press F12
# - Click device toggle (Ctrl+Shift+M)
# - Select different devices

# Option 2: Resize browser window
# Test at: 375px, 768px, 1024px, 1440px
```

---

## 🚀 Performance Check

### Check Bundle Size:

```bash
npm run build

# Check output:
# dist/assets/index-xxx.js should be ~900KB (before gzip)
# After gzip: ~290KB
```

### Check Network:

1. Open DevTools → Network tab
2. Login
3. Check:
   - Login API call time
   - Response size
   - Any failed requests

---

## 📝 Quick Fixes

### Fix 1: Clear Everything

```bash
# Terminal
rm -rf node_modules package-lock.json
npm install
npm run dev
```

```javascript
// Browser Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix 2: Force Logout

```javascript
// Add to browser console
localStorage.removeItem('auth_token');
localStorage.removeItem('auth-storage');
window.location.href = '/login';
```

### Fix 3: Test Mock Login

Nếu backend chưa ready, test UI bằng mock:

```javascript
// Browser Console
const mockLogin = () => {
  localStorage.setItem('auth_token', 'mock_token_123');
  localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher'
      },
      token: 'mock_token_123',
      isAuthenticated: true
    }
  }));
  window.location.href = '/teacher/dashboard';
};

mockLogin();
```

---

## ✅ Verification Checklist

### After Login:

- [ ] Console shows "Login result: {...}"
- [ ] localStorage có 'auth_token'
- [ ] localStorage có 'auth-storage'
- [ ] URL redirect đến dashboard
- [ ] Dashboard hiển thị user name
- [ ] Sidebar menu works
- [ ] Logout button works

### UI Checklist:

- [ ] Login page: No scroll
- [ ] Register page: No scroll
- [ ] Forgot password: No scroll
- [ ] Reset password: No scroll
- [ ] Responsive trên mobile
- [ ] All buttons clickable
- [ ] Forms validate correctly

---

## 🎯 Next Steps if Still Issues

1. **Take Screenshot** of:
   - Console errors
   - Network tab
   - Full screen of issue

2. **Check**:
   - Node version: `node -v` (should be >=16)
   - npm version: `npm -v` (should be >=8)
   - Backend status
   - CORS settings

3. **Share**:
   - Console logs
   - API response format
   - Error messages

---

**Last Updated**: After fixing login redirect & UI scroll issues

**Status**: ✅ Both issues FIXED

