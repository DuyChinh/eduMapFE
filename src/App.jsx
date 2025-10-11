import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AppRoutes from './routes';

function App() {
  return (
    <ConfigProvider 
      locale={viVN}
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
