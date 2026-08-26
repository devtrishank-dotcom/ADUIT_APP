import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Descriptions, Timeline, Tag, Button, Form,
  Input, Space, Typography, Spin, Empty, Image, Divider, Badge, Modal,
  Row, Col, Select,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, FileTextOutlined, SendOutlined,
  PaperClipOutlined, EyeOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import FileUpload from '../../components/common/FileUpload';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const severityConfig = {
  Critical: { color: 'red', icon: <CloseCircleOutlined />, labelEn: 'Critical', labelGu: 'ગંભીર' },
  High: { color: 'volcano', icon: <ExclamationCircleOutlined />, labelEn: 'High', labelGu: 'ઉચ્ચ' },
  Medium: { color: 'orange', icon: <ExclamationCircleOutlined />, labelEn: 'Medium', labelGu: 'મધ્યમ' },
  Low: { color: 'blue', icon: <ClockCircleOutlined />, labelEn: 'Low', labelGu: 'નીચું' },
};

const statusConfig = {
  Open: { color: 'red', labelEn: 'Open', labelGu: 'ખુલ્લું' },
  PartiallyComplied: { color: 'orange', labelEn: 'Partially Complied', labelGu: 'આંશિક અનુપાલન' },
  Complied: { color: 'green', labelEn: 'Complied', labelGu: 'અનુપાલિત' },
  Verified: { color: 'blue', labelEn: 'Verified', labelGu: 'ચકાસાયેલ' },
  Rejected: { color: 'red', labelEn: 'Rejected', labelGu: 'નકારેલ' },
};

const actionTypeConfig = {
  Response: { color: 'blue', labelEn: 'Response', labelGu: 'પ્રતિભાવ' },
  Verification: { color: 'green', labelEn: 'Verification', labelGu: 'ચકાસણી' },
  Escalation: { color: 'red', labelEn: 'Escalation', labelGu: 'એસ્કેલેશન' },
  Rejection: { color: 'volcano', labelEn: 'Rejection', labelGu: 'અસ્વીકાર' },
};

const ObservationDetail = () => {
  const { observationId } = useParams();
  const { user, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [observation, setObservation] = useState(null);
  const [actions, setActions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();

  const fetchObservation = useCallback(async () => {
    if (!observationId) return;
    setLoading(true);
    try {
      const res = await apiFunctions.compliance.getObservation(observationId);
      const data = res.data?.data || res.data;
      setObservation(data);
      setActions(data.actions || data.complianceActions || []);
    } catch {
      message.error(lang === 'gu' ? 'નિરિક્ષણ લાવવામાં નિષ્ફળ' : 'Failed to fetch observation');
    } finally {
      setLoading(false);
    }
  }, [observationId, lang]);

  useEffect(() => {
    fetchObservation();
  }, [fetchObservation]);

  const handleSubmitResponse = async (values) => {
    setActionLoading(true);
    try {
      const payload = {
        description: values.response,
        actionType: 'Response',
        attachments: uploadedFiles.map((f) => f.id || f.uid),
        observationId,
      };
      await apiFunctions.compliance.submitAction(observationId, payload);
      message.success(lang === 'gu' ? 'પ્રતિભાવ સફળતાપૂર્વક સબમિટ થયો' : 'Response submitted successfully');
      setRespondModalOpen(false);
      form.resetFields();
      setUploadedFiles([]);
      fetchObservation();
    } catch {
      message.error(lang === 'gu' ? 'પ્રતિભાવ સબમિટ કરવામાં નિષ્ફળ' : 'Failed to submit response');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (values) => {
    setActionLoading(true);
    try {
      const payload = {
        actionType: values.verdict === 'approve' ? 'Verification' : 'Rejection',
        description: values.comment,
        actionId: selectedAction?.id,
      };
      await apiFunctions.compliance.verify(observationId, payload);
      message.success(
        values.verdict === 'approve'
          ? (lang === 'gu' ? 'પ્રતિભાવ ચકાસાયેલ' : 'Response verified')
          : (lang === 'gu' ? 'પ્રતિભાવ નકારાયેલ' : 'Response rejected'),
      );
      setVerifyModalOpen(false);
      verifyForm.resetFields();
      fetchObservation();
    } catch {
      message.error(lang === 'gu' ? 'ચકાસણી નિષ્ફળ' : 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openVerifyModal = (action) => {
    setSelectedAction(action);
    verifyForm.resetFields();
    setVerifyModalOpen(true);
  };

  const canVerify = hasRole('AUDITOR') || hasRole('HIA') || hasRole('HIA_REVIEWER') || hasRole('ADMIN');
  const canRespond = observation?.status === 'Open' || observation?.status === 'PartiallyComplied';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!observation) {
    return <Empty description={lang === 'gu' ? 'નિરિક્ષણ મળ્યું નહીં' : 'Observation not found'} style={{ marginTop: 80 }} />;
  }

  const daysRemaining = observation.targetDate
    ? dayjs(observation.targetDate).diff(dayjs(), 'day')
    : null;

  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  const getStatusHistory = () => {
    const history = [
      { status: 'Open', date: observation.raisedDate || observation.createdAt, labelEn: 'Raised', labelGu: 'ઉઠાવ્યું' },
    ];
    if (actions && actions.length > 0) {
      const verifyActions = actions.filter((a) =>
        a.actionType === 'Verification' || a.actionType === 'Rejection');
      if (verifyActions.length > 0) {
        history.push({
          status: 'Verified',
          date: verifyActions[0].createdAt,
          labelEn: 'Verified/Rejected',
          labelGu: 'ચકાસાયેલ/નકારાયેલ',
        });
      }
      const responseActions = actions.filter((a) => a.actionType === 'Response');
      if (responseActions.length > 0) {
        history.push({
          status: observation.status === 'Complied' ? 'Complied' : 'PartiallyComplied',
          date: responseActions[responseActions.length - 1].createdAt,
          labelEn: 'Response Submitted',
          labelGu: 'પ્રતિભાવ સબમિટ',
        });
      }
    }
    if (observation.status === 'Complied' || observation.status === 'Verified') {
      const finalDate = observation.compliedAt || observation.verifiedAt || observation.updatedAt;
      history.push({
        status: observation.status,
        date: finalDate,
        labelEn: observation.status,
        labelGu: statusConfig[observation.status]?.labelGu || observation.status,
      });
    }
    return history;
  };

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home', onClick: () => navigate('/dashboard') },
            { title: lang === 'gu' ? 'અનુપાલન' : 'Compliance', onClick: () => navigate('/compliance') },
            { title: lang === 'gu' ? 'નિરિક્ષણ વિગત' : 'Observation Detail' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'નિરિક્ષણ વિગત' : 'Observation Detail'}</Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          title={
            <Space size={12}>
              <Text strong style={{ fontSize: 18 }}>
                {observation.title || observation.observationTitle}
              </Text>
              {isOverdue && (
                <Badge
                  count={lang === 'gu' ? `મુદતવીતી: ${Math.abs(daysRemaining)} દિ` : `Overdue: ${Math.abs(daysRemaining)}d`}
                  style={{ backgroundColor: '#b91c2c' }}
                />
              )}
            </Space>
          }
        >
          <Descriptions.Item label={lang === 'gu' ? 'વર્ણન' : 'Description'} span={3}>
            <Paragraph>{observation.description || observation.details || '-'}</Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી' : 'Entity'}>
            {observation.entityName || observation.entity || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'ગંભીરતા' : 'Severity'}>
            <Tag
              color={severityConfig[observation.severity]?.color || 'default'}
              icon={severityConfig[observation.severity]?.icon}
            >
              {lang === 'gu'
                ? severityConfig[observation.severity]?.labelGu
                : severityConfig[observation.severity]?.labelEn || observation.severity}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'સ્થિતિ' : 'Status'}>
            <Tag color={statusConfig[observation.status]?.color || 'default'}>
              {lang === 'gu'
                ? statusConfig[observation.status]?.labelGu
                : statusConfig[observation.status]?.labelEn || observation.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'ઉઠાવવાની તારીખ' : 'Raised Date'}>
            {observation.raisedDate
              ? dayjs(observation.raisedDate).format('DD/MM/YYYY')
              : dayjs(observation.createdAt).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'લક્ષ્ય તારીખ' : 'Target Date'}>
            <Text type={isOverdue ? 'danger' : undefined}>
              {observation.targetDate
                ? dayjs(observation.targetDate).format('DD/MM/YYYY')
                : '-'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'બાકી દિવસો' : 'Days Remaining'}>
            {daysRemaining !== null ? (
              <Text
                style={{
                  color: daysRemaining < 0 ? '#b91c2c'
                    : daysRemaining <= 7 ? '#c77d2e'
                    : '#4a7c59',
                  fontWeight: 700,
                }}
              >
                {daysRemaining < 0
                  ? `-${Math.abs(daysRemaining)}`
                  : daysRemaining}
                {' '}
                {lang === 'gu' ? 'દિવસો' : 'days'}
              </Text>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'ઓડિટર' : 'Auditor'}>
            {observation.auditorName || observation.raisedBy || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>{lang === 'gu' ? 'અનુપાલન થ્રેડ' : 'Compliance Thread'}</span>
              </Space>
            }
          >
            {actions && actions.length > 0 ? (
              <Timeline
                items={actions.map((action, idx) => {
                  const cfg = actionTypeConfig[action.actionType] || {
                    color: 'default',
                    labelEn: action.actionType,
                    labelGu: action.actionType,
                  };
                  return {
                    key: action.id || idx,
                    color: cfg.color,
                    dot: cfg.color === 'green' ? <CheckCircleOutlined />
                      : cfg.color === 'red' ? <CloseCircleOutlined />
                      : cfg.color === 'volcano' ? <ExclamationCircleOutlined />
                      : undefined,
                    children: (
                      <div style={{ marginBottom: 8 }}>
                        <Space size={8} style={{ marginBottom: 4 }}>
                          <Tag color={cfg.color}>
                            {lang === 'gu' ? cfg.labelGu : cfg.labelEn}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {action.submittedBy?.name || action.submittedBy?.employeeCode || action.userName || '-'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {action.createdAt ? dayjs(action.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
                          </Text>
                        </Space>
                        <Paragraph style={{ marginBottom: 8, marginTop: 4 }}>
                          {action.description || action.comment || '-'}
                        </Paragraph>
                        {action.attachments && action.attachments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {action.attachments.map((att, i) => (
                              <Button
                                key={i}
                                type="link"
                                size="small"
                                icon={<PaperClipOutlined />}
                                href={att.url}
                                target="_blank"
                              >
                                {att.name || att.fileName || `File ${i + 1}`}
                              </Button>
                            ))}
                          </div>
                        )}
                        {canVerify
                          && action.actionType === 'Response'
                          && observation.status !== 'Verified'
                          && observation.status !== 'Complied' && (
                          <Button
                            type="link"
                            size="small"
                            icon={<SafetyOutlined />}
                            onClick={() => openVerifyModal(action)}
                            style={{ marginTop: 4 }}
                          >
                            {lang === 'gu' ? 'ચકાસો' : 'Verify'}
                          </Button>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description={lang === 'gu' ? 'હજી સુધી કોઈ પ્રતિભાવ નથી' : 'No responses yet'} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>{lang === 'gu' ? 'સ્થિતિ ઇતિહાસ' : 'Status History'}</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Timeline
              items={getStatusHistory().map((s, idx) => ({
                key: idx,
                color: s.status === 'Open' ? 'red'
                  : s.status === 'PartiallyComplied' ? 'orange'
                  : s.status === 'Complied' ? 'blue'
                  : 'green',
                children: (
                  <div>
                    <Tag color={statusConfig[s.status]?.color}>
                      {lang === 'gu' ? s.labelGu : s.labelEn}
                    </Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {s.date ? dayjs(s.date).format('DD/MM/YYYY HH:mm') : '-'}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>

          {canRespond && (
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  block
                  icon={<SendOutlined />}
                  onClick={() => {
                    form.resetFields();
                    setUploadedFiles([]);
                    setRespondModalOpen(true);
                  }}
                >
                  {lang === 'gu' ? 'પ્રતિભાવ આપો' : 'Submit Response'}
                </Button>
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title={lang === 'gu' ? 'પ્રતિભાવ સબમિટ કરો' : 'Submit Response'}
        open={respondModalOpen}
        onCancel={() => setRespondModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={actionLoading}
        width={640}
        okText={lang === 'gu' ? 'સબમિટ કરો' : 'Submit'}
        cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitResponse}>
          <Form.Item
            name="response"
            label={lang === 'gu' ? 'તમારો પ્રતિભાવ' : 'Your Response'}
            rules={[{
              required: true,
              message: lang === 'gu' ? 'પ્રતિભાવ જરૂરી છે' : 'Response is required',
            }]}
          >
            <TextArea rows={5} placeholder={lang === 'gu'
              ? 'તમારો પ્રતિભાવ અહીં લખો...'
              : 'Type your response here...'} />
          </Form.Item>
          <Form.Item label={lang === 'gu' ? 'જોડાણો' : 'Attachments'}>
            <FileUpload
              onUpload={(files) => setUploadedFiles(files)}
              fileList={uploadedFiles}
              multiple
              maxCount={5}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'પ્રતિભાવ ચકાસો' : 'Verify Response'}
        open={verifyModalOpen}
        onCancel={() => setVerifyModalOpen(false)}
        onOk={() => verifyForm.submit()}
        confirmLoading={actionLoading}
        width={520}
        okText={lang === 'gu' ? 'સબમિટ કરો' : 'Submit'}
        cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
      >
        {selectedAction && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">{lang === 'gu' ? 'પ્રતિભાવ' : 'Response'}:</Text>
            <Paragraph style={{ padding: 12, background: '#faf9f7', borderRadius: 6, marginTop: 4 }}>
              {selectedAction.description || '-'}
            </Paragraph>
          </div>
        )}
        <Form form={verifyForm} layout="vertical" onFinish={handleVerify}>
          <Form.Item
            name="verdict"
            label={lang === 'gu' ? 'ચુકાદો' : 'Verdict'}
            rules={[{
              required: true,
              message: lang === 'gu' ? 'ચુકાદો જરૂરી છે' : 'Verdict is required',
            }]}
            initialValue="approve"
          >
            <Select
              options={[
                { value: 'approve', label: lang === 'gu' ? 'મંજૂર કરો' : 'Approve' },
                { value: 'reject', label: lang === 'gu' ? 'નકારો' : 'Reject' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="comment"
            label={lang === 'gu' ? 'ટિપ્પણી' : 'Comment'}
            rules={[{
              required: true,
              message: lang === 'gu' ? 'ટિપ્પણી જરૂરી છે' : 'Comment is required',
            }]}
          >
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ObservationDetail;
