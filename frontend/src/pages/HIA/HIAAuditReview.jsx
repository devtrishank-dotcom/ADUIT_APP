import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Descriptions, Collapse, Table, Timeline,
  Button, Modal, Form, Input, Select, Tag, Spin, Empty,
  Typography, Space, Alert, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, RollbackOutlined,
  AlertOutlined, RiseOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import FormRenderer from '../../components/common/FormRenderer';
import RiskScorePanel from '../../components/common/RiskScorePanel';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

const statusColors = {
  Submitted: 'blue', UnderReview: 'purple', Approved: 'success',
  Returned: 'warning', Escalated: 'red',
};
const riskBandColors = { Green: 'green', Yellow: 'gold', Red: 'red' };

const HIAAuditReview = () => {
  const { auditInstanceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;

  const [loading, setLoading] = useState(true);
  const [auditInstance, setAuditInstance] = useState(null);
  const [template, setTemplate] = useState(null);
  const [responses, setResponses] = useState({});
  const [riskScore, setRiskScore] = useState(null);
  const [observations, setObservations] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [previousAudit, setPreviousAudit] = useState(null);

  const [approveModal, setApproveModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);
  const [overrideModal, setOverrideModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [approveForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [escalateForm] = Form.useForm();
  const [overrideForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.audit.getInstance(auditInstanceId);
      const data = res.data?.data || res.data;
       const rawInstance = data.auditInstance || data;
       const displayValue = (value) => {
         if (value == null) return '';
         if (typeof value === 'object') return value.name || value.employeeCode || value.code || value.id || value._id || '';
         return value;
       };
       const instance = {
         ...rawInstance,
         entityName: displayValue(rawInstance.entityName) || `${rawInstance.entityType || 'Entity'} (${String(rawInstance.entityId).slice(-6)})`,
         auditType: displayValue(rawInstance.auditType),
         auditorName: displayValue(rawInstance.auditorName || rawInstance.startedBy || rawInstance.planItem?.assignedTo),
       };
       setAuditInstance(instance);

      if (instance.workflowHistory) setActivityLog(instance.workflowHistory);
      if (instance.previousAudit) setPreviousAudit(instance.previousAudit);

      const formRes = await apiFunctions.audit.getForm(auditInstanceId);
      const formData = formRes.data?.data || formRes.data;
      setTemplate(formData.template);
      const respMap = {};
      (formData.responses || []).forEach((r) => { respMap[r.fieldCode] = r.value; });
      setResponses(respMap);

      try {
        const riskRes = await apiFunctions.audit.getRiskScore(auditInstanceId);
        setRiskScore(riskRes.data?.data || riskRes.data);
      } catch {}

      try {
        const obsRes = await apiFunctions.compliance.listObservations({ auditInstanceId });
        setObservations(obsRes.data?.data || obsRes.data || []);
      } catch {}
    } catch {
      message.error(lang === 'gu' ? 'લોડ નિષ્ફળ' : 'Failed to load');
      navigate('/hia');
    } finally {
      setLoading(false);
    }
  }, [auditInstanceId, lang, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action, formValues = {}) => {
    setActionLoading(true);
    try {
      const payload = { action };
      if (formValues.comment) payload.comment = formValues.comment;
      if (formValues.riskBand) {
        payload.newRiskBand = formValues.riskBand;
        payload.justification = formValues.justification;
      }
      await apiFunctions.audit.workflowAction(auditInstanceId, payload);
      message.success(lang === 'gu' ? 'કાર્યવાહી સફળ' : 'Action successful');
       setApproveModal(false);
       setReturnModal(false);
       setEscalateModal(false);
       setOverrideModal(false);
       approveForm.resetFields();
       returnForm.resetFields();
       escalateForm.resetFields();
       overrideForm.resetFields();
      fetchData();
    } catch {
      message.error(lang === 'gu' ? 'કાર્યવાહી નિષ્ફળ' : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getObservationColumns = () => [
    { title: lang === 'gu' ? 'શીર્ષક' : 'Title', dataIndex: 'title', key: 'title' },
    {
      title: lang === 'gu' ? 'ગંભીરતા' : 'Severity',
      dataIndex: 'severity', key: 'severity', width: 90,
      render: (val) => {
        const c = val === 'Critical' ? 'red' : val === 'High' ? 'orange' : val === 'Medium' ? 'gold' : 'green';
        return <Tag color={c}>{val}</Tag>;
      },
    },
    { title: lang === 'gu' ? 'સ્થિતિ' : 'Status', dataIndex: 'status', key: 'status', width: 90, render: (v) => <Tag>{v}</Tag> },
    {
      title: lang === 'gu' ? 'ક્રિયા' : 'Action', key: 'verifyAction', width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => message.info(lang === 'gu' ? 'ટિપ્પણી સુવિધા' : 'Comment feature')}>
            {lang === 'gu' ? 'ટિપ્પણી' : 'Comment'}
          </Button>
          <Button type="link" size="small" onClick={() => apiFunctions.compliance.verify(record.id, { verified: true }).then(() => { message.success(lang === 'gu' ? 'ચકાસાયેલ' : 'Verified'); fetchData(); }).catch(() => {})}>
            {lang === 'gu' ? 'ચકાસો' : 'Verify'}
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!auditInstance) {
    return <Empty description={lang === 'gu' ? 'ઓડિટ મળ્યું નહીં' : 'Audit not found'} style={{ marginTop: 80 }} />;
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'HIA સમીક્ષા' : 'HIA Review', onClick: () => navigate('/hia') },
            { title: auditInstance.entityName || '-' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hia')}>
              {lang === 'gu' ? 'પાછા' : 'Back'}
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {auditInstance.entityName || (lang === 'gu' ? 'ઓડિટ સમીક્ષા' : 'Audit Review')}
            </Title>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
               onClick={() => setApproveModal(true)}
            >
              {lang === 'gu' ? 'મંજૂર' : 'Approve'}
            </Button>
            <Button
              icon={<RollbackOutlined />}
              danger
               onClick={() => setReturnModal(true)}
            >
              {lang === 'gu' ? 'પરત' : 'Return'}
            </Button>
            <Button
              icon={<AlertOutlined />}
              danger
               onClick={() => setEscalateModal(true)}
            >
              {lang === 'gu' ? 'એસ્કેલેટ' : 'Escalate'}
            </Button>
            <Button
              icon={<RiseOutlined />}
               onClick={() => setOverrideModal(true)}
            >
              {lang === 'gu' ? 'જોખમ ફેરફાર' : 'Override Risk'}
            </Button>
          </Space>
        </div>
      </div>

      {previousAudit && (
        <Alert
          type="info"
          showIcon
          message={lang === 'gu' ? 'પાછલા ઓડિટનો સંદર્ભ' : 'Previous Audit Reference'}
          description={
            <Space>
              <Text>
                {lang === 'gu' ? 'પાછલો સ્કોર' : 'Previous Score'}:
                <Text strong style={{ color: previousAudit.overallScore >= 70 ? '#b91c2c' : previousAudit.overallScore >= 40 ? '#c77d2e' : '#4a7c59' }}>
                  {' '}{previousAudit.overallScore}%
                </Text>
              </Text>
              <Tag color={riskBandColors[previousAudit.riskBand] || 'default'}>
                {previousAudit.riskBand}
              </Tag>
              <Text type="secondary">
                ({previousAudit.completedDate ? dayjs(previousAudit.completedDate).format('DD/MM/YYYY') : '-'})
              </Text>
            </Space>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions title={lang === 'gu' ? 'ઓડિટ માહિતી' : 'Audit Info'} bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી' : 'Entity'}>{auditInstance.entityName}</Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'પ્રકાર' : 'Type'}>
                <Tag color={auditInstance.entityType === 'Branch' ? 'blue' : 'orange'}>{auditInstance.entityType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}>{auditInstance.auditType}</Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'સ્થિતિ' : 'Status'}>
                <Tag color={statusColors[auditInstance.status] || 'default'}>{auditInstance.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'ઓડિટર' : 'Auditor'}>{auditInstance.auditorName || '-'}</Descriptions.Item>
              <Descriptions.Item label={lang === 'gu' ? 'સબમિટ તારીખ' : 'Submitted'}>
                {auditInstance.submittedAt ? dayjs(auditInstance.submittedAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {riskScore && (
            <Card title={lang === 'gu' ? 'જોખમ આકારણી' : 'Risk Assessment'} style={{ marginBottom: 16 }}>
              <RiskScorePanel riskScore={riskScore} />
            </Card>
          )}

          {template && (
            <Card title={lang === 'gu' ? 'ઓડિટ પ્રતિભાવો' : 'Audit Responses'} style={{ marginBottom: 16 }}>
              <FormRenderer template={template} responses={responses} readOnly riskScore={riskScore} language={lang} />
            </Card>
          )}

          <Card title={lang === 'gu' ? 'નિરીક્ષણો' : 'Observations'} style={{ marginBottom: 16 }}>
            <Table
              columns={getObservationColumns()}
              dataSource={observations}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: lang === 'gu' ? 'કોઈ નિરીક્ષણ નથી' : 'No observations' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Space><HistoryOutlined /><span>{lang === 'gu' ? 'પ્રવૃત્તિ લોગ' : 'Activity Log'}</span></Space>} style={{ marginBottom: 16 }}>
            {activityLog.length > 0 ? (
              <Timeline
                items={activityLog.map((entry) => ({
                  color: entry.action === 'approve' ? 'green' : entry.action === 'return' ? 'red' : entry.action === 'escalate' ? 'red' : 'blue',
                  children: (
                    <div>
                      <Text strong>{entry.action || entry.status}</Text>
                      {entry.actorName && <Text type="secondary"> - {entry.actorName}</Text>}
                      {entry.comment && <div><Text type="secondary" italic>"{entry.comment}"</Text></div>}
                      {entry.createdAt && (
                        <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(entry.createdAt).format('DD/MM/YYYY HH:mm')}</Text></div>
                      )}
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

      <Modal
        title={lang === 'gu' ? 'મંજૂર કરો' : 'Approve Audit'}
        open={approveModal}
        onOk={() => approveForm.submit()}
        onCancel={() => { setApproveModal(false); approveForm.resetFields(); }}
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Form form={approveForm} layout="vertical" onFinish={(vals) => handleAction('approve', vals)}>
          <Form.Item name="comment" label={lang === 'gu' ? 'ટિપ્પણી (વૈકલ્પિક)' : 'Comment (optional)'}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'પરત કરો' : 'Return for Rework'}
        open={returnModal}
        onOk={() => returnForm.submit()}
        onCancel={() => { setReturnModal(false); returnForm.resetFields(); }}
        confirmLoading={actionLoading}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={returnForm} layout="vertical" onFinish={(vals) => handleAction('return', vals)}>
          <Form.Item name="comment" label={lang === 'gu' ? 'કારણ' : 'Reason'} rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'એસ્કેલેટ' : 'Escalate'}
        open={escalateModal}
        onOk={() => escalateForm.submit()}
        onCancel={() => { setEscalateModal(false); escalateForm.resetFields(); }}
        confirmLoading={actionLoading}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={escalateForm} layout="vertical" onFinish={(vals) => handleAction('escalate', vals)}>
          <Form.Item name="comment" label={lang === 'gu' ? 'કારણ' : 'Reason'} rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'જોખમ ફેરફાર' : 'Override Risk'}
        open={overrideModal}
        onOk={() => overrideForm.submit()}
        onCancel={() => { setOverrideModal(false); overrideForm.resetFields(); }}
        confirmLoading={actionLoading}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={overrideForm} layout="vertical" onFinish={(vals) => handleAction('override', vals)}>
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

export default HIAAuditReview;
