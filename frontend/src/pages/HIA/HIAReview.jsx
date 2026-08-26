import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Row, Col, Statistic, Table, Button, Modal,
  Form, Input, Select, DatePicker, Tag, Space, Typography, Checkbox, Badge,
} from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined, RiseOutlined,
  EyeOutlined, RollbackOutlined, AlertOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const riskBandColors = { Green: 'green', Yellow: 'gold', Red: 'red' };
const statusColors = {
  Submitted: 'blue',
  UnderReview: 'purple',
  Approved: 'success',
  Returned: 'warning',
  Escalated: 'red',
};

const HIAReview = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, returned: 0, escalated: 0 });
  const [filters, setFilters] = useState({
    status: undefined,
    riskBand: undefined,
    auditType: undefined,
    dateRange: undefined,
  });
  const [auditTypes, setAuditTypes] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const [approveModal, setApproveModal] = useState({ visible: false, record: null });
  const [returnModal, setReturnModal] = useState({ visible: false, record: null });
  const [escalateModal, setEscalateModal] = useState({ visible: false, record: null });
  const [overrideModal, setOverrideModal] = useState({ visible: false, record: null });
  const [actionLoading, setActionLoading] = useState(false);

  const [approveForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [escalateForm] = Form.useForm();
  const [overrideForm] = Form.useForm();

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.riskBand) params.riskBand = filters.riskBand;
      if (filters.auditType) params.auditType = filters.auditType;
      if (filters.dateRange) {
        params.fromDate = filters.dateRange[0].toISOString();
        params.toDate = filters.dateRange[1].toISOString();
      }
      const res = await apiFunctions.audit.listInstances(params);
      const rawList = res.data?.data || res.data || [];
      const list = rawList.map((audit) => ({
        ...audit,
        id: audit.id || audit._id,
        entityName: audit.entityName || `${audit.entityType || 'Entity'} (${String(audit.entityId).slice(-6)})`,
        auditType: audit.auditType?.name || audit.auditType?.code || audit.auditType,
        auditorName: audit.startedBy?.name || audit.auditorName,
        riskBand: audit.overallRiskBand || audit.riskBand,
        riskScore: audit.overallRiskScore ?? audit.riskScore,
      }));
      setAudits(list);
      setStats({
        pending: list.filter((a) => a.status === 'Submitted' || a.status === 'UnderReview').length,
        approvedToday: list.filter((a) => a.status === 'Approved').length,
        returned: list.filter((a) => a.status === 'Returned').length,
        escalated: list.filter((a) => a.status === 'Escalated').length,
      });
    } catch {
      message.error(lang === 'gu' ? 'ડેટા લાવવામાં નિષ્ફળ' : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [filters, lang]);

  const fetchAuditTypes = useCallback(async () => {
    try {
      const res = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(res.data?.data || res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAuditTypes();
    fetchAudits();
  }, [fetchAuditTypes, fetchAudits]);

  const handleWorkflowAction = async (id, data) => {
    setActionLoading(true);
    try {
      await apiFunctions.audit.workflowAction(id, data);
      message.success(lang === 'gu' ? 'કાર્યવાહી સફળ' : 'Action completed');
       setApproveModal({ visible: false, record: null });
       setReturnModal({ visible: false, record: null });
       setEscalateModal({ visible: false, record: null });
       setOverrideModal({ visible: false, record: null });
       approveForm.resetFields();
       returnForm.resetFields();
       escalateForm.resetFields();
       overrideForm.resetFields();
      fetchAudits();
    } catch {
      message.error(lang === 'gu' ? 'કાર્યવાહી નિષ્ફળ' : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setActionLoading(true);
    try {
      for (const id of selectedRowKeys) {
        await apiFunctions.audit.workflowAction(id, { action: 'approve' });
      }
      message.success(lang === 'gu' ? 'બધા મંજૂર થયા' : 'All approved');
      setSelectedRowKeys([]);
      fetchAudits();
    } catch {
      message.error(lang === 'gu' ? 'બલ્ક મંજૂરી નિષ્ફળ' : 'Bulk approve failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getSlaStatus = (submittedDate) => {
    if (!submittedDate) return null;
    const days = dayjs().diff(dayjs(submittedDate), 'day');
    if (days > 7) return { color: 'red', text: `${days}d`, overdue: true };
    if (days > 3) return { color: 'orange', text: `${days}d`, overdue: false };
    return { color: 'green', text: `${days}d`, overdue: false };
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
      title: lang === 'gu' ? 'ઓડિટર' : 'Auditor',
      dataIndex: 'auditorName',
      key: 'auditorName',
      width: 140,
      render: (val) => val || '-',
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
      title: lang === 'gu' ? 'સબમિટ તારીખ' : 'Submitted Date',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'જોખમ સ્કોર' : 'Risk Score',
      dataIndex: 'overallScore',
      key: 'overallScore',
      width: 100,
      render: (val) => {
        if (val == null) return '-';
        const color = val >= 70 ? '#b91c2c' : val >= 40 ? '#c77d2e' : '#4a7c59';
        return <Text style={{ color, fontWeight: 600 }}>{val}%</Text>;
      },
    },
    {
      title: lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band',
      dataIndex: 'riskBand',
      key: 'riskBand',
      width: 90,
      render: (val) => <Tag color={riskBandColors[val] || 'default'}>{val || '-'}</Tag>,
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (val) => <Tag color={statusColors[val] || 'default'}>{val}</Tag>,
    },
    {
      title: 'SLA',
      key: 'sla',
      width: 70,
      render: (_, record) => {
        const sla = getSlaStatus(record.submittedAt);
        if (!sla) return '-';
        return (
          <Tag color={sla.color}>
            {sla.text}
            {sla.overdue && <Badge status="error" style={{ marginLeft: 4 }} />}
          </Tag>
        );
      },
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/hia/review/${record.id}`)}
          >
            {lang === 'gu' ? 'જુઓ' : 'View'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined style={{ color: '#4a7c59' }} />}
            onClick={() => {
              setApproveModal({ visible: true, record });
            }}
          >
            {lang === 'gu' ? 'મંજૂર' : 'Approve'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<RollbackOutlined style={{ color: '#c77d2e' }} />}
            onClick={() => {
              setReturnModal({ visible: true, record });
            }}
          >
            {lang === 'gu' ? 'પરત' : 'Return'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<AlertOutlined style={{ color: '#b91c2c' }} />}
            onClick={() => {
              setEscalateModal({ visible: true, record });
            }}
          >
            {lang === 'gu' ? 'એસ્કેલેટ' : 'Escalate'}
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record.status !== 'Submitted' && record.status !== 'UnderReview',
    }),
  };

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'HIA સમીક્ષા' : 'HIA Review' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'HIA સમીક્ષા ઇનબોક્સ' : 'HIA Review Inbox'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'બાકી સમીક્ષા' : 'Pending Review'}
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'આજે મંજૂર' : 'Approved Today'}
              value={stats.approvedToday}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'પરત' : 'Returned'}
              value={stats.returned}
              prefix={<RollbackOutlined style={{ color: '#c77d2e', fontSize: 20 }} />}
              valueStyle={{ color: '#c77d2e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'એસ્કેલેટેડ' : 'Escalated'}
              value={stats.escalated}
              prefix={<AlertOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={5}>
            <Select
              placeholder={lang === 'gu' ? 'સ્થિતિ' : 'Status'}
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
              options={[
                { value: 'Submitted', label: 'Submitted' },
                { value: 'UnderReview', label: 'Under Review' },
              ]}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Select
              placeholder={lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band'}
              allowClear
              style={{ width: '100%' }}
              value={filters.riskBand}
              onChange={(val) => setFilters((prev) => ({ ...prev, riskBand: val }))}
              options={[
                { value: 'Red', label: 'Red' },
                { value: 'Yellow', label: 'Yellow' },
                { value: 'Green', label: 'Green' },
              ]}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Select
              placeholder={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
              allowClear
              style={{ width: '100%' }}
              value={filters.auditType}
              onChange={(val) => setFilters((prev) => ({ ...prev, auditType: val }))}
              options={auditTypes.map((at) => ({ value: at.code || at.name, label: at.name || at.code }))}
            />
          </Col>
          <Col xs={24} sm={7}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={filters.dateRange}
              onChange={(val) => setFilters((prev) => ({ ...prev, dateRange: val }))}
            />
          </Col>
          <Col xs={24} sm={2}>
            {selectedRowKeys.length > 0 && (
              <Button type="primary" size="small" loading={actionLoading} onClick={handleBulkApprove}>
                {lang === 'gu' ? `મંજૂર (${selectedRowKeys.length})` : `Approve (${selectedRowKeys.length})`}
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={audits}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
          onRow={(record) => {
            const sla = getSlaStatus(record.submittedAt);
            return {
              style: sla?.overdue ? { background: '#fff5f5' } : {},
              onClick: () => navigate(`/hia/review/${record.id}`),
            };
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (ttl) => lang === 'gu' ? `કુલ ${ttl} ઓડિટ` : `Total ${ttl} audits`,
          }}
          locale={{ emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data' }}
        />
      </Card>

      <Modal
        title={lang === 'gu' ? 'મંજૂર કરો' : 'Approve Audit'}
        open={approveModal.visible}
        onOk={() => approveForm.submit()}
        onCancel={() => { setApproveModal({ visible: false, record: null }); approveForm.resetFields(); }}
        confirmLoading={actionLoading}
        okText={lang === 'gu' ? 'મંજૂર' : 'Approve'}
        destroyOnHidden
      >
        <Text style={{ marginBottom: 12, display: 'block' }}>
          {lang === 'gu'
            ? `"${approveModal.record?.entityName}" મંજૂર કરવું?`
            : `Approve "${approveModal.record?.entityName}"?`}
        </Text>
        <Form form={approveForm} layout="vertical" onFinish={(vals) => handleWorkflowAction(approveModal.record?.id, { action: 'approve', comment: vals.comment })}>
          <Form.Item name="comment" label={lang === 'gu' ? 'ટિપ્પણી (વૈકલ્પિક)' : 'Comment (optional)'}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'પુનઃકાર્ય માટે પરત' : 'Return for Rework'}
        open={returnModal.visible}
        onOk={() => returnForm.submit()}
        onCancel={() => { setReturnModal({ visible: false, record: null }); returnForm.resetFields(); }}
        confirmLoading={actionLoading}
        okText={lang === 'gu' ? 'પરત કરો' : 'Return'}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={returnForm} layout="vertical" onFinish={(vals) => handleWorkflowAction(returnModal.record?.id, { action: 'return', comment: vals.comment })}>
          <Form.Item name="comment" label={lang === 'gu' ? 'કારણ' : 'Reason'} rules={[{ required: true, message: lang === 'gu' ? 'કારણ જરૂરી છે' : 'Reason is required' }]}>
            <TextArea rows={3} placeholder={lang === 'gu' ? 'પરત કરવાનું કારણ લખો' : 'Enter reason for return'} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'એસ્કેલેટ કરો' : 'Escalate'}
        open={escalateModal.visible}
        onOk={() => escalateForm.submit()}
        onCancel={() => { setEscalateModal({ visible: false, record: null }); escalateForm.resetFields(); }}
        confirmLoading={actionLoading}
        okText={lang === 'gu' ? 'એસ્કેલેટ' : 'Escalate'}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={escalateForm} layout="vertical" onFinish={(vals) => handleWorkflowAction(escalateModal.record?.id, { action: 'escalate', comment: vals.comment })}>
          <Form.Item name="comment" label={lang === 'gu' ? 'એસ્કેલેશન કારણ' : 'Escalation Reason'} rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'જોખમ ફેરફાર' : 'Override Risk'}
        open={overrideModal.visible}
        onOk={() => overrideForm.submit()}
        onCancel={() => { setOverrideModal({ visible: false, record: null }); overrideForm.resetFields(); }}
        confirmLoading={actionLoading}
        okText={lang === 'gu' ? 'ફેરફાર કરો' : 'Override'}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={overrideForm} layout="vertical" onFinish={(vals) => handleWorkflowAction(overrideModal.record?.id, { action: 'override', newRiskBand: vals.riskBand, justification: vals.justification })}>
          <Form.Item name="riskBand" label={lang === 'gu' ? 'નવું જોખમ સ્તર' : 'New Risk Band'} rules={[{ required: true }]}>
            <Select options={[
              { value: 'Green', label: 'Green' },
              { value: 'Yellow', label: 'Yellow' },
              { value: 'Red', label: 'Red' },
            ]} />
          </Form.Item>
          <Form.Item name="justification" label={lang === 'gu' ? 'ઔચિત્ય' : 'Justification'} rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HIAReview;
