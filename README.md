# 🎓 EduMap - Frontend

Online Exam Platform - MVP Version

## 📋 Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [API Integration](#api-integration)
- [Multi-Language Support](#multi-language-support)

## 🎯 Introduction

**EduMap** is an online exam platform built with React and Ant Design. The system supports two main roles: **Teachers** and **Students**.

### 🌐 Multi-Language Support
- **English** (Default)
- **Vietnamese**
- **Japanese**

## ✨ Features

### 🧑‍🏫 For Teachers
- ✅ Question bank management (MCQ, True/False)
- ✅ Create and manage exams
- ✅ Class management
- ✅ Track student results
- ✅ Export grades to CSV

### 👨‍🎓 For Students
- ✅ Join classes with code
- ✅ View exam list
- ✅ Take online exams
- ✅ View results and history

### 🔐 Authentication
- ✅ Login/Register
- ✅ Google OAuth login
- ✅ Forgot/Reset password
- ✅ Password validation with security requirements
- ✅ Role-based access control

### 🌍 Internationalization (i18n)
- ✅ 3 languages: English, Vietnamese, Japanese
- ✅ Real-time language switching
- ✅ Persistent language selection
- ✅ Fully translated UI

## 🛠 Tech Stack

- **React 18.3.1** - UI Library
- **Vite 6.0.5** - Build tool & Dev server
- **React Router DOM** - Client-side routing
- **Ant Design (antd)** - UI Component Library
- **Axios** - HTTP Client
- **Zustand** - State Management
- **i18next** - Internationalization
- **react-i18next** - React bindings for i18next
- **ESLint** - Code linting

## 📁 Project Structure

```
src/
├── api/                    # API service layer
│   ├── axios.js           # Axios instance with interceptors
│   ├── authService.js     # Authentication APIs
│   ├── userService.js     # User management APIs
│   └── classService.js    # Class management APIs
│
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── common/           # Common/shared components
│   │   └── ProtectedRoute.jsx
│   ├── teacher/          # Teacher-specific components
│   └── student/          # Student-specific components
│
├── pages/                # Page components
│   ├── auth/            # Auth pages (Login, Register, etc.)
│   ├── teacher/         # Teacher pages (Dashboard, Questions, etc.)
│   └── student/         # Student pages (Dashboard, Classes, etc.)
│
├── layouts/             # Layout components
│   ├── TeacherLayout.jsx
│   ├── StudentLayout.jsx
│   └── DashboardLayout.css
│
├── store/               # State management (Zustand)
│   └── authStore.js
│
├── i18n/               # Internationalization
│   ├── config.js       # i18n configuration
│   └── locales/        # Translation files
│       ├── en.json     # English
│       ├── vi.json     # Vietnamese
│       └── jp.json     # Japanese
│
├── utils/               # Utility functions
│   └── passwordValidator.js
│
├── constants/           # Constants and configurations
│   └── config.js
│
├── routes/             # Route configuration
│   └── index.jsx
│
├── App.jsx             # Main App component
└── main.jsx            # Entry point
```

## 🚀 Installation

### System Requirements
- Node.js >= 16.0.0
- npm >= 8.0.0

### Installation Steps

1. **Clone repository**
```bash
git clone <repository-url>
cd EduMapFE
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open browser**
```
http://localhost:5173
```

## 📝 Usage

### Development
```bash
npm run dev          # Run dev server with HMR
```

### Build for Production
```bash
npm run build        # Build production
npm run preview      # Preview production build
```

### Linting
```bash
npm run lint         # Run ESLint
```

## 🔌 API Integration

### Base URL
```javascript
https://edu-map-be.vercel.app/v1/api
```

### Authentication Flow

1. **Login**
```javascript
POST /auth/login
Body: { email, password }
Response: { 
  success: true,
  message: "Login successful",
  data: {
    user: { ... },
    token: "..."
  }
}
```

2. **Register**
```javascript
POST /auth/register
Body: { name, email, password, role }
Response: { success, message, data: { user } }
```

3. **Protected Routes**
All requests to protected endpoints need header:
```javascript
Authorization: Bearer {token}
```

### Using API in Components

```javascript
import authService from '../api/authService';

// Login
const handleLogin = async (credentials) => {
  try {
    const result = await authService.login(credentials);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## 🌐 Multi-Language Support

### Available Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Default |
| Vietnamese | `vi` | ✅ Active |
| Japanese | `jp` | ✅ Active |

### How to Use

**For Users:**
1. Click on avatar/username in dashboard header
2. Select "Language" from dropdown menu
3. Choose desired language from modal
4. UI updates immediately

**For Developers:**
```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('app.name')}</h1>;
}
```

### Documentation
See [I18N_GUIDE.md](./I18N_GUIDE.md) for complete documentation.

## 🎨 UI/UX Features

- **Responsive Design** - Compatible with all devices
- **Modern UI** - Using Ant Design components
- **Loading States** - Loading indicators for all async operations
- **Error Handling** - User-friendly error messages
- **Form Validation** - Real-time validation with feedback
- **Password Strength Indicator** - Visual feedback for password strength
- **Multi-Language** - 3 languages with real-time switching

## 🔒 Security Features

- **JWT Authentication** - Token-based authentication
- **Protected Routes** - Role-based access control
- **Password Requirements** - Enforced strong password policy
- **Auto Logout** - Automatic logout when token expires
- **XSS Protection** - Sanitized user inputs
- **CORS Handling** - Proper CORS configuration

## 📱 Responsive Breakpoints

- **Mobile**: < 576px
- **Tablet**: 576px - 768px
- **Desktop**: 768px - 1024px
- **Large Desktop**: > 1024px

## 🐛 Troubleshooting

### Port already in use
```bash
# Change port in vite.config.js
export default defineConfig({
  server: {
    port: 3000
  }
})
```

### Dependencies error
```bash
rm -rf node_modules package-lock.json
npm install
```

### i18n not working
```bash
# Check browser console for errors
# Verify language file exists in src/i18n/locales/
# Clear localStorage: localStorage.removeItem('language')
```

## 📚 Additional Documentation

- [I18N_GUIDE.md](./I18N_GUIDE.md) - Multi-language support guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history and changes
- [API.md](./API.md) - API documentation

## 📊 Project Statistics

- **Languages**: 3 (EN, VI, JP)
- **Routes**: 10+
- **Components**: 20+
- **Build Size**: ~1 MB (340 KB gzipped)
- **Load Time**: < 2s

## 🔮 Future Enhancements

- [ ] Add more languages (French, Spanish, Korean)
- [ ] Real-time notifications
- [ ] Advanced exam features
- [ ] Analytics dashboard
- [ ] Dark mode
- [ ] Mobile app

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributors

- EduMap Development Team

## 📞 Support

If you encounter any issues or have questions, please create an issue on GitHub or contact the support team.

---

**Made with ❤️ by EduMap Team**

**Version:** 1.0.0  
**Last Updated:** October 11, 2025
