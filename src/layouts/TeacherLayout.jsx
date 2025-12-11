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
  ShareAltOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Dropdown, Layout, Menu, Modal, Select, Space, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, STORAGE_KEYS, USER_ROLES } from '../constants/config';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import QRScanner from '../components/common/QRScanner';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;

const TeacherLayout = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const { user, logout, fetchProfile, switchRole, loading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();

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

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    const langName = t(`language.${lang}`);
    message.success(`${t('language.languageChanged')} ${langName}`);
    setIsLanguageModalVisible(false);
  };

  const showLanguageModal = () => {
    setIsLanguageModalVisible(true);
  };

  // Function to determine selected menu key based on current path
  const getSelectedKey = () => {
    const pathname = location.pathname;

    // Check if current path starts with any of the main routes
    if (pathname.startsWith('/teacher/mindmaps')) {
      return 'mindmaps';
    }
    if (pathname.startsWith('/teacher/mindmaps')) {
      return 'mindmaps';
    }

    // Default fallback
    return pathname;
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
      onClick: () => navigate(ROUTES.TEACHER_DASHBOARD),
    },
    {
      key: ROUTES.TEACHER_QUESTIONS,
      icon: <img src="/question.png" alt="Question bank" className="menu-icon-image" />,
      label: t('teacher.questionBank'),
      onClick: () => navigate(ROUTES.TEACHER_QUESTIONS),
    },
    {
      key: ROUTES.TEACHER_EXAMS,
      icon: <img src="/exam.png" alt="Exams" className="menu-icon-image" />,
      label: t('teacher.examManagement'),
      onClick: () => navigate(ROUTES.TEACHER_EXAMS),
    },
    {
      key: ROUTES.TEACHER_CLASSES,
      icon: <img src="/class.png" alt="Classes" className="menu-icon-image" />,
      label: t('teacher.classManagement'),
      onClick: () => navigate(ROUTES.TEACHER_CLASSES),
    },
    {
      key: 'mindmaps',
      icon: <ShareAltOutlined />,
      label: 'Mindmaps',
      onClick: () => navigate('/teacher/mindmaps'),
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
      key: 'language',
      icon: <GlobalOutlined />,
      label: t('menu.language'),
      onClick: showLanguageModal,
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
          items={menuItems}
          className="dashboard-menu"
        />
        <div className="sider-footer">
          {!collapsed && (
            <div className="user-info-compact">
              <Avatar
                src={avatarSrc}
                icon={!avatarSrc && <UserOutlined />}
              />
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{t('teacher.role')}</div>
              </div>
            </div>
          )}
        </div>
      </Sider>

      <Layout>
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
              icon={<BellOutlined />}
              className="notification-btn"
            />

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

      {/* Language Change Modal */}
      <Modal
        title={t('language.selectLanguage')}
        open={isLanguageModalVisible}
        onCancel={() => setIsLanguageModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button
            block
            size="large"
            icon={<GlobalOutlined />}
            onClick={() => handleLanguageChange('en')}
            type={i18n.language === 'en' ? 'primary' : 'default'}
          >
            English
          </Button>
          <Button
            block
            size="large"
            icon={<GlobalOutlined />}
            onClick={() => handleLanguageChange('vi')}
            type={i18n.language === 'vi' ? 'primary' : 'default'}
          >
            Tiếng Việt
          </Button>
          <Button
            block
            size="large"
            icon={<GlobalOutlined />}
            onClick={() => handleLanguageChange('jp')}
            type={i18n.language === 'jp' ? 'primary' : 'default'}
          >
            日本語
          </Button>
        </Space>
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


