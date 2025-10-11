# 🎉 Chào mừng đến với Azota Mini Frontend!

## 🚀 Bắt Đầu Ngay

### 1️⃣ Chạy Development Server

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

### 2️⃣ Test Application

#### Trang Login
1. Mở **http://localhost:5173**
2. Bạn sẽ được redirect đến trang Login
3. Chọn role: **Student** hoặc **Teacher**

#### Test Authentication
**Với Backend đang chạy:**
```
Teacher Account:
Email: teacher@test.com
Password: Teacher123!

Student Account:
Email: student@test.com  
Password: Student123!
```

**Nếu chưa có account:**
- Click "Đăng ký ngay"
- Điền thông tin (password phải theo quy tắc)
- Sau khi đăng ký thành công, quay lại login

### 3️⃣ Explore Features

#### 👨‍🏫 Sau khi login với Teacher:
- ✅ Xem Teacher Dashboard với statistics
- ✅ Click sidebar: Ngân hàng câu hỏi, Quản lý đề thi, Quản lý lớp
- ✅ Test các quick actions buttons
- ✅ Click avatar dropdown để xem menu

#### 👨‍🎓 Sau khi login với Student:
- ✅ Xem Student Dashboard
- ✅ Click "Tham gia lớp học"
- ✅ Nhập mã lớp (nếu có từ backend)
- ✅ Xem "Kết quả thi" page
- ✅ Test responsive: resize browser window

## 📚 Tài Liệu

### Đọc Theo Thứ Tự:
1. **[README.md](./README.md)** - Tổng quan project
2. **[QUICKSTART.md](./QUICKSTART.md)** - Hướng dẫn nhanh
3. **[STRUCTURE.md](./STRUCTURE.md)** - Kiến trúc chi tiết
4. **[API.md](./API.md)** - API documentation
5. **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Tổng kết project

## 🎯 Các Tính Năng Đã Hoàn Thành

### ✅ Authentication System
- [x] Login với email/password
- [x] Register với password validation
- [x] Forgot password flow
- [x] Reset password
- [x] Role-based routing (Teacher/Student)
- [x] Protected routes
- [x] Auto logout on 401

### ✅ Teacher Features
- [x] Dashboard với statistics
- [x] Quick actions cards
- [x] Sidebar navigation
- [x] Questions page (UI)
- [x] Exams page (UI)
- [x] Classes page (UI)

### ✅ Student Features
- [x] Dashboard với assignments overview
- [x] Join class modal (với API integration)
- [x] Classes page
- [x] Results page (UI)
- [x] Sidebar navigation

### ✅ UI/UX
- [x] Modern, beautiful design
- [x] Responsive (mobile, tablet, desktop)
- [x] Loading states
- [x] Error handling
- [x] Success messages
- [x] Form validations

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🎨 UI Highlights

### Design System
- **Primary Color**: Purple gradient (#667eea → #764ba2)
- **Font**: Inter font family
- **Components**: Ant Design
- **Icons**: @ant-design/icons

### Responsive Breakpoints
- **Mobile**: < 576px
- **Tablet**: 576px - 768px  
- **Desktop**: > 768px

## 📁 Project Structure

```
src/
├── api/              # API services (axios, authService, etc.)
├── components/       # Reusable components
├── pages/           # Route pages
│   ├── auth/        # Login, Register, etc.
│   ├── teacher/     # Teacher pages
│   └── student/     # Student pages
├── layouts/         # Layout components
├── store/           # State management (Zustand)
├── utils/           # Utility functions
├── constants/       # App constants
└── App.jsx         # Main app with routing
```

## 🔌 API Integration

### Base URL
```javascript
https://edu-map-be.vercel.app/v1/api
```

### Sử dụng trong Component
```javascript
import authService from '../api/authService';

// Login
const result = await authService.login({ email, password });

// Register
await authService.register({ name, email, password, role });
```

### Tất cả các API calls đều:
- ✅ Auto add Authorization header
- ✅ Handle errors globally
- ✅ Show loading states
- ✅ Display user-friendly messages

## 🐛 Troubleshooting

### Port 5173 đã được sử dụng?
```bash
# Kill process
lsof -ti:5173 | xargs kill -9
```

### Dependencies lỗi?
```bash
rm -rf node_modules package-lock.json
npm install
```

### Không thấy styles?
Đảm bảo `main.jsx` có import:
```javascript
import 'antd/dist/reset.css'
```

### Build error?
```bash
npm run lint  # Check linting errors
```

## 💡 Tips for Development

### 1. Component Development
- Tạo component trong folder phù hợp
- Import Ant Design components khi cần
- Sử dụng PropTypes cho validation
- Keep components small và focused

### 2. API Integration
- Luôn dùng service layer (không gọi axios trực tiếp)
- Handle loading và error states
- Show meaningful messages cho users
- Use try-catch blocks

### 3. State Management
- Global state → Zustand store
- Component state → useState
- Form state → Ant Design Form

### 4. Styling
- Ưu tiên dùng Ant Design components
- Custom CSS khi cần thiết
- Maintain consistent spacing
- Always test responsive

## 🎓 Learning Path

### Beginner
1. Xem cách Login/Register hoạt động
2. Hiểu cách routing works (App.jsx)
3. Tìm hiểu về Protected Routes
4. Xem cách API service được sử dụng

### Intermediate  
1. Tạo component mới
2. Thêm API service mới
3. Integrate với backend
4. Add new routes

### Advanced
1. Optimize performance
2. Add advanced features
3. Implement testing
4. Refactor for scalability

## 🚧 Tiếp Theo

### Cần Backend APIs cho:
- [ ] Question CRUD
- [ ] Exam CRUD  
- [ ] Class CRUD
- [ ] Assignment management
- [ ] Submission handling

### Frontend Tasks:
- [ ] Question builder UI
- [ ] Exam builder UI
- [ ] Exam taking interface
- [ ] Real-time monitoring
- [ ] Analytics dashboard

## 📞 Support

Nếu gặp vấn đề:
1. Đọc documentation files
2. Check console errors
3. Review code examples
4. Ask team members

## 🎉 Ready to Code!

Bạn đã sẵn sàng! Bắt đầu với:
```bash
npm run dev
```

Và explore ứng dụng tại **http://localhost:5173**

---

**Happy Coding! 🚀**

Made with ❤️ by Azota Mini Team

