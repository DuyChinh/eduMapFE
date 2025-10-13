import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { useTranslation } from 'react-i18next';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import AppRoutes from './routes';

function App() {
  const { i18n } = useTranslation();
  
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

  return (
    <ConfigProvider 
      locale={getAntdLocale()}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <Router>
          <AppRoutes />
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
