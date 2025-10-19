import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROUTES, USER_ROLES } from '../constants/config';

// Layouts
import TeacherLayout from '../layouts/TeacherLayout';
import StudentLayout from '../layouts/StudentLayout';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import VerifyOTP from '../pages/auth/VerifyOTP';
import ResetPassword from '../pages/auth/ResetPassword';
import GoogleCallback from '../pages/auth/GoogleCallback';

// Teacher Pages
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import Questions from '../pages/teacher/Questions';
import CreateQuestion from '../pages/teacher/CreateQuestion';
import EditQuestion from '../pages/teacher/EditQuestion';
import Exams from '../pages/teacher/Exams';
import TeacherClasses from '../pages/teacher/Classes';
import TeacherClassDetail from '../pages/teacher/ClassDetail';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentClasses from '../pages/student/Classes';
import StudentClassDetail from '../pages/student/ClassDetail';
import Results from '../pages/student/Results';

// Components
import ProtectedRoute from '../components/common/ProtectedRoute';

/**
 * Root redirect based on authentication status
 */
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  if (user?.role === USER_ROLES.TEACHER) {
    return <Navigate to={ROUTES.TEACHER_DASHBOARD} replace />;
  } else if (user?.role === USER_ROLES.STUDENT) {
    return <Navigate to={ROUTES.STUDENT_DASHBOARD} replace />;
  }
  
  return <Navigate to={ROUTES.LOGIN} replace />;
};

/**
 * App Routes Configuration
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth Routes */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={ROUTES.VERIFY_OTP} element={<VerifyOTP />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path="/auth/callback" element={<GoogleCallback />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.TEACHER]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="questions" element={<Questions />} />
        <Route path="questions/create" element={<CreateQuestion />} />
        <Route path="questions/edit/:questionId" element={<EditQuestion />} />
        <Route path="exams" element={<Exams />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="classes/:classId" element={<TeacherClassDetail />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="classes/:classId" element={<StudentClassDetail />} />
        <Route path="results" element={<Results />} />
      </Route>

      {/* 404 - Not Found */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

