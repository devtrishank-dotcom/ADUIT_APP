import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Row, Col, Card, Statistic, Table, Button, Tabs,
  Tag, Space, Modal, Typography, Popconfirm, Result, Descriptions,
} from 'antd';
import {
  LockOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, FileTextOutlined, EyeOutlined,
  CloseOutlined, RedoOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;

const riskBandColors = {
  Green: 'green',
  Yellow: 'gold',
  Red: 'red',
};

const statusConfig = {
  ReadyForClosure: { color: 'blue', labelEn: 'Ready for Closure', labelGu: 'સમાપ્તિ માટે તૈયાર' },
  Closed: { color: 'green', labelEn: 'Closed', labelGu: 'બંધ' },
  Reopened: { color: 'orange', labelEn: 'Reopened', labelGu: 'ફરી ખોલેલ' },
};

const ClosureList = () => {
  const { user, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [readyAudits, setReadyAudits] = useState([]);
  const [closedAudits, setClosedAudits] = useState([]);
  const [stats, setStats] = useState({ readyForClosure: 0, closedThisMonth: 0, pendingCompliance: 0 });
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ready');

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.closure.getReadyForClosure();
       const rawList = res.data?.data || res.data || [];
       const list = rawList.map((audit) => ({
         ...audit,
         id: audit.id || audit._id,
         entityName: audit.entityName || `${audit.entityType || 'Entity'} (${String(audit.entityId).slice(-6)})`,
         auditType: audit.auditType?.name || audit.auditType?.code || audit.auditType,
         riskBand: audit.overallRiskBand || audit.riskBand,
       }));
       setReadyAudits(list.filter((a) => a.status !== 'Closed'));
       setClosedAudits(list.filter((a) => a.status === 'Closed'));

      const now = dayjs();
      const startOfMonth = now.startOf('month');
      setStats({
        readyForClosure: list.filter((a) => a.status === 'ReadyForClosure' || a.status === 'Submitted').length,
        closedThisMonth: list.filter(
          (a) => a.status === 'Closed' && a.closedAt && dayjs(a.closedAt).isAfter(startOfMonth),
        ).length,
        pendingCompliance: list.filter((a) => a.pendingObservations > 0).length,
      });
    } catch {
      message.error(lang === 'gu' ? 'ડેટા લાવવામાં નિષ્ફળ' : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleClose = async (record) => {
    setSelectedAudit(record);
    setCloseModalOpen(true);
  };

  const confirmClosure = async () => {
    if (!selectedAudit) return;
    setClosingLoading(true);
    try {
      await apiFunctions.closure.generateClosure({
        auditInstanceId: selectedAudit.id,
        confirmedBy: user?.id,
      });
      message.success(lang === 'gu' ? 'ઓડિટ સફળતાપૂર્વક બંધ કરાયું' : 'Audit closed successfully');
      setCloseModalOpen(false);
      fetchAudits();
    } catch {
      message.error(lang === 'gu' ? 'ઓડિટ બંધ કરવામાં નિષ્ફળ' : 'Failed to close audit');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleReopen = async (id) => {
    try {
      await apiFunctions.closure.reopen(id);
      message.success(lang === 'gu' ? 'ઓડિટ ફરી ખોલાયું' : 'Audit reopened');
      fetchAudits();
    } catch {
      message.error(lang === 'gu' ? 'ફરી ખોલવામાં નિષ્ફળ' : 'Failed to reopen');
    }
  };

  const canClose = hasPermission('closure', 'close') || hasPermission('closure', '*');

  const readyColumns = [
    {
      title: lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 160,
    },
    {
      title: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
      dataIndex: 'auditType',
      key: 'auditType',
      width: 130,
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
      title: lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band',
      dataIndex: 'riskBand',
      key: 'riskBand',
      width: 100,
      render: (val) => (
        <Tag color={riskBandColors[val] || 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: lang === 'gu' ? 'સબમિટ તારીખ' : 'Submitted Date',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 110,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'ખુલ્લા નિરિક્ષણો' : 'Pending Observations',
      dataIndex: 'pendingObservations',
      key: 'pendingObservations',
      width: 140,
      render: (val) => (
        <Text
          style={{
            color: val > 0 ? '#b91c2c' : '#4a7c59',
            fontWeight: 600,
          }}
        >
          {val != null ? val : '-'}
        </Text>
      ),
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (val) => {
        const cfg = statusConfig[val] || { color: 'default', labelEn: val, labelGu: val };
        return <Tag color={cfg.color}>{lang === 'gu' ? cfg.labelGu : cfg.labelEn}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.pendingObservations === 0 && (
            <Button
              type="primary"
              size="small"
              icon={<LockOutlined />}
              onClick={() => handleClose(record)}
            >
              {lang === 'gu' ? 'ઓડિટ બંધ કરો' : 'Close Audit'}
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/auditor/audit/${record.id}/view`)}
          >
            {lang === 'gu' ? 'ઓડિટ જુઓ' : 'Review Audit'}
          </Button>
        </Space>
      ),
    },
  ];

  const closedColumns = [
    {
      title: lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 160,
    },
    {
      title: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
      dataIndex: 'auditType',
      key: 'auditType',
      width: 130,
    },
    {
      title: lang === 'gu' ? 'બંધ તારીખ' : 'Closed Date',
      dataIndex: 'closedAt',
      key: 'closedAt',
      width: 110,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
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
      title: lang === 'gu' ? 'પ્રમાણપત્ર' : 'Certificate',
      key: 'certificate',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<SafetyCertificateOutlined />}
          onClick={() => navigate(`/closure/certificate/${record.id}`)}
        >
          {lang === 'gu' ? 'જુઓ' : 'View Certificate'}
        </Button>
      ),
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        canClose ? (
          <Popconfirm
            title={lang === 'gu' ? 'આ ઓડિટ ફરી ખોલવું?' : 'Reopen this audit?'}
            onConfirm={() => handleReopen(record.id)}
            okText={lang === 'gu' ? 'હા' : 'Yes'}
            cancelText={lang === 'gu' ? 'ના' : 'No'}
          >
            <Button
              type="link"
              size="small"
              icon={<RedoOutlined />}
              danger
            >
              {lang === 'gu' ? 'ફરી ખોલો' : 'Reopen'}
            </Button>
          </Popconfirm>
        ) : null
      ),
    },
  ];

  const tabItems = [
    {
      key: 'ready',
      label: (
        <Space>
          <ClockCircleOutlined />
          <span>{lang === 'gu' ? 'સમાપ્તિ માટે તૈયાર' : 'Ready for Closure'}</span>
          <Tag>{readyAudits.length}</Tag>
        </Space>
      ),
      children: (
        <Table
          columns={readyColumns}
          dataSource={readyAudits}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1100 }}
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
      ),
    },
    {
      key: 'closed',
      label: (
        <Space>
          <CheckCircleOutlined />
          <span>{lang === 'gu' ? 'બંધ ઓડિટ' : 'Closed Audits'}</span>
          <Tag color="green">{closedAudits.length}</Tag>
        </Space>
      ),
      children: (
        <Table
          columns={closedColumns}
          dataSource={closedAudits}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 800 }}
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
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'સમાપ્તિ' : 'Closure' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'ઓડિટ સમાપ્તિ' : 'Audit Closure'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'સમાપ્તિ માટે તૈયાર' : 'Ready for Closure'}
              value={stats.readyForClosure}
              prefix={<ClockCircleOutlined style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'આ મહિને બંધ' : 'Closed This Month'}
              value={stats.closedThisMonth}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'અનુપાલન બાકી' : 'Pending Compliance'}
              value={stats.pendingCompliance}
              prefix={<ExclamationCircleOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal
        title={lang === 'gu' ? 'ઓડિટ સમાપ્તિની પુષ્ટિ' : 'Confirm Audit Closure'}
        open={closeModalOpen}
        onCancel={() => setCloseModalOpen(false)}
        onOk={confirmClosure}
        confirmLoading={closingLoading}
        okText={lang === 'gu' ? 'બંધ કરો' : 'Close Audit'}
        cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
        okButtonProps={{ danger: true }}
        width={600}
      >
        {selectedAudit && (
          <div>
            <Result
              icon={<LockOutlined style={{ color: '#d92332' }} />}
              title={lang === 'gu' ? 'ઓડિટ સમાપ્તિની પુષ્ટિ કરો' : 'Confirm Audit Closure'}
              subTitle={lang === 'gu'
                ? 'આ ક્રિયા પછી ઓડિટ બંધ થઈ જશે અને પ્રમાણપત્ર જનરેટ થશે.'
                : 'This will close the audit and generate a closure certificate.'}
            />
            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી' : 'Entity'}>
                {selectedAudit.entityName}
              </Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}>
                {selectedAudit.auditType}
              </Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band'}>
                <Tag color={riskBandColors[selectedAudit.riskBand] || 'default'}>
                  {selectedAudit.riskBand || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'ખુલ્લા નિરિક્ષણો' : 'Pending Observations'}>
                <Text
                  style={{
                    color: selectedAudit.pendingObservations > 0 ? '#b91c2c' : '#4a7c59',
                    fontWeight: 600,
                  }}
                >
                  {selectedAudit.pendingObservations || 0}
                </Text>
              </Descriptions.Item>
            </Descriptions>
            {selectedAudit.pendingObservations > 0 && (
              <Text type="danger" style={{ display: 'block', marginTop: 16 }}>
                {lang === 'gu'
                  ? `ચેતવણી: ${selectedAudit.pendingObservations} નિરિક્ષણો હજુ ખુલ્લા છે. શું તમે ચોક્કસ છો?`
                  : `Warning: ${selectedAudit.pendingObservations} observations are still open. Are you sure?`}
              </Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClosureList;
