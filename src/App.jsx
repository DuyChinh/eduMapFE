import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import AppRoutes from './routes';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';
import ChatWidget from './components/ChatWidget/ChatWidget';

function App() {
  const { i18n } = useTranslation();
  const { theme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  // Apply theme to document body
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Map i18n language to Ant Design locale
  const getAntdLocale = () => {
    switch (i18n.language) {
      case 'vi':
        return viVN;
      case 'en':
        return enUS;
      case 'jp':
        return jaJP;
      default:
        return viVN;
    }
  };

  // Ant Design theme configuration
  const antdThemeConfig = {
    algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#667eea',
      borderRadius: 8,
    },
  };

  return (
    <ConfigProvider
      locale={getAntdLocale()}
      theme={antdThemeConfig}
    >
      <AntdApp>
        <Router>
          <AppRoutes />
          {isAuthenticated && <ChatWidget />}
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
