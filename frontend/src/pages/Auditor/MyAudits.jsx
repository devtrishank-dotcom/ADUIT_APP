import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Row, Col, Statistic, Table, Button,
  Select, DatePicker, Tag, Space, Popconfirm, Typography, List, Grid,
} from 'antd';
import {
  AuditOutlined, FileTextOutlined, CheckCircleOutlined,
  EditOutlined, DeleteOutlined, PlayCircleOutlined, EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const statusConfig = {
  Draft: { color: 'default', label: 'Draft' },
  InProgress: { color: 'processing', label: 'In Progress' },
  Submitted: { color: 'blue', label: 'Submitted' },
  UnderReview: { color: 'purple', label: 'Under Review' },
  Approved: { color: 'success', label: 'Approved' },
  Returned: { color: 'warning', label: 'Returned' },
  Closed: { color: 'green', label: 'Closed' },
};

const riskBandColors = {
  Green: 'green',
  Yellow: 'gold',
  Red: 'red',
};

const MyAudits = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, draft: 0, submitted: 0, approved: 0 });
  const [auditTypes, setAuditTypes] = useState([]);
  const [filters, setFilters] = useState({
    status: undefined,
    auditType: undefined,
    dateRange: undefined,
  });
  const [viewMode, setViewMode] = useState('table');

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const params = { assignedTo: user?.id };
      if (filters.status) params.status = filters.status;
      if (filters.auditType) params.auditType = filters.auditType;
      if (filters.dateRange) {
        params.startDateFrom = filters.dateRange[0].toISOString();
        params.startDateTo = filters.dateRange[1].toISOString();
      }
      const res = await apiFunctions.audit.listInstances(params);
      const rawList = res.data?.data || res.data || [];
      const list = rawList.map((audit) => ({
        ...audit,
        id: audit.id || audit._id,
        entityName: audit.entityName || `${audit.entityType || 'Entity'} (${String(audit.entityId).slice(-6)})`,
        auditType: audit.auditType?.name || audit.auditType?.code || audit.auditType,
        riskBand: audit.overallRiskBand || audit.riskBand,
        overallScore: audit.overallRiskScore ?? audit.overallScore,
        startDate: audit.startedAt || audit.startDate,
      }));
      setAudits(list);
      setStats({
        total: list.length,
        draft: list.filter((a) => a.status === 'Draft').length,
        submitted: list.filter((a) => a.status === 'Submitted' || a.status === 'UnderReview').length,
        approved: list.filter((a) => a.status === 'Approved' || a.status === 'Closed').length,
      });
    } catch {
      message.error(lang === 'gu' ? 'ઓડિટ લાવવામાં નિષ્ફળ' : 'Failed to fetch audits');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters, lang]);

  const fetchAuditTypes = useCallback(async () => {
    try {
      const res = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(res.data?.data || res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAuditTypes();
  }, [fetchAuditTypes]);

  useEffect(() => {
    if (user?.id) {
      fetchAudits();
    }
  }, [fetchAudits, user?.id]);

  const handleDeleteDraft = async (id) => {
    try {
      await apiFunctions.audit.deleteInstance(id);
      message.success(lang === 'gu' ? 'ડ્રાફ્ટ કાઢી નાખ્યો' : 'Draft deleted');
      fetchAudits();
    } catch (err) {
      message.error(err.response?.data?.error || (lang === 'gu' ? 'કાઢવામાં નિષ્ફળ' : 'Failed to delete'));
    }
  };

  const navigateToAudit = (record) => {
    if (record.status === 'Draft' || record.status === 'InProgress' || record.status === 'Returned') {
      navigate(`/auditor/audit/${record.id}`);
    } else {
      navigate(`/auditor/audit/${record.id}/view`);
    }
  };

  const columns = [
    {
      title: lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 180,
    },
    {
      title: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
      dataIndex: 'auditType',
      key: 'auditType',
      width: 140,
    },
    {
      title: lang === 'gu' ? 'અવધિ' : 'Period',
      key: 'period',
      width: 160,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {record.periodFrom ? dayjs(record.periodFrom).format('DD/MM/YYYY') : '-'}
          {' - '}
          {record.periodTo ? dayjs(record.periodTo).format('DD/MM/YYYY') : '-'}
        </Text>
      ),
    },
    {
      title: lang === 'gu' ? 'શરૂઆત તારીખ' : 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val) => {
        const cfg = statusConfig[val] || { color: 'default', label: val };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band',
      dataIndex: 'riskBand',
      key: 'riskBand',
      width: 100,
      render: (val) => (
        <Tag color={riskBandColors[val] || 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: lang === 'gu' ? 'કુલ સ્કોર' : 'Overall Score',
      dataIndex: 'overallScore',
      key: 'overallScore',
      width: 110,
      render: (val) => {
        if (val == null) return '-';
        const color = val >= 70 ? '#b91c2c' : val >= 40 ? '#c77d2e' : '#4a7c59';
        return <Text style={{ color, fontWeight: 600 }}>{val}%</Text>;
      },
    },
    {
      title: lang === 'gu' ? 'છેલ્લો ફેરફાર' : 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {(record.status === 'Draft' || record.status === 'InProgress' || record.status === 'Returned') ? (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={(e) => { e.stopPropagation(); navigateToAudit(record); }}
            >
              {lang === 'gu' ? 'ચાલુ રાખો' : 'Continue'}
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); navigateToAudit(record); }}
            >
              {lang === 'gu' ? 'જુઓ' : 'View'}
            </Button>
          )}
          {record.status === 'Draft' && (
            <Popconfirm
              title={lang === 'gu' ? 'ડ્રાફ્ટ કાઢી નાખવો?' : 'Delete this draft?'}
              onConfirm={(e) => { e?.stopPropagation(); handleDeleteDraft(record.id); }}
              onCancel={(e) => e?.stopPropagation()}
              okText={lang === 'gu' ? 'હા' : 'Yes'}
              cancelText={lang === 'gu' ? 'ના' : 'No'}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const renderCardView = () => (
    <List
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
      dataSource={audits}
      loading={loading}
      locale={{ emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data' }}
      renderItem={(item) => (
        <List.Item key={item.id}>
          <Card
            hoverable
            onClick={() => navigateToAudit(item)}
            style={{ borderRadius: 8 }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 15 }}>{item.entityName}</Text>
                <Tag color={statusConfig[item.status]?.color || 'default'}>
                  {statusConfig[item.status]?.label || item.status}
                </Tag>
              </div>
              <Text type="secondary">{item.auditType}</Text>
              <Space>
                <Tag color={riskBandColors[item.riskBand] || 'default'}>
                  {item.riskBand || lang === 'gu' ? 'કોઈ જોખમ નથી' : 'No Risk'}
                </Tag>
                {item.overallScore != null && (
                  <Text style={{ color: item.overallScore >= 70 ? '#b91c2c' : item.overallScore >= 40 ? '#c77d2e' : '#4a7c59', fontWeight: 600 }}>
                    {item.overallScore}%
                  </Text>
                )}
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {lang === 'gu' ? 'છેલ્લો ફેરફાર' : 'Updated'}: {item.updatedAt ? dayjs(item.updatedAt).format('DD/MM/YYYY') : '-'}
              </Text>
              <Space size="small" style={{ marginTop: 4 }}>
                {(item.status === 'Draft' || item.status === 'InProgress' || item.status === 'Returned') ? (
                  <Button type="primary" size="small" icon={<PlayCircleOutlined />} block>
                    {lang === 'gu' ? 'ચાલુ રાખો' : 'Continue'}
                  </Button>
                ) : (
                  <Button size="small" icon={<EyeOutlined />} block>
                    {lang === 'gu' ? 'જુઓ' : 'View'}
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        </List.Item>
      )}
    />
  );

  const isMobile = !screens.md;

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'મારા ઓડિટ' : 'My Audits' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'મારા ઓડિટ' : 'My Audits'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'કુલ' : 'Total'}
              value={stats.total}
              prefix={<AuditOutlined style={{ color: '#141416', fontSize: 20 }} />}
              valueStyle={{ color: '#141416' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'ડ્રાફ્ટ' : 'Draft'}
              value={stats.draft}
              prefix={<EditOutlined style={{ color: '#718096', fontSize: 20 }} />}
              valueStyle={{ color: '#718096' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'સબમિટ' : 'Submitted'}
              value={stats.submitted}
              prefix={<FileTextOutlined style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'મંજૂર' : 'Approved'}
              value={stats.approved}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'સ્થિતિ' : 'Status'}
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
              options={Object.entries(statusConfig).map(([k, v]) => ({
                value: k,
                label: v.label,
              }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
              allowClear
              style={{ width: '100%' }}
              value={filters.auditType}
              onChange={(val) => setFilters((prev) => ({ ...prev, auditType: val }))}
              options={auditTypes.map((at) => ({
                value: at.code || at.name,
                label: at.name || at.code,
              }))}
            />
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={filters.dateRange}
              onChange={(val) => setFilters((prev) => ({ ...prev, dateRange: val }))}
              placeholder={[
                lang === 'gu' ? 'થી તારીખ' : 'Start Date',
                lang === 'gu' ? 'સુધી તારીખ' : 'End Date',
              ]}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Space>
              <Button
                size="small"
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
              >
                {viewMode === 'table'
                  ? lang === 'gu' ? 'કાર્ડ દૃશ્ય' : 'Card View'
                  : lang === 'gu' ? 'ટેબલ દૃશ્ય' : 'Table View'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        {viewMode === 'table' || !isMobile ? (
          <Table
            columns={columns}
            dataSource={audits}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 1300 }}
            onRow={(record) => ({
              onClick: () => navigateToAudit(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (ttl) =>
                lang === 'gu' ? `કુલ ${ttl} ઓડિટ` : `Total ${ttl} audits`,
            }}
            locale={{
              emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data',
            }}
          />
        ) : (
          renderCardView()
        )}
      </Card>
    </div>
  );
};

export default MyAudits;
