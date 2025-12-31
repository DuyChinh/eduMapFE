import {
  BellOutlined,
  BookOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ReloadOutlined,
  SunOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  ScanOutlined,
  DownOutlined,
  RightOutlined,
  CrownOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Dropdown, Layout, Menu, Modal, Select, Space, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, STORAGE_KEYS, USER_ROLES } from '../constants/config';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import userService from '../api/userService';
import QRScanner from '../components/common/QRScanner';
import NotificationDropdown from '../components/common/NotificationDropdown';
import { connectSocket, disconnectSocket } from '../services/socketService';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;

const TeacherLayout = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const { user, logout, fetchProfile, switchRole, loading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();

  // Socket connection management
  useEffect(() => {
    if (user && user._id) {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        console.log('TeacherLayout: Initializing Socket Connection for user', user._id);
        connectSocket(token);
      }
    }
    return () => {
      console.log('TeacherLayout: Disconnecting Socket');
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    const refreshProfile = async () => {
      // Only skip when we already have profile (with avatar)
      if (user && user._id && user.profile && user.profile.avatar) {
        return;
      }
      try {
        await fetchProfile();
      } catch (error) {
        // silent
      }
    };
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize openKeys based on current path - only when sidebar is expanded
  useEffect(() => {
    if (!collapsed && location.pathname.includes('/mindmaps')) {
      setOpenKeys(['mindmaps']);
    } else if (collapsed) {
      setOpenKeys([]);
    }
  }, [location.pathname, collapsed]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleRoleChange = async () => {
    if (!selectedRole) {
      message.warning(t('message.pleaseSelectRole'));
      return;
    }

    try {
      const result = await switchRole(selectedRole);
      const roleName =
        selectedRole === USER_ROLES.TEACHER ? t('role.teacher') : t('role.student');
      message.success(`${t('role.switchSuccess')} ${roleName}`);
      setIsRoleModalVisible(false);

      if (result.user.role === USER_ROLES.TEACHER) {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
      } else if (result.user.role === USER_ROLES.STUDENT) {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
    } catch (error) {
      const errorMessage =
        typeof error === 'string' ? error : error?.message || t('role.switchFailed');
      message.error(errorMessage);
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
      i18n.changeLanguage(storedLang);
    }
  }, []);

  // Auto-sync language to DB when user loads
  useEffect(() => {
    const syncLanguage = async () => {
      const storedLang = localStorage.getItem('language');
      if (user && user._id && storedLang) {
        try {
          await userService.updateProfile(user._id, { language: storedLang });
        } catch (error) {
          console.error('Auto-sync language error:', error);
        }
      }
    };
    syncLanguage();
  }, [user]);

  const showRoleModal = () => {
    setSelectedRole(user?.role || '');
    setIsRoleModalVisible(true);
  };

  const handleRefreshProfile = async () => {
    try {
      await fetchProfile();
      message.success(t('message.profileRefreshed'));
    } catch {
      message.error(t('message.refreshFailed'));
    }
  };

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    const langName = t(`language.${lang}`);
    message.success(`${t('language.languageChanged')} ${langName}`);

    if (user && user._id) {
      try {
        await userService.updateProfile(user._id, { language: lang });
      } catch (err) {
        console.error('Failed to sync language preference', err);
      }
    }
  };

  // Function to determine selected menu key based on current path
  const getSelectedKey = () => {
    const pathname = location.pathname;

    // Check mindmap submenu routes
    if (pathname === '/teacher/mindmaps' || pathname === '/teacher/mindmaps/') {
      return 'mindmaps-mymaps';
    }
    if (pathname.startsWith('/teacher/mindmaps/shared')) {
      return 'mindmaps-shared';
    }
    if (pathname.startsWith('/teacher/mindmaps/trash')) {
      return 'mindmaps-trash';
    }
    // If editing a specific mindmap, default to My Maps
    if (pathname.startsWith('/teacher/mindmaps/')) {
      return 'mindmaps-mymaps';
    }

    // Check exam routes (create, edit, view, monitor, submissions)
    if (pathname.startsWith('/teacher/exams')) {
      return ROUTES.TEACHER_EXAMS;
    }

    // Check question routes (create, edit, detail)
    if (pathname.startsWith('/teacher/questions')) {
      return ROUTES.TEACHER_QUESTIONS;
    }

    // Check class routes (detail, reports)
    if (pathname.startsWith('/teacher/classes')) {
      return ROUTES.TEACHER_CLASSES;
    }

    // Check transaction route
    if (pathname.startsWith('/teacher/transactions')) {
      return ROUTES.TEACHER_TRANSACTIONS;
    }

    // Check dashboard route
    if (pathname.startsWith('/teacher/dashboard')) {
      return ROUTES.TEACHER_DASHBOARD;
    }

    // Default fallback
    return pathname;
  };

  // Determine which submenu should be open
  const getOpenKeys = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/teacher/mindmaps')) {
      return ['mindmaps'];
    }
    return [];
  };

  const displayName = user?.name || user?.email || '';

  const avatarSrc = user?.profile?.avatar || user?.avatar;

  const roleLabel =
    user?.role === USER_ROLES.TEACHER
      ? t('role.teacher')
      : user?.role === USER_ROLES.STUDENT
        ? t('role.student')
        : '';

  const isProfileLoading = loading && !(user && user.profile && user.profile.avatar);

  const menuItems = [
    {
      key: ROUTES.TEACHER_DASHBOARD,
      icon: <img src="/home.png" alt="Home" className="menu-icon-image" />,
      label: t('dashboard.home'),
      onClick: () => { setOpenKeys([]); navigate(ROUTES.TEACHER_DASHBOARD); },
    },
    {
      key: ROUTES.TEACHER_QUESTIONS,
      icon: <img src="/question.png" alt="Question bank" className="menu-icon-image" />,
      label: t('teacher.questionBank'),
      onClick: () => { setOpenKeys([]); navigate(ROUTES.TEACHER_QUESTIONS); },
    },
    {
      key: ROUTES.TEACHER_EXAMS,
      icon: <img src="/exam.png" alt="Exams" className="menu-icon-image" />,
      label: t('teacher.examManagement'),
      onClick: () => { setOpenKeys([]); navigate(ROUTES.TEACHER_EXAMS); },
    },
    {
      key: ROUTES.TEACHER_CLASSES,
      icon: <img src="/class.png" alt="Classes" className="menu-icon-image" />,
      label: t('teacher.classManagement'),
      onClick: () => { setOpenKeys([]); navigate(ROUTES.TEACHER_CLASSES); },
    },
    {
      key: 'mindmaps',
      icon: <img src="/mind_map.png" alt="Mindmaps" className="menu-icon-image" />,
      label: t('sidebar.mindmaps'),
      children: [
        {
          key: 'mindmaps-mymaps',
          icon: <img src="/my_maps.png" alt="My Maps" className="menu-icon-image" />,
          label: t('sidebar.myMaps'),
          onClick: () => navigate('/teacher/mindmaps'),
        },
        {
          key: 'mindmaps-shared',
          icon: <img src="/shared.png" alt="Shared" className="menu-icon-image" />,
          label: t('sidebar.shared'),
          onClick: () => navigate('/teacher/mindmaps/shared'),
        },
        {
          key: 'mindmaps-trash',
          icon: <img src="/trash.png" alt="Trash" className="menu-icon-image" />,
          label: t('sidebar.trash'),
          onClick: () => navigate('/teacher/mindmaps/trash'),
        },
      ],
    },
    {
      key: ROUTES.TEACHER_TRANSACTIONS,
      icon: <img src="/transaction_history.png" alt="Transaction History" className="menu-icon-image" />,
      label: t('payment.history'),
      onClick: () => { setOpenKeys([]); navigate(ROUTES.TEACHER_TRANSACTIONS); },
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('menu.account'),
      onClick: () => navigate('/teacher/profile'),
    },
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: t('menu.refresh'),
      onClick: handleRefreshProfile,
    },
    {
      key: 'switch-role',
      icon: <SwapOutlined />,
      label: t('menu.switchRole'),
      onClick: showRoleModal,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      onClick: handleLogout,
      danger: true,
    },
  ];

  const languageMenuItems = [
    {
      key: 'vi',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <img src="/vietnam.png" alt="Vietnam" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <span>Tiếng Việt</span>
        </div>
      ),
      onClick: () => handleLanguageChange('vi'),
    },
    {
      key: 'en',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <img src="/united-kingdom.png" alt="English" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <span>English</span>
        </div>
      ),
      onClick: () => handleLanguageChange('en'),
    },
    {
      key: 'jp',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <img src="/japan.png" alt="Japan" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <span>日本語</span>
        </div>
      ),
      onClick: () => handleLanguageChange('jp'),
    },
  ];

  const getCurrentLanguageFlag = () => {
    switch (i18n.language) {
      case 'vi':
        return <img src="/vietnam.png" alt="Vietnam" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
      case 'en':
        return <img src="/united-kingdom.png" alt="English" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
      case 'jp':
        return <img src="/japan.png" alt="Japan" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
      default:
        return <img src="/vietnam.png" alt="Vietnam" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
    }
  };

  return (
    <Layout className="dashboard-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="dashboard-sider"
        width={250}
      >
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo" />
          {!collapsed && <span className="logo-text">{t('app.name')}</span>}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          openKeys={openKeys}
          onOpenChange={(keys) => {
            // Only keep the last opened submenu
            const latestOpenKey = keys.find(key => !openKeys.includes(key));
            setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
          }}
          items={menuItems}
          className="dashboard-menu"
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        <Header className="dashboard-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-btn"
          />

          <Space size="large" className="header-actions">
            <Button
              type="text"
              icon={<ScanOutlined />}
              onClick={() => setQrScannerVisible(true)}
              title={t('qrScanner.scanQR') || 'Scan QR Code'}
              className="qr-scan-btn"
            />

            <Button
              type="text"
              icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              className="theme-toggle-btn"
            />

            <Button
              type="text"
              icon={<CrownOutlined style={{ color: '#f59e0b', fontSize: '20px' }} />}
              onClick={() => navigate('/teacher/vip-packages')}
              title="Upgrade to VIP"
              className="vip-btn"
            />

            <Dropdown
              menu={{ items: languageMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                className="language-btn"
                style={{ fontSize: '24px', padding: '4px 8px' }}
              >
                {getCurrentLanguageFlag()}
              </Button>
            </Dropdown>

            <NotificationDropdown />

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div className="user-dropdown">
                <Avatar
                  src={avatarSrc}
                  icon={!avatarSrc && <UserOutlined />}
                />
                <div className="user-info-header">
                  <span className="user-name-header">{user?.name}</span>
                  <span className="user-role-header">{roleLabel}</span>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content className="dashboard-content">
          {isProfileLoading ? (
            <div className="dashboard-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>

      {/* Role Change Modal */}
      <Modal
        title={t('role.switchRole')}
        open={isRoleModalVisible}
        onOk={handleRoleChange}
        onCancel={() => setIsRoleModalVisible(false)}
        okText={t('role.confirm')}
        cancelText={t('role.cancel')}
      >
        <p style={{ marginBottom: 16 }}>
          {t('role.currentRole')}:{' '}
          <strong>
            {user?.role === USER_ROLES.TEACHER ? t('role.teacher') : t('role.student')}
          </strong>
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder={t('role.selectNewRole')}
          value={selectedRole}
          onChange={setSelectedRole}
          options={[
            { value: USER_ROLES.TEACHER, label: t('role.teacher') },
            { value: USER_ROLES.STUDENT, label: t('role.student') },
          ]}
        />
      </Modal>

      {/* QR Scanner Modal */}
      <QRScanner
        open={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        userRole="teacher"
      />
    </Layout>
  );
};

export default TeacherLayout;


