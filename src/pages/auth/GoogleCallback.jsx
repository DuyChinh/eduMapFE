import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App, Spin } from 'antd';
import authService from '../../api/authService';
import useAuthStore from '../../store/authStore';
import { ROUTES, USER_ROLES, STORAGE_KEYS } from '../../constants/config';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const token = urlParams.get('token'); // Backward compatibility
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        console.error('❌ Google OAuth error:', error);
        message.error('Google login failed. Please try again.');
        navigate(ROUTES.LOGIN);
        return;
      }

      // Backend returns tokens directly (new format: accessToken + refreshToken)
      if (accessToken && refreshToken) {
        try {
          message.loading('Processing Google login...', 0);
          
          // Decode JWT token to get user info
          const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
          
          const user = {
            _id: tokenPayload.userId,
            email: tokenPayload.email,
            role: tokenPayload.role,
            name: tokenPayload.name || tokenPayload.email.split('@')[0]
          };
          
          // Store tokens
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken); // Backward compatibility
          
          // Update auth store directly (don't call login API)
          useAuthStore.setState({
            user: user,
            token: accessToken, // Backward compatibility
            accessToken: accessToken,
            refreshToken: refreshToken,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          message.destroy();
          message.success('Google login successful!');
          
          // Redirect based on user role
          if (user.role === USER_ROLES.TEACHER) {
            navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
          } else {
            navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
          }
        } catch (error) {
          message.destroy();
          console.error('❌ Token processing error:', error);
          message.error('Google login failed. Please try again.');
          navigate(ROUTES.LOGIN);
        }
      } 
      // Backward compatibility: old format với chỉ token
      else if (token) {
        try {
          message.loading('Processing Google login...', 0);
          
          // Decode JWT token to get user info
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          
          const user = {
            _id: tokenPayload.userId,
            email: tokenPayload.email,
            role: tokenPayload.role,
            name: tokenPayload.name || tokenPayload.email.split('@')[0]
          };
          
          // Store token (old format - chỉ có access token)
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.TOKEN, token); // Backward compatibility
          
          // Update auth store directly (don't call login API)
          useAuthStore.setState({
            user: user,
            token: token, // Backward compatibility
            accessToken: token,
            refreshToken: null, // Không có refresh token trong format cũ
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          message.destroy();
          message.success('Google login successful!');
          
          // Redirect based on user role
          if (user.role === USER_ROLES.TEACHER) {
            navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
          } else {
            navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
          }
        } catch (error) {
          message.destroy();
          console.error('❌ Token processing error:', error);
          message.error('Google login failed. Please try again.');
          navigate(ROUTES.LOGIN);
        }
      } else if (code) {
        // Fallback: if backend returns code instead of token
        try {
          message.loading('Processing Google login...', 0);
          
          // Call backend to exchange code for token
          const response = await authService.handleGoogleCallback(code, state);
          
          message.destroy();
          
          if (response.success && response.data) {
            const { token, user } = response.data;
            
            // Store token
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            
            // Update auth store directly (don't call login API)
            useAuthStore.setState({
              user: user,
              token: token,
              isAuthenticated: true,
              loading: false,
              error: null,
            });
            
            message.success('Google login successful!');
            
            // Redirect based on user role
            if (user.role === USER_ROLES.TEACHER) {
              navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
            } else {
              navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
            }
          } else {
            throw new Error('Invalid response from Google OAuth');
          }
        } catch (error) {
          message.destroy();
          console.error('❌ Google callback error:', error);
          message.error('Google login failed. Please try again.');
          navigate(ROUTES.LOGIN);
        }
      } else {
        // No token or code parameter found, redirect to login after a short delay
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 2000);
      }
    };

    handleGoogleCallback();
  }, [location.search, location.pathname, navigate, message]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: 16
    }}>
      <Spin size="large" />
      <p>Processing Google login...</p>
    </div>
  );
};

export default GoogleCallback;
