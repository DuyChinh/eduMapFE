import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES, USER_ROLES } from '../constants/config';
import useAuthStore from '../store/authStore';

// Layouts
import StudentLayout from '../layouts/StudentLayout';
import TeacherLayout from '../layouts/TeacherLayout';

// Auth Pages
import ForgotPassword from '../pages/auth/ForgotPassword';
import GoogleCallback from '../pages/auth/GoogleCallback';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyOTP from '../pages/auth/VerifyOTP';

// Teacher Pages
import StudentExamDetail from '../pages/student/StudentExamDetail';
import TeacherClassDetail from '../pages/teacher/ClassDetail';
import TeacherClasses from '../pages/teacher/Classes';
import CreateExam from '../pages/teacher/CreateExam';
import CreateQuestion from '../pages/teacher/CreateQuestion';
import EditExam from '../pages/teacher/EditExam';
import EditQuestion from '../pages/teacher/EditQuestion';
import ExamDetailNew from '../pages/teacher/ExamDetailNew';
import Exams from '../pages/teacher/Exams';
import Monitor from '../pages/teacher/Monitor';
import QuestionDetail from '../pages/teacher/QuestionDetail';
import Questions from '../pages/teacher/Questions';
import Reports from '../pages/teacher/Reports';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';

// Student Pages
import StudentClassDetail from '../pages/student/ClassDetail';
import StudentClasses from '../pages/student/Classes';
import ExamError from '../pages/student/ExamError';
import ExamResultDetail from '../pages/student/ExamResultDetail';
import ExamResults from '../pages/student/ExamResults';
import StudentDashboard from '../pages/student/StudentDashboard';
import TakeExam from '../pages/student/TakeExam';

// Mindmap Pages
import MindmapList from '../pages/mindmap/MindmapList';
import MindmapEditor from '../pages/mindmap/MindmapEditor';
import MindmapTrash from '../pages/mindmap/MindmapTrash';

// Public Pages
import PublicTakeExam from '../pages/public/PublicTakeExam';

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
        <Route path="questions/detail/:questionId" element={<QuestionDetail />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/create" element={<CreateExam />} />
        {/* <Route path="exams/:examId" element={<ExamDetail />} /> */}
        <Route path="exams/:examId" element={<ExamDetailNew />} />
        <Route path="exams/:examId/edit" element={<EditExam />} />
        <Route path="exams/:examId/submissions/detail/:submissionId" element={<StudentExamDetail />} />
        <Route path="exams/:examId/submissions/:studentId" element={<StudentExamDetail />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="classes/:classId" element={<TeacherClassDetail />} />
        <Route path="exams/:examId/monitor" element={<Monitor />} />
        <Route path="classes/:classId/reports" element={<Reports />} />
        <Route path="mindmaps" element={<MindmapList />} />
        <Route path="mindmaps/trash" element={<MindmapTrash />} />
        <Route path="mindmaps/:id" element={<MindmapEditor />} />
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
        <Route path="results" element={<ExamResults />} />
        <Route path="results/:submissionId" element={<ExamResultDetail />} />
        {/* <Route path="exam-results" element={<ExamResults />} /> */}
        <Route path="mindmaps" element={<MindmapList />} />
        <Route path="mindmaps" element={<MindmapList />} />
        <Route path="mindmaps/trash" element={<MindmapTrash />} />
        <Route path="mindmaps/:id" element={<MindmapEditor />} />
      </Route>

      {/* Exam-related routes without StudentLayout */}
      <Route
        path="/student/exam/:examId/take"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
            <TakeExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exam-error"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
            <ExamError />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results/:submissionId"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
            <ExamResultDetail />
          </ProtectedRoute>
        }
      />

      {/* Public Routes */}
      <Route path="/exam/:shareCode" element={<PublicTakeExam />} />

      {/* 404 - Not Found */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

