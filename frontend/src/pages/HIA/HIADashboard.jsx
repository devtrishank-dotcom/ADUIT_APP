import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Row, Col, Card, Statistic, Table, Timeline, Tag, Typography, Spin, Empty, Space,
} from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiFunctions from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const RISK_COLORS = { Green: '#4a7c59', Yellow: '#c77d2e', Red: '#b91c2c' };
const PIE_COLORS = ['#4a7c59', '#c77d2e', '#b91c2c'];
const CHART_BLUE = '#d92332';
const CHART_ORANGE = '#dd6b20';

const ComplianceStackedBar = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} barCategoryGap="20%">
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="days0to7" name="0-7 days" stackId="a" fill="#4a7c59" />
      <Bar dataKey="days8to15" name="8-15 days" stackId="a" fill="#c77d2e" />
      <Bar dataKey="days16to30" name="16-30 days" stackId="a" fill="#dd6b20" />
      <Bar dataKey="days30plus" name="30+ days" stackId="a" fill="#b91c2c" />
    </BarChart>
  </ResponsiveContainer>
);

const HIADashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.reports.hiaDashboard();
      setData(res.data?.data || res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} style={{ marginTop: 80 }} />;
  }

  const {
    totalAudits = 0,
    completed = 0,
    pendingApproval = 0,
    overdueCompliance = 0,
    avgRiskScore = 0,
    riskDistribution = [],
    completionTrend = [],
    riskHeatmap = [],
    topObservations = [],
    complianceAgeing = [],
    recentActivity = [],
  } = data;

  const heatmapColumns = [
    {
      title: lang === 'gu' ? 'એન્ટિટી' : 'Entity',
      dataIndex: 'entity',
      key: 'entity',
      fixed: 'left',
      width: 150,
    },
    ...(riskHeatmap.length > 0
      ? Object.keys(riskHeatmap[0])
        .filter((k) => k !== 'entity' && k !== 'key')
        .map((key) => ({
          title: key,
          dataIndex: key,
          key,
          width: 100,
          render: (val) => {
            if (!val) return '-';
            return (
              <div
                style={{
                  background: RISK_COLORS[val] || val === 'Red' ? '#fed7d7' : val === 'Yellow' ? '#fefcbf' : '#c6f6d5',
                  color: RISK_COLORS[val] || '#333',
                  padding: '4px 8px',
                  borderRadius: 4,
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {val}
              </div>
            );
          },
        }))
      : []),
  ];

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'HIA ડેશબોર્ડ' : 'HIA Dashboard' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'HIA પોર્ટફોલિયો ડેશબોર્ડ' : 'HIA Portfolio Dashboard'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'કુલ ઓડિટ' : 'Total Audits'}
              value={totalAudits}
              prefix={<AuditOutlined style={{ color: '#141416', fontSize: 20 }} />}
              valueStyle={{ color: '#141416' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'પૂર્ણ' : 'Completed'}
              value={completed}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'મંજૂરી બાકી' : 'Pending Approval'}
              value={pendingApproval}
              prefix={<ClockCircleOutlined style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'મુદતવીતી' : 'Overdue Compliance'}
              value={overdueCompliance}
              prefix={<WarningOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'સરેરાશ જોખમ' : 'Avg Risk Score'}
              value={avgRiskScore}
              suffix="%"
              precision={1}
              prefix={<ExclamationCircleOutlined style={{ color: '#c77d2e', fontSize: 20 }} />}
              valueStyle={{ color: '#c77d2e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'એસ્કેલેટેડ' : 'Escalated'}
              value={data.escalated || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={lang === 'gu' ? 'જોખમ વિતરણ' : 'Risk Distribution'}>
            {riskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={lang === 'gu' ? 'ઓડિટ પૂર્ણતા વલણ' : 'Audit Completion Trend'}>
            {completionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#4a7c59" strokeWidth={2} dot={{ r: 4 }} name={lang === 'gu' ? 'પૂર્ણ' : 'Completed'} />
                  <Line type="monotone" dataKey="planned" stroke="#d92332" strokeWidth={2} dot={{ r: 4 }} name={lang === 'gu' ? 'આયોજિત' : 'Planned'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title={lang === 'gu' ? 'જોખમ હીટ-મેપ' : 'Risk Heat-map'}>
            <Table
              columns={heatmapColumns}
              dataSource={riskHeatmap.map((item, idx) => ({ ...item, key: idx }))}
              rowKey="key"
              pagination={false}
              scroll={{ x: 'max-content' }}
              size="small"
              bordered
              locale={{ emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={lang === 'gu' ? 'શ્રેણી મુજબ નિરીક્ષણો' : 'Top Observations by Category'}>
            {topObservations.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topObservations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill={CHART_ORANGE} name={lang === 'gu' ? 'ગણતરી' : 'Count'} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={lang === 'gu' ? 'અનુપાલન સમયગાળો' : 'Compliance Ageing'}>
            {complianceAgeing.length > 0 ? (
              <ComplianceStackedBar data={complianceAgeing} />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={lang === 'gu' ? 'તાજેતરની પ્રવૃત્તિ' : 'Recent Activity'}>
            {recentActivity.length > 0 ? (
              <Timeline
                items={recentActivity.slice(0, 10).map((activity) => ({
                  color: activity.type === 'approved' ? 'green' : activity.type === 'returned' ? 'red' : activity.type === 'escalated' ? 'red' : 'blue',
                  children: (
                    <div>
                      <Text>{activity.description || activity.message}</Text>
                      <br />
                      <Space size={12}>
                        {activity.actorName && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {activity.actorName}
                          </Text>
                        )}
                        {activity.createdAt && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(activity.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </Space>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ પ્રવૃત્તિ નથી' : 'No activity'} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HIADashboard;
