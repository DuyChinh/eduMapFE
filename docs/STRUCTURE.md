# 📂 Cấu Trúc Project - Azota Mini Frontend

## 🏗️ Tổng Quan Kiến Trúc

Project được xây dựng theo kiến trúc **Feature-based** với phân tách rõ ràng giữa các layers:
- **Presentation Layer**: Components, Pages, Layouts
- **Business Logic Layer**: Store (Zustand), Utils
- **Data Layer**: API Services (Axios)

## 📁 Chi Tiết Cấu Trúc Thư Mục

```
EduMapFE/
│
├── public/                          # Static assets
│   ├── logo.png                    # Logo của app
│   └── vite.svg                    # Vite icon
│
├── src/
│   │
│   ├── api/                        # 🔌 API Service Layer
│   │   ├── axios.js               # Axios instance với interceptors
│   │   │                          # - Auto add token vào header
│   │   │                          # - Global error handling
│   │   │                          # - Auto redirect khi 401
│   │   │
│   │   ├── authService.js         # Authentication APIs
│   │   │                          # - login()
│   │   │                          # - register()
│   │   │                          # - forgotPassword()
│   │   │                          # - resetPassword()
│   │   │                          # - loginWithGoogle()
│   │   │
│   │   ├── userService.js         # User Management APIs
│   │   │                          # - getProfile()
│   │   │                          # - getUserById()
│   │   │                          # - updateProfile()
│   │   │                          # - updateRole()
│   │   │                          # - deleteAccount()
│   │   │
│   │   └── classService.js        # Class Management APIs
│   │                              # - joinClass()
│   │                              # TODO: createClass(), getClasses(), etc.
│   │
│   ├── components/                # 🧩 React Components
│   │   │
│   │   ├── auth/                  # Auth-specific components
│   │   │                          # (Có thể thêm: SocialLogin, OAuthCallback, etc.)
│   │   │
│   │   ├── common/                # Shared/Common components
│   │   │   └── ProtectedRoute.jsx # Route guard với role-based access
│   │   │                          # - Kiểm tra authentication
│   │   │                          # - Kiểm tra authorization (roles)
│   │   │                          # - Auto redirect
│   │   │
│   │   ├── teacher/               # Teacher-specific components
│   │   │                          # TODO: QuestionForm, ExamBuilder, etc.
│   │   │
│   │   └── student/               # Student-specific components
│   │                              # TODO: ExamTaker, ResultCard, etc.
│   │
│   ├── pages/                     # 📄 Page Components (Route components)
│   │   │
│   │   ├── auth/                  # Authentication pages
│   │   │   ├── Login.jsx         # Login page với role tabs
│   │   │   ├── Register.jsx      # Register page với password strength
│   │   │   ├── ForgotPassword.jsx # Request password reset
│   │   │   ├── ResetPassword.jsx # Reset password với token
│   │   │   └── AuthPages.css     # Shared styles cho auth pages
│   │   │
│   │   ├── teacher/               # Teacher pages
│   │   │   ├── TeacherDashboard.jsx  # Dashboard với statistics
│   │   │   ├── Questions.jsx         # Quản lý câu hỏi
│   │   │   ├── Exams.jsx            # Quản lý đề thi
│   │   │   ├── Classes.jsx          # Quản lý lớp học
│   │   │   └── TeacherPages.css     # Shared styles
│   │   │
│   │   └── student/               # Student pages
│   │       ├── StudentDashboard.jsx  # Dashboard với assignments
│   │       ├── Classes.jsx          # Lớp học & tham gia lớp
│   │       ├── Results.jsx          # Xem kết quả thi
│   │       └── StudentPages.css     # Shared styles
│   │
│   ├── layouts/                   # 🎨 Layout Components
│   │   ├── TeacherLayout.jsx     # Layout cho teacher (sidebar + header)
│   │   ├── StudentLayout.jsx     # Layout cho student (sidebar + header)
│   │   └── DashboardLayout.css   # Shared dashboard styles
│   │
│   ├── store/                     # 📦 State Management (Zustand)
│   │   └── authStore.js          # Authentication state
│   │                             # - user, token, isAuthenticated
│   │                             # - login(), register(), logout()
│   │                             # - fetchProfile(), updateProfile()
│   │                             # - Persist to localStorage
│   │
│   ├── utils/                     # 🛠️ Utility Functions
│   │   └── passwordValidator.js  # Password validation utilities
│   │                             # - validatePassword()
│   │                             # - getPasswordStrength()
│   │
│   ├── constants/                 # 📋 Constants & Configs
│   │   └── config.js             # App-wide constants
│   │                             # - API_BASE_URL
│   │                             # - ROUTES
│   │                             # - STORAGE_KEYS
│   │                             # - USER_ROLES
│   │
│   ├── hooks/                     # 🎣 Custom React Hooks
│   │                             # TODO: useAuth, useDebounce, etc.
│   │
│   ├── App.jsx                    # 🎯 Main App Component
│   │                             # - Router setup
│   │                             # - Route definitions
│   │                             # - Protected routes
│   │                             # - Ant Design ConfigProvider
│   │
│   ├── main.jsx                   # 🚀 Entry Point
│   │                             # - React DOM rendering
│   │                             # - Import global styles
│   │
│   └── index.css                  # 🎨 Global Styles
│                                  # - Reset styles
│                                  # - Scrollbar styles
│                                  # - Utility classes
│
├── .gitignore                     # Git ignore rules
├── eslint.config.js               # ESLint configuration
├── index.html                     # HTML template
├── package.json                   # Dependencies & scripts
├── vite.config.js                # Vite configuration
├── README.md                      # Project documentation
├── STRUCTURE.md                   # This file
└── API.md                         # API documentation
```

## 🔄 Data Flow

### Authentication Flow
```
1. User → Login Page
2. Login Page → authService.login()
3. authService → Backend API
4. Backend → Return { token, user }
5. authStore → Save to state & localStorage
6. App → Redirect to Dashboard (based on role)
```

### Protected Route Flow
```
1. User navigate to protected route
2. ProtectedRoute component check isAuthenticated
3. If not authenticated → Redirect to Login
4. If authenticated but wrong role → Redirect to correct dashboard
5. If authorized → Render children components
```

## 🎨 Styling Strategy

### Ant Design
- Primary UI components library
- Customized theme trong `App.jsx`
- Primary color: `#667eea` (Purple gradient)

### CSS Modules/Files
- `AuthPages.css`: Auth-related pages
- `TeacherPages.css`: Teacher pages
- `StudentPages.css`: Student pages
- `DashboardLayout.css`: Dashboard layouts
- `index.css`: Global styles & utilities

### Responsive Design
- Mobile-first approach
- Breakpoints: 576px, 768px, 1024px
- All layouts responsive

## 🔐 Security Practices

1. **Token Management**
   - Stored in localStorage
   - Auto-attached to requests via interceptor
   - Auto-cleared on 401

2. **Route Protection**
   - ProtectedRoute component
   - Role-based access control
   - Redirect unauthorized users

3. **Password Security**
   - Client-side validation
   - Strength indicator
   - Secure requirements enforced

## 📝 Naming Conventions

### Files
- **Components**: PascalCase (`TeacherLayout.jsx`)
- **Utils/Services**: camelCase (`authService.js`)
- **Constants**: camelCase (`config.js`)
- **Styles**: kebab-case or match component (`AuthPages.css`)

### Variables
- **React Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS Classes**: kebab-case

### API Functions
- **Pattern**: `verbNoun()` 
- **Examples**: `getProfile()`, `updateUser()`, `deleteClass()`

## 🚀 Development Workflow

1. **Starting Development**
   ```bash
   npm run dev
   ```

2. **Adding New Feature**
   - Create component in appropriate folder
   - Create service function if needed
   - Add route in `App.jsx`
   - Update store if needed

3. **Before Commit**
   ```bash
   npm run lint      # Check for linting errors
   npm run build     # Test production build
   ```

## 📚 Best Practices

### Components
- ✅ One component per file
- ✅ PropTypes validation
- ✅ Functional components with hooks
- ✅ Small, focused components

### State Management
- ✅ Zustand for global state (auth, etc.)
- ✅ Local state for component-specific data
- ✅ Persist important state

### API Calls
- ✅ Always use service layer
- ✅ Handle errors gracefully
- ✅ Show loading states
- ✅ Use try-catch blocks

### Styling
- ✅ Use Ant Design components first
- ✅ Custom CSS for specific needs
- ✅ Maintain consistent spacing
- ✅ Mobile-responsive always

## 🔮 Future Enhancements

### Planned Features
- [ ] Question Builder UI
- [ ] Exam Builder with drag-drop
- [ ] Real-time exam monitoring
- [ ] Export reports to PDF
- [ ] Analytics dashboard
- [ ] Dark mode support

### Technical Improvements
- [ ] Add TypeScript
- [ ] Unit tests with Vitest
- [ ] E2E tests with Playwright
- [ ] PWA capabilities
- [ ] Internationalization (i18n)

---

**Note**: Document này được cập nhật theo tiến độ phát triển project.

