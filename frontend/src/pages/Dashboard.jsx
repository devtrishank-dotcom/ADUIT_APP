import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Typography, Space, Tag, Button, List,
  Spin, Empty, Badge, Calendar, Avatar, Tooltip,
} from 'antd';
import {
  AuditOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, TeamOutlined,
  CalendarOutlined, SearchOutlined, BellOutlined, ArrowRightOutlined,
  SafetyOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts';
import apiFunctions from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { Title, Text } = Typography;

const PIE_COLORS = ['#4a7c59', '#c77d2e', '#b91c2c', '#d92332'];
const CHART_BLUE = '#d92332';
const CHART_GREEN = '#4a7c59';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (hasRole('ADMIN') || hasRole('SUPER_ADMIN')) {
        try { res = await apiFunctions.reports.hiaDashboard(); } catch { res = null; }
      } else if (hasRole('HIA') || hasRole('HIA_REVIEWER')) {
        try { res = await apiFunctions.reports.hiaDashboard(); } catch { res = null; }
      } else if (hasRole('AUDITOR')) {
        try { res = await apiFunctions.reports.auditorDashboard(); } catch { res = null; }
      } else if (hasRole('BRANCH_MANAGER')) {
        try { res = await apiFunctions.reports.branchManagerDashboard(); } catch { res = null; }
      } else {
        try { res = await apiFunctions.reports.hiaDashboard(); } catch { res = null; }
      }
      setData(res?.data?.data || res?.data || {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  }, [hasRole]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFunctions.notifications.list({ limit: 5 });
      setNotifications(res.data?.data || res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
  }, [fetchDashboard, fetchNotifications]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const today = dayjs().format('DD MMMM YYYY');
  const quickActions = [];

  if (hasRole('AUDITOR')) {
    quickActions.push({
      key: 'startAudit',
      icon: <AuditOutlined />,
      label: lang === 'gu' ? 'નવો ઓડિટ શરૂ કરો' : 'Start New Audit',
      path: '/auditor',
      color: '#141416',
    });
  }
  if (hasRole('PLANNER') || hasRole('BRANCH_MANAGER') || hasRole('ADMIN')) {
    quickActions.push({
      key: 'viewPlan',
      icon: <CalendarOutlined />,
      label: lang === 'gu' ? 'યોજના જુઓ' : 'View Plan',
      path: '/planner',
      color: '#d92332',
    });
  }
  if (hasRole('HIA') || hasRole('HIA_REVIEWER') || hasRole('ADMIN')) {
    quickActions.push({
      key: 'reviewPending',
      icon: <SafetyOutlined />,
      label: lang === 'gu' ? 'સમીક્ષા બાકી' : 'Review Pending',
      path: '/hia',
      color: '#c77d2e',
    });
  }
  if (hasRole('COMPLIANCE_OFFICER') || hasRole('BRANCH_MANAGER')) {
    quickActions.push({
      key: 'submitCompliance',
      icon: <CheckCircleOutlined />,
      label: lang === 'gu' ? 'અનુપાલન સબમિટ' : 'Submit Compliance',
      path: '/compliance',
      color: '#4a7c59',
    });
  }
  if (hasRole('ADMIN')) {
    quickActions.push(
      { key: 'templates', icon: <FileTextOutlined />, label: lang === 'gu' ? 'ટેમ્પલેટ્સ' : 'Templates', path: '/admin/templates', color: '#718096' },
      { key: 'masters', icon: <TeamOutlined />, label: lang === 'gu' ? 'માસ્ટર્સ' : 'Masters', path: '/admin/masters', color: '#718096' },
       { key: 'rbac', icon: <SafetyOutlined />, label: lang === 'gu' ? 'RBAC' : 'RBAC', path: '/admin/roles', color: '#718096' },
      { key: 'users', icon: <TeamOutlined />, label: lang === 'gu' ? 'વપરાશકર્તાઓ' : 'Users', path: '/admin/users', color: '#718096' },
    );
  }

  const adminStats = hasRole('ADMIN') && [
    { title: lang === 'gu' ? 'ટેમ્પલેટ્સ' : 'Templates', value: data.totalTemplates || data.templateCount || 0, icon: <FileTextOutlined />, color: '#141416' },
    { title: lang === 'gu' ? 'શાખાઓ' : 'Branches', value: data.totalBranches || data.branchCount || 0, icon: <AuditOutlined />, color: '#d92332' },
    { title: lang === 'gu' ? 'PACS' : 'PACS', value: data.totalPacs || data.pacsCount || 0, icon: <TeamOutlined />, color: '#4a7c59' },
    { title: lang === 'gu' ? 'વપરાશકર્તાઓ' : 'Users', value: data.totalUsers || data.userCount || 0, icon: <TeamOutlined />, color: '#c77d2e' },
  ];

  const roleStats = [
    { title: lang === 'gu' ? 'કુલ ઓડિટ' : 'Total Audits', value: data.totalAudits || 0, icon: <AuditOutlined />, color: '#141416' },
    { title: lang === 'gu' ? 'બાકી' : 'Pending Review', value: data.pendingApproval || data.pending || 0, icon: <ClockCircleOutlined />, color: '#c77d2e' },
    { title: lang === 'gu' ? 'પૂર્ણ' : 'Completed', value: data.completed || 0, icon: <CheckCircleOutlined />, color: '#4a7c59' },
    { title: lang === 'gu' ? 'નિરિક્ષણો' : 'Observations', value: data.openObservations || data.observationCount || 0, icon: <ExclamationCircleOutlined />, color: '#b91c2c' },
  ];

  const stats = adminStats || roleStats;

  const riskDistribution = data.riskDistribution || [];
  const completionTrend = data.completionTrend || [];
  const recentAudits = data.recentAudits || [];
  const recentActivity = data.recentActivity || [];

  return (
    <div>
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <Title level={3}>
          {lang === 'gu' ? 'ફરી સ્વાગત છે' : 'Welcome back'}, {user?.firstName || user?.name || 'User'}
        </Title>
        <Text type="secondary">
          <CalendarOutlined style={{ marginRight: 6 }} />
          {today}
        </Text>
      </div>

      {stats && stats.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {stats.map((stat, idx) => (
            <Col xs={12} sm={12} md={6} key={idx}>
              <Card className="stat-card">
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  prefix={<span style={{ color: stat.color, fontSize: 20 }}>{stat.icon}</span>}
                  valueStyle={{ color: stat.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined /><span>{lang === 'gu' ? 'જોખમ વિતરણ' : 'Risk Distribution'}</span></Space>}>
            {riskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined /><span>{lang === 'gu' ? 'માસિક પૂર્ણતા' : 'Monthly Completion Trend'}</span></Space>}>
            {completionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke={CHART_GREEN} strokeWidth={2} dot={{ r: 4 }} name={lang === 'gu' ? 'પૂર્ણ' : 'Completed'} />
                  <Line type="monotone" dataKey="planned" stroke={CHART_BLUE} strokeWidth={2} dot={{ r: 4 }} name={lang === 'gu' ? 'આયોજિત' : 'Planned'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {quickActions.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title={<Space><ArrowRightOutlined /><span>{lang === 'gu' ? 'ઝડપી ક્રિયાઓ' : 'Quick Actions'}</span></Space>}>
              <Row gutter={[8, 8]}>
                {quickActions.map((action) => (
                  <Col span={12} key={action.key}>
                    <Card
                      hoverable
                      size="small"
                      style={{ borderLeft: `3px solid ${action.color}` }}
                      onClick={() => navigate(action.path)}
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <Space size={8}>
                        <span style={{ color: action.color, fontSize: 18 }}>{action.icon}</span>
                        <Text style={{ fontSize: 13 }}>{action.label}</Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
        <Col xs={24} lg={quickActions.length > 0 ? 12 : 24}>
          <Card
            title={<Space><BellOutlined /><span>{lang === 'gu' ? 'સૂચનાઓ' : 'Notifications'}</span></Space>}
            extra={
              <Button type="link" size="small">
                <Badge count={notifications.filter((n) => !n.read).length} size="small" offset={[4, 0]}>
                  <span>{lang === 'gu' ? 'બધી જુઓ' : 'View All'}</span>
                </Badge>
              </Button>
            }
          >
            {notifications.length > 0 ? (
              <List
                dataSource={notifications}
                renderItem={(item) => (
                  <List.Item key={item.id} style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="small"
                          style={{ backgroundColor: item.read ? '#cfc9c0' : '#d92332' }}
                          icon={item.read ? <CheckCircleOutlined /> : <BellOutlined />}
                        />
                      }
                      title={
                        <Text style={{ fontSize: 13, fontWeight: item.read ? 400 : 600 }}>
                          {item.title || item.message}
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
                split={false}
                locale={{ emptyText: lang === 'gu' ? 'કોઈ સૂચનાઓ નથી' : 'No notifications' }}
              />
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ સૂચનાઓ નથી' : 'No notifications'} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
