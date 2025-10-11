import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuthStore from '../../store/authStore';
import { ROUTES, USER_ROLES } from '../../constants/config';

/**
 * Protected Route Component
 * Protects routes based on authentication and user role
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check if user role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === USER_ROLES.TEACHER) {
      return <Navigate to={ROUTES.TEACHER_DASHBOARD} replace />;
    } else if (user?.role === USER_ROLES.STUDENT) {
      return <Navigate to={ROUTES.STUDENT_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default ProtectedRoute;

