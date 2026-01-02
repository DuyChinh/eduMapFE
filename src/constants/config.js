// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://edu-map-be.vercel.app/v1/api';

// Routes
export const ROUTES = {
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_OTP: '/verify-otp',
  RESET_PASSWORD: '/reset-password',

  // Dashboard routes
  TEACHER_DASHBOARD: '/teacher/dashboard',
  STUDENT_DASHBOARD: '/student/dashboard',
  PROFILE: '/profile',

  // Teacher routes
  TEACHER_TRANSACTIONS: '/teacher/history-transaction',
  TEACHER_QUESTIONS: '/teacher/questions',
  TEACHER_QUESTIONS_CREATE: '/teacher/questions/create',
  TEACHER_QUESTIONS_EDIT: '/teacher/questions/edit/:questionId',
  TEACHER_QUESTIONS_DETAIL: '/teacher/questions/detail/:questionId',
  TEACHER_EXAMS: '/teacher/exams',
  TEACHER_CLASSES: '/teacher/classes',

  // Student routes
  STUDENT_CLASSES: '/student/classes',
  STUDENT_RESULTS: '/student/results',
  STUDENT_TRANSACTIONS: '/student/history-transaction',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token', // Giữ để backward compatibility
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_info',
};

// User Roles
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
  ADMIN: 'admin',
};

