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
      console.log('🔍 GoogleCallback component mounted');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Location search:', location.search);
      console.log('🔍 Location pathname:', location.pathname);
      
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      console.log('🔍 URL params:', { 
        code: code ? 'present' : 'missing', 
        token: token ? 'present' : 'missing',
        error, 
        state 
      });
      
      // Debug: Log all URL parameters
      console.log('🔍 All URL params:', Object.fromEntries(urlParams.entries()));
      console.log('🔍 Raw token value:', token);
      console.log('🔍 Raw code value:', code);

      if (error) {
        console.error('❌ Google OAuth error:', error);
        message.error('Google login failed. Please try again.');
        navigate(ROUTES.LOGIN);
        return;
      }

      // Backend returns token directly (not code)
      if (token) {
        try {
          console.log('✅ Got token directly from backend, processing...');
          message.loading('Processing Google login...', 0);
          
          // Decode JWT token to get user info
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔍 Token payload:', tokenPayload);
          
          const user = {
            _id: tokenPayload.userId,
            email: tokenPayload.email,
            role: tokenPayload.role,
            name: tokenPayload.name || tokenPayload.email.split('@')[0]
          };
          
          console.log('✅ Extracted user data:', user);
          
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
          
          message.destroy();
          message.success('Google login successful!');
          
          // Redirect based on user role
          if (user.role === USER_ROLES.TEACHER) {
            console.log('🎯 Redirecting to teacher dashboard');
            navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
          } else {
            console.log('🎯 Redirecting to student dashboard');
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
          console.log('✅ Got authorization code, processing...');
          message.loading('Processing Google login...', 0);
          
          // Call backend to exchange code for token
          console.log('🌐 Calling backend with code...');
          const response = await authService.handleGoogleCallback(code, state);
          
          console.log('🔍 Backend response:', response);
          message.destroy();
          
          if (response.success && response.data) {
            const { token, user } = response.data;
            
            console.log('✅ Got token and user data:', { token: token ? 'present' : 'missing', user: user?.email });
            
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
              console.log('🎯 Redirecting to teacher dashboard');
              navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
            } else {
              console.log('🎯 Redirecting to student dashboard');
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
        console.log('⚠️ No token or code parameter found');
        console.log('🔍 Full URL for debugging:', window.location.href);
        console.log('🔍 Location search:', location.search);
        console.log('🔍 URLSearchParams entries:', Array.from(urlParams.entries()));
        
        // Wait a bit before redirecting to see if there's a delay
        setTimeout(() => {
          console.log('⚠️ Redirecting to login after timeout');
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
