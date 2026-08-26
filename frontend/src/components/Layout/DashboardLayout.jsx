import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Badge, Avatar, Dropdown, Space, Typography, Drawer, Grid, List, Empty } from 'antd';
import {
  HomeOutlined, SettingOutlined, CalendarOutlined, AuditOutlined,
  SafetyCertificateOutlined, CheckCircleOutlined, LockOutlined,
  BarChartOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BellOutlined, UserOutlined, LogoutOutlined, GlobalOutlined,
  FileTextOutlined, DatabaseOutlined, TeamOutlined, SafetyOutlined,
  UnorderedListOutlined, FileProtectOutlined, AlertOutlined,
  NodeIndexOutlined, NotificationOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import apiFunctions from '../../services/api';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const LogoIcon = ({ collapsed }) => (
  <div className={`ams-logo ${collapsed ? 'ams-logo-collapsed' : ''}`}>
    <span className="ams-logo-icon">A</span>
    {!collapsed && <span className="ams-logo-text">DCCB <span className="ams-logo-accent">AMS</span></span>}
  </div>
);

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout, hasRole } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFunctions.notifications.list();
      setNotifications(res.data?.data || res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((notification) => notification.isRead === false || notification.isRead === undefined).length;

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await apiFunctions.notifications.markRead(notification.id || notification._id);
        fetchNotifications();
      }
    } catch {
      // silent
    }
    if (notification.subjectType === 'AuditInstance' && notification.subjectId) {
      navigate(`/auditor/audit/${notification.subjectId}/view`);
    }
  };

  const notificationMenuItems = notifications.slice(0, 8).map((notification) => ({
    key: String(notification.id || notification._id),
    label: (
      <div
        style={{ padding: '6px 2px', maxWidth: 320 }}
        onClick={() => handleNotificationClick(notification)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: notification.isRead ? '#cfc9c0' : '#d92332',
              flexShrink: 0,
            }}
          />
          <Text strong style={{ fontSize: 13, flex: 1 }} ellipsis>
            {notification.title || notification.message}
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 16 }}>
          {notification.message || ''}
        </Text>
        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginLeft: 16, marginTop: 2 }}>
          {notification.createdAt ? dayjs(notification.createdAt).format('DD/MM/YYYY HH:mm') : ''}
        </Text>
      </div>
    ),
  }));

  if (notificationMenuItems.length > 0) {
    notificationMenuItems.push({ type: 'divider' });
  }
  notificationMenuItems.push({
    key: 'view-all',
    label: (
      <div style={{ textAlign: 'center' }} onClick={() => navigate('/notifications')}>
        <Text style={{ color: '#d92332', fontWeight: 600, fontSize: 13 }}>
          {language === 'gu' ? 'બધી સૂચનાઓ જુઓ' : 'View All Notifications'}
        </Text>
      </div>
    ),
  });

  const notificationEmpty = (
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={language === 'gu' ? 'કોઈ સૂચનાઓ નથી' : 'No notifications'}
      />
    </div>
  );

  const isAdmin = hasRole('SYSTEM ADMINISTRATOR');
  const isHIA = hasRole('HIA');
  const isPlanner = hasRole('AUDIT PLANNER');
  const isAuditor = hasRole('AUDITOR');
  const isBranchMgr = hasRole('BRANCH MANAGER');
  const isCompliance = hasRole('COMPLIANCE OWNER');

  const menuItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: t('dashboard', 'Dashboard'),
    },
    ...(isAdmin ? [{
      key: '/admin-group',
      icon: <SettingOutlined />,
      label: t('admin', 'Admin'),
      children: [
        { key: '/admin/templates', icon: <FileTextOutlined />, label: 'Templates' },
        { key: '/admin/option-lists', icon: <UnorderedListOutlined />, label: 'Option Lists' },
        { key: '/admin/value-statements', icon: <FileProtectOutlined />, label: 'Value Statements' },
        { key: '/admin/risk-configs', icon: <AlertOutlined />, label: 'Risk Config' },
        { key: '/admin/masters', icon: <DatabaseOutlined />, label: 'Masters' },
        { key: '/admin/workflows', icon: <NodeIndexOutlined />, label: 'Workflows' },
        { key: '/admin/roles', icon: <SafetyOutlined />, label: 'Roles & Permissions' },
        { key: '/admin/users', icon: <TeamOutlined />, label: 'Users' },
        { key: '/admin/notification-templates', icon: <NotificationOutlined />, label: 'Notifications' },
      ],
    }] : []),
    ...(isAdmin || isPlanner ? [{
      key: '/planner',
      icon: <CalendarOutlined />,
      label: t('planning', 'Planning'),
    }] : []),
    ...(isAdmin || isAuditor ? [{
      key: '/auditor',
      icon: <AuditOutlined />,
      label: t('myAudits', 'My Audits'),
    }] : []),
    ...(isAdmin || isHIA ? [{
      key: '/hia',
      icon: <SafetyCertificateOutlined />,
      label: t('hiaReview', 'HIA Review'),
    }] : []),
    ...(isAdmin || isBranchMgr || isCompliance ? [{
      key: '/compliance',
      icon: <CheckCircleOutlined />,
      label: t('compliance', 'Compliance'),
    }] : []),
    ...(isAdmin || isHIA ? [{
      key: '/closure',
      icon: <LockOutlined />,
      label: t('closure', 'Closure'),
    }] : []),
    {
      key: '/reports-group',
      icon: <BarChartOutlined />,
      label: t('reports', 'Reports'),
      children: [
        { key: '/reports?report=planVsActual', icon: <CalendarOutlined />, label: 'Plan vs Actual' },
        { key: '/reports?report=observationRegister', icon: <FileTextOutlined />, label: 'Observation Register' },
        { key: '/reports?report=riskTrend', icon: <BarChartOutlined />, label: 'Risk Trend' },
        { key: '/reports?report=complianceAgeing', icon: <CheckCircleOutlined />, label: 'Compliance Ageing' },
        { key: '/reports?report=auditorProductivity', icon: <TeamOutlined />, label: 'Auditor Productivity' },
        { key: '/reports?report=branchAuditHistory', icon: <DatabaseOutlined />, label: 'Branch Audit History' },
      ],
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: t('notifications', 'Notifications'),
    },
  ];

  const findOpenKeys = (path) => {
    if (path.startsWith('/admin')) return ['/admin-group'];
    if (path.startsWith('/reports')) return ['/reports-group'];
    const parts = path.split('/');
    if (parts.length > 2) return [`/${parts[1]}`];
    return [];
  };

  const handleMenuClick = ({ key }) => {
    if (key === '/admin-group') return;
    if (key === '/reports-group') {
      navigate('/reports');
      if (isMobile) setMobileDrawerOpen(false);
      return;
    }
    navigate(key);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const userMenuItems = [
    { key: 'user-name', icon: <UserOutlined />, label: user?.name || 'User', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('logout', 'Logout'), danger: true },
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const renderSidebar = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <LogoIcon collapsed={collapsed} />
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname + location.search]}
        defaultOpenKeys={findOpenKeys(location.pathname)}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 24 }}
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          width={280}
          styles={{ body: { padding: 0, background: '#141416' } }}
        >
          {renderSidebar()}
        </Drawer>
      ) : (
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          onCollapse={setCollapsed}
          style={{ overflow: 'hidden', height: '100vh', position: 'sticky', top: 0, left: 0 }}
        >
          {renderSidebar()}
        </Sider>
      )}

      <Layout>
        <Header className="ams-header">
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => isMobile ? setMobileDrawerOpen(true) : setCollapsed(!collapsed)}
            />
            {!isMobile && (
              <Text strong className="ams-header-title">
                {t('appTitle', 'AMS - Audit Management System')}
              </Text>
            )}
          </Space>

          <Space size={isMobile ? 'small' : 'middle'}>
            <Button type="text" icon={<GlobalOutlined />} onClick={toggleLanguage} size={isMobile ? 'small' : 'middle'}>
              {isMobile ? '' : (language === 'en' ? 'ગુજરાતી' : 'English')}
            </Button>
            <Dropdown
              menu={{ items: notificationMenuItems.length ? notificationMenuItems : undefined }}
              dropdownRender={(menu) => (notifications.length === 0 ? notificationEmpty : menu)}
              placement="bottomRight"
              trigger={['click']}
            >
              <Badge count={unreadCount} size="small" offset={[-2, 4]}>
                <Button type="text" icon={<BellOutlined />} size={isMobile ? 'small' : 'middle'} />
              </Badge>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <div className="ams-header-user">
                <Avatar size={isMobile ? 28 : 32} icon={<UserOutlined />} style={{ backgroundColor: '#d92332' }} />
                {!isMobile && (
                  <div className="ams-header-user-meta">
                    <span className="ams-header-user-name">{user?.name || 'User'}</span>
                    <span className="ams-header-user-code">{user?.designation || ''}</span>
                  </div>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content className="ams-content">
          <div className="ams-content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
