# 🧪 Test Login Flow - Quick Guide

## 🚀 Quick Test Steps

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Open Browser
```
http://localhost:5173
```

### Step 3: Test Login

#### Option A: Với Backend Running

1. **Mở page**: Sẽ tự động redirect đến `/login`
2. **Chọn role**: Student hoặc Teacher tab
3. **Nhập credentials**:
   ```
   Email: your_test_email@example.com
   Password: YourPass123!
   ```
4. **Click "Đăng nhập"**
5. **Mở F12 Console** - Xem logs:
   ```
   Login result: { success: true, user: {...} }
   ```
6. **Verify redirect**:
   - Teacher → `/teacher/dashboard`
   - Student → `/student/dashboard`

#### Option B: Backend Chưa Ready (Mock Test)

1. Mở **Console (F12)**
2. Paste đoạn code này:

**Test as Teacher:**
```javascript
// Mock teacher login
localStorage.setItem('auth_token', 'mock_teacher_token');
localStorage.setItem('auth-storage', JSON.stringify({
  state: {
    user: {
      id: 'teacher_1',
      name: 'Giáo Viên Test',
      email: 'teacher@test.com',
      role: 'teacher'
    },
    token: 'mock_teacher_token',
    isAuthenticated: true
  },
  version: 0
}));
window.location.href = '/teacher/dashboard';
```

**Test as Student:**
```javascript
// Mock student login
localStorage.setItem('auth_token', 'mock_student_token');
localStorage.setItem('auth-storage', JSON.stringify({
  state: {
    user: {
      id: 'student_1',
      name: 'Học Sinh Test',
      email: 'student@test.com',
      role: 'student'
    },
    token: 'mock_student_token',
    isAuthenticated: true
  },
  version: 0
}));
window.location.href = '/student/dashboard';
```

---

## ✅ Expected Results

### After Login Success:

1. **Message xuất hiện**: "Đăng nhập thành công!" (green notification)
2. **URL changes to**:
   - Teacher: `http://localhost:5173/teacher/dashboard`
   - Student: `http://localhost:5173/student/dashboard`
3. **Dashboard hiển thị**:
   - Sidebar với menu items
   - User name trong header
   - Statistics cards
   - Welcome message

### Console Logs (F12):
```javascript
Login result: {
  success: true,
  user: {
    id: "...",
    name: "...",
    email: "...",
    role: "teacher" // or "student"
  }
}
```

### LocalStorage After Login:
```javascript
// Check localStorage
localStorage.getItem('auth_token')        // Should have token
localStorage.getItem('auth-storage')      // Should have user data
```

---

## 🔍 Debugging Failed Login

### Problem 1: No redirect after login

**Check Console**:
```javascript
// Should see:
✓ Login result: {...}

// If you see error:
✗ Login error: [error message]
```

**Solutions**:
1. Check backend API response format
2. Verify token is in response
3. Check user.role is "teacher" or "student"

### Problem 2: Network Error

**Check**:
1. Backend server is running
2. API URL is correct: `https://edu-map-be.vercel.app/v1/api`
3. CORS is enabled on backend

**Test API**:
```bash
# Terminal - Test backend is alive
curl https://edu-map-be.vercel.app/v1/api/auth/login

# Should return 400 or 405 (not 404)
```

### Problem 3: 401 Unauthorized

**Cause**: Wrong credentials

**Solution**: 
- Check email/password
- Try registering new account first

---

## 🧪 Test All Auth Pages

### 1. Login Page ✓
- URL: `/login`
- Should: No scroll, fit in viewport
- Test: Both Student & Teacher tabs

### 2. Register Page ✓
- URL: `/register`
- Should: No scroll, password strength indicator
- Test: Create new account

### 3. Forgot Password ✓
- URL: `/forgot-password`
- Should: No scroll, send email
- Test: Enter email

### 4. Reset Password ✓
- URL: `/reset-password?token=xxx`
- Should: No scroll, strong password validation
- Test: Enter new password

---

## 📱 Test Responsive

### Desktop (>1024px)
```
✓ Left side illustration visible
✓ Right side form
✓ Card centered
✓ No scroll
```

### Tablet (768px - 1024px)
```
✓ Hide left illustration
✓ Full screen gradient
✓ Card centered
✓ No scroll
```

### Mobile (<576px)
```
✓ Compact layout
✓ Smaller fonts
✓ Reduced padding
✓ Should fit viewport
```

**Test command**: Press F12 → Device Toggle (Ctrl+Shift+M) → Select iPhone/iPad

---

## 🎯 Complete Test Checklist

### Before Testing:
- [ ] `npm run dev` is running
- [ ] Backend API is accessible (or using mock)
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible

### Login Flow:
- [ ] Can see login page
- [ ] Can switch Student/Teacher tabs
- [ ] Email validation works
- [ ] Password field works
- [ ] Submit button shows loading state
- [ ] Success message appears
- [ ] Redirect to correct dashboard
- [ ] User name shown in header
- [ ] Sidebar menu works

### Logout Flow:
- [ ] Click avatar dropdown
- [ ] Click "Đăng xuất"
- [ ] Redirect to login
- [ ] LocalStorage cleared

### UI/UX:
- [ ] All pages: No scroll needed
- [ ] Buttons clickable
- [ ] Forms validate properly
- [ ] Error messages shown
- [ ] Loading states visible
- [ ] Responsive on mobile

---

## 🚨 Common Issues & Quick Fixes

### Issue: "Token not found in response"
```javascript
// Backend response format might be wrong
// Check console log: "Login result: {...}"
// Should contain token field
```

**Fix**: Backend cần return `{ token: "...", data/user: {...} }`

### Issue: Stuck on login page
```javascript
// Clear everything
localStorage.clear();
location.reload();
```

### Issue: 404 on dashboard
```javascript
// Check route exists
console.log('Routes:', window.location.pathname);
// Should be /teacher/dashboard or /student/dashboard
```

---

## 💡 Pro Tips

### Tip 1: Quick Mock Login
Bookmark này trong browser:
```javascript
javascript:(function(){localStorage.setItem('auth_token','mock');localStorage.setItem('auth-storage',JSON.stringify({state:{user:{name:'Test',email:'test@test.com',role:'teacher'},token:'mock',isAuthenticated:true}}));location.href='/teacher/dashboard';})();
```

### Tip 2: Quick Logout
```javascript
javascript:(function(){localStorage.clear();location.href='/login';})();
```

### Tip 3: Toggle Role
```javascript
// In console
const switchRole = (role) => {
  const storage = JSON.parse(localStorage.getItem('auth-storage'));
  storage.state.user.role = role;
  localStorage.setItem('auth-storage', JSON.stringify(storage));
  location.reload();
};

// Usage:
switchRole('teacher');  // or
switchRole('student');
```

---

## 📞 Need Help?

1. **Check DEBUG.md** for detailed debugging
2. **Check Console** for error logs
3. **Check Network Tab** for API calls
4. **Try Mock Login** to isolate issue

---

**Status**: ✅ All fixes applied
- Login redirect: FIXED ✓
- UI no-scroll: FIXED ✓
- Multiple response formats: SUPPORTED ✓

**Ready to test!** 🚀

