import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Descriptions, Timeline, Table, Button,
  Spin, Tag, Typography, Space, Image, Collapse, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, FilePdfOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
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

const statusColors = {
  Draft: 'default',
  InProgress: 'processing',
  Submitted: 'blue',
  UnderReview: 'purple',
  Approved: 'success',
  Returned: 'warning',
  Closed: 'green',
};

const AuditDetail = () => {
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
  const [attachments, setAttachments] = useState([]);
  const [workflowHistory, setWorkflowHistory] = useState([]);

  const fetchAuditDetail = useCallback(async () => {
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
         assignedToName: displayValue(rawInstance.assignedToName || rawInstance.auditorName || rawInstance.startedBy || rawInstance.planItem?.assignedTo),
         financialYear: displayValue(rawInstance.financialYear || rawInstance.planItem?.financialYear),
       };
      setAuditInstance(instance);

      if (instance.attachments) setAttachments(instance.attachments);
      if (instance.workflowHistory) setWorkflowHistory(instance.workflowHistory);

      const formRes = await apiFunctions.audit.getForm(auditInstanceId);
      const formData = formRes.data?.data || formRes.data;
      setTemplate(formData.template);
      const respMap = {};
      (formData.responses || []).forEach((r) => {
        respMap[r.fieldCode] = r.value;
      });
      setResponses(respMap);

      try {
        const riskRes = await apiFunctions.audit.getRiskScore(auditInstanceId);
        setRiskScore(riskRes.data?.data || riskRes.data);
      } catch {}
    } catch {
      message.error(lang === 'gu' ? 'ઓડિટ લોડ કરવામાં નિષ્ફળ' : 'Failed to load audit');
      navigate('/auditor');
    } finally {
      setLoading(false);
    }
  }, [auditInstanceId, lang, navigate]);

  const fetchObservations = useCallback(async () => {
    try {
      const res = await apiFunctions.compliance.listObservations({ auditInstanceId });
      setObservations(res.data?.data || res.data || []);
    } catch {}
  }, [auditInstanceId]);

  useEffect(() => {
    fetchAuditDetail();
  }, [fetchAuditDetail]);

  useEffect(() => {
    if (auditInstance) fetchObservations();
  }, [auditInstance, fetchObservations]);

  const observationColumns = [
    {
      title: lang === 'gu' ? 'શીર્ષક' : 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: lang === 'gu' ? 'ગંભીરતા' : 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (val) => {
        const color = val === 'Critical' ? 'red' : val === 'High' ? 'orange' : val === 'Medium' ? 'gold' : 'green';
        return <Tag color={color}>{val || '-'}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val) => <Tag>{val || '-'}</Tag>,
    },
    {
      title: lang === 'gu' ? 'તારીખ' : 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
  ];

  const statusLabel = auditInstance?.status
    ? <Tag color={statusColors[auditInstance.status] || 'default'}>{auditInstance.status}</Tag>
    : '-';

  const canEdit = auditInstance?.status === 'Draft' || auditInstance?.status === 'Returned';
  const canViewCertificate = auditInstance?.status === 'Closed';

  const getTimelineIcon = (action) => {
    if (action === 'submit' || action === 'Submit') return <ClockCircleOutlined />;
    if (action === 'approve' || action === 'Approve') return <CheckCircleOutlined style={{ color: '#4a7c59' }} />;
    if (action === 'return' || action === 'Return') return <CloseCircleOutlined style={{ color: '#b91c2c' }} />;
    return <ClockCircleOutlined />;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!auditInstance) {
    return (
      <Empty description={lang === 'gu' ? 'ઓડિટ મળ્યું નહીં' : 'Audit not found'} style={{ marginTop: 80 }} />
    );
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'મારા ઓડિટ' : 'My Audits', onClick: () => navigate('/auditor') },
            { title: auditInstance.entityName || '-' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/auditor')}>
              {lang === 'gu' ? 'પાછા' : 'Back'}
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {auditInstance.entityName || (lang === 'gu' ? 'ઓડિટ વિગત' : 'Audit Detail')}
            </Title>
          </Space>
          <Space>
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/auditor/audit/${auditInstanceId}`)}>
                {lang === 'gu' ? 'સંપાદિત કરો' : 'Edit'}
              </Button>
            )}
            {canViewCertificate && (
              <Button type="primary" icon={<FilePdfOutlined />} onClick={() => navigate(`/closure/certificate/${auditInstanceId}`)}>
                {lang === 'gu' ? 'પ્રમાણપત્ર જુઓ' : 'View Certificate'}
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          title={lang === 'gu' ? 'ઓડિટ માહિતી' : 'Audit Information'}
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
        >
          <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name'}>
            {auditInstance.entityName}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી પ્રકાર' : 'Entity Type'}>
            <Tag color={auditInstance.entityType === 'Branch' ? 'blue' : 'orange'}>
              {auditInstance.entityType}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}>
            {auditInstance.auditType}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'સ્થિતિ' : 'Status'}>
            {statusLabel}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'ઓડિટર' : 'Auditor'}>
            {auditInstance.assignedToName || auditInstance.auditorName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'નાણાકીય વર્ષ' : 'Financial Year'}>
            {auditInstance.financialYear || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'શરૂઆત તારીખ' : 'Start Date'}>
            {auditInstance.startDate ? dayjs(auditInstance.startDate).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'અંત તારીખ' : 'End Date'}>
            {auditInstance.endDate ? dayjs(auditInstance.endDate).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={lang === 'gu' ? 'છેલ્લો ફેરફાર' : 'Last Updated'}>
            {auditInstance.updatedAt ? dayjs(auditInstance.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {riskScore && (
        <div style={{ marginBottom: 16 }}>
          <RiskScorePanel riskScore={riskScore} />
        </div>
      )}

      {template && (
        <Card title={lang === 'gu' ? 'ઓડિટ પ્રતિભાવો' : 'Audit Responses'} style={{ marginBottom: 16 }}>
          <FormRenderer
            template={template}
            responses={responses}
            readOnly
            riskScore={riskScore}
            language={lang}
          />
        </Card>
      )}

      <Card title={lang === 'gu' ? 'નિરીક્ષણો' : 'Observations'} style={{ marginBottom: 16 }}>
        <Table
          columns={observationColumns}
          dataSource={observations}
          rowKey="_id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: lang === 'gu' ? 'કોઈ નિરીક્ષણ નથી' : 'No observations' }}
        />
      </Card>

      {attachments.length > 0 && (
        <Card title={lang === 'gu' ? 'જોડાણો' : 'Attachments'} style={{ marginBottom: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {attachments.map((file) => (
                <div key={file.id || file.uid} style={{ width: 120, height: 120, borderRadius: 6, overflow: 'hidden', border: '1px solid #e7e2dc' }}>
                  {(file.url || file.thumbUrl) ? (
                    <Image
                      src={file.url || file.thumbUrl}
                      alt={file.name || file.fileName}
                      width={120}
                      height={120}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{file.name || file.fileName}</Text>
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {workflowHistory.length > 0 && (
        <Card title={lang === 'gu' ? 'વર્કફ્લો ઇતિહાસ' : 'Workflow History'} style={{ marginBottom: 16 }}>
          <Timeline
            items={workflowHistory.map((entry) => ({
              dot: getTimelineIcon(entry.action),
              children: (
                <div>
                  <Text strong>{entry.action || entry.status}</Text>
                  <br />
                  {entry.actorName && (
                    <Text type="secondary">
                      {lang === 'gu' ? 'દ્વારા' : 'By'}: {entry.actorName}
                    </Text>
                  )}
                  {entry.comment && (
                    <div>
                      <Text type="secondary" italic>
                        "{entry.comment}"
                      </Text>
                    </div>
                  )}
                  {entry.createdAt && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(entry.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
};

export default AuditDetail;
