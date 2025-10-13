import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Modal, Select, App } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SwapOutlined,
  ReloadOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { ROUTES, USER_ROLES } from '../constants/config';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;

const TeacherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const { user, logout, fetchProfile, updateRole } = useAuthStore();
  const { t, i18n } = useTranslation();

  // Auto refresh profile when entering dashboard (only if no user data)
  useEffect(() => {
    const refreshProfile = async () => {
      // Skip if we already have user data (e.g., from Google OAuth)
      if (user && user._id) {
        console.log('✅ User data already available, skipping profile refresh');
        return;
      }
      
      try {
        await fetchProfile();
        console.log('✅ Profile refreshed on dashboard load');
      } catch (error) {
        console.error('❌ Failed to refresh profile:', error);
        // Don't redirect to login on profile fetch error
        // The user might still be authenticated
      }
    };
    refreshProfile();
  }, [fetchProfile, user]);

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
      const result = await updateRole(user._id, selectedRole);
      const roleName = selectedRole === USER_ROLES.TEACHER ? t('role.teacher') : t('role.student');
      message.success(`${t('role.switchSuccess')} ${roleName}`);
      setIsRoleModalVisible(false);
      
      // Navigate to appropriate dashboard
      if (result.user.role === USER_ROLES.TEACHER) {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
      } else if (result.user.role === USER_ROLES.STUDENT) {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
      
      // Refresh page to update layout
      window.location.reload();
    } catch (error) {
      // Error is now a string from axios interceptor
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('role.switchFailed'));
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

  const menuItems = [
    {
      key: ROUTES.TEACHER_DASHBOARD,
      icon: <HomeOutlined />,
      label: t('dashboard.home'),
      onClick: () => navigate(ROUTES.TEACHER_DASHBOARD),
    },
    {
      key: ROUTES.TEACHER_QUESTIONS,
      icon: <FileTextOutlined />,
      label: t('teacher.questionBank'),
      onClick: () => navigate(ROUTES.TEACHER_QUESTIONS),
    },
    {
      key: ROUTES.TEACHER_EXAMS,
      icon: <BookOutlined />,
      label: t('teacher.examManagement'),
      onClick: () => navigate(ROUTES.TEACHER_EXAMS),
    },
    {
      key: ROUTES.TEACHER_CLASSES,
      icon: <TeamOutlined />,
      label: t('teacher.classManagement'),
      onClick: () => navigate(ROUTES.TEACHER_CLASSES),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('menu.account'),
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
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="dashboard-menu"
        />

        <div className="sider-footer">
          {!collapsed && (
            <div className="user-info-compact">
              <Avatar 
                src={user?.avatar}
                icon={!user?.avatar && <UserOutlined />}
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
                src={user?.avatar}
                icon={!user?.avatar && <UserOutlined />}
              />
                <span className="user-name-header">{user?.name}</span>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content className="dashboard-content">
          <Outlet />
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
          {t('role.currentRole')}: <strong>{user?.role === USER_ROLES.TEACHER ? t('role.teacher') : t('role.student')}</strong>
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
    </Layout>
  );
};

export default TeacherLayout;

