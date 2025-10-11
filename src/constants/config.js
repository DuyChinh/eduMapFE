// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Routes
export const ROUTES = {
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Dashboard routes
  TEACHER_DASHBOARD: '/teacher/dashboard',
  STUDENT_DASHBOARD: '/student/dashboard',
  
  // Teacher routes
  TEACHER_QUESTIONS: '/teacher/questions',
  TEACHER_EXAMS: '/teacher/exams',
  TEACHER_CLASSES: '/teacher/classes',
  
  // Student routes
  STUDENT_CLASSES: '/student/classes',
  STUDENT_RESULTS: '/student/results',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_info',
};

// User Roles
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
  ADMIN: 'admin',
};

