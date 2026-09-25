import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Breadcrumb, Layout, Button, Modal, Progress, Tag, Spin,
  Typography, Space, List, Badge, Empty, Steps, Alert, Tooltip, Divider,
  Card, Form, Input, Select, DatePicker,
} from 'antd';
import {
  SaveOutlined, SendOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, CloseCircleOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, LeftOutlined, RightOutlined, WifiOutlined,
  PlusOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import FormRenderer from '../../components/common/FormRenderer';
import RiskScorePanel from '../../components/common/RiskScorePanel';
import { normalizeTemplate, getFieldNonCompliance } from '../../utils/normalizeTemplate';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { TextArea } = Input;

const severityOptions = [
  { value: 'Low', labelEn: 'Low', labelGu: 'નીચું' },
  { value: 'Medium', labelEn: 'Medium', labelGu: 'મધ્યમ' },
  { value: 'High', labelEn: 'High', labelGu: 'ઉચ્ચ' },
  { value: 'Critical', labelEn: 'Critical', labelGu: 'ગંભીર' },
];

const observationStatusColor = {
  Open: 'red',
  PartiallyComplied: 'orange',
  Complied: 'green',
  Verified: 'blue',
  AcceptedRisk: 'purple',
};

const sectionStatusIcons = {
  completed: <CheckCircleOutlined style={{ color: '#4a7c59' }} />,
  partial: <ExclamationCircleOutlined style={{ color: '#c77d2e' }} />,
  incomplete: <CloseCircleOutlined style={{ color: '#cfc9c0' }} />,
};

const getSectionCompletion = (section, responses) => {
  const fields = section.fields || [];
  if (fields.length === 0) return 'completed';
  let filled = 0;
  let mandatoryTotal = 0;
  let mandatoryFilled = 0;
  fields.forEach((f) => {
    const val = responses?.[f.code];
    if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      filled++;
      if (f.mandatory) mandatoryFilled++;
    }
    if (f.mandatory) mandatoryTotal++;
  });
  const mandatoryRatio = mandatoryTotal > 0 ? mandatoryFilled / mandatoryTotal : 1;
  const overallRatio = filled / fields.length;
  if (mandatoryRatio >= 1 && overallRatio >= 0.9) return 'completed';
  if (mandatoryRatio >= 0.5 || overallRatio >= 0.3) return 'partial';
  return 'incomplete';
};

const AuditExecution = () => {
  const { auditInstanceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [responses, setResponses] = useState({});
  const [auditInstance, setAuditInstance] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [riskScore, setRiskScore] = useState(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const debounceRef = useRef(null);
  const currentResponsesRef = useRef({});
  const [observations, setObservations] = useState([]);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsSubmitting, setObsSubmitting] = useState(false);
  const [obsForm] = Form.useForm();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchForm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.audit.getForm(auditInstanceId);
      const data = res.data?.data || res.data;
      const normalizedTemplate = normalizeTemplate(data.template, []);
      setTemplate(normalizedTemplate);
      setAuditInstance(data.instance || data.auditInstance);
      const respMap = {};
      (data.responses || []).forEach((r) => {
        respMap[r.fieldCode] = r.value;
      });
      setResponses(respMap);
      currentResponsesRef.current = respMap;
      setSections(normalizedTemplate?.sections || []);
    } catch {
      message.error(lang === 'gu' ? 'ફોર્મ લોડ કરવામાં નિષ્ફળ' : 'Failed to load form');
      navigate('/auditor');
    } finally {
      setLoading(false);
    }
  }, [auditInstanceId, lang, navigate]);

  const fetchRiskScore = useCallback(async () => {
    try {
      const res = await apiFunctions.audit.getRiskScore(auditInstanceId);
      setRiskScore(res.data?.data || res.data);
    } catch {
      // silent
    }
  }, [auditInstanceId]);

  const fetchObservations = useCallback(async () => {
    try {
      const res = await apiFunctions.compliance.listObservations({ auditInstanceId });
      setObservations(res.data?.data || res.data || []);
    } catch {
      // silent
    }
  }, [auditInstanceId]);

  useEffect(() => {
    fetchForm();
    fetchRiskScore();
    fetchObservations();
  }, [fetchForm, fetchRiskScore, fetchObservations]);

  const openObsModal = (prefill = null) => {
    obsForm.resetFields();
    if (prefill) {
      obsForm.setFieldsValue(prefill);
    } else {
      obsForm.setFieldsValue({ severity: 'Medium', targetDate: dayjs().add(15, 'day') });
    }
    setObsModalOpen(true);
  };

  const handleRaiseObservation = async (values) => {
    setObsSubmitting(true);
    try {
      await apiFunctions.audit.createObservation(auditInstanceId, {
        fieldCode: values.fieldCode || undefined,
        sectionCode: values.sectionCode || undefined,
        title: values.title,
        description: values.description,
        severity: values.severity,
        targetDate: values.targetDate ? values.targetDate.toISOString() : undefined,
      });
      message.success(lang === 'gu' ? 'નિરિક્ષણ ઉમેરાયું' : 'Observation raised');
      setObsModalOpen(false);
      obsForm.resetFields();
      fetchObservations();
    } catch {
      message.error(lang === 'gu' ? 'નિરિક્ષણ ઉમેરવામાં નિષ્ફળ' : 'Failed to raise observation');
    } finally {
      setObsSubmitting(false);
    }
  };

  const saveResponses = useCallback(async (respMap) => {
    const payload = Object.entries(respMap).map(([fieldCode, value]) => ({
      fieldCode,
      value,
    }));
    try {
      await apiFunctions.audit.saveResponses(auditInstanceId, payload);
    } catch {
      // auto-save failures are silent
    }
  }, [auditInstanceId]);

  const handleFieldChange = useCallback(({ sectionCode, fieldCode, value }) => {
    setResponses((prev) => {
      const updated = { ...prev, [fieldCode]: value };
      currentResponsesRef.current = updated;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveResponses(updated);
      }, 500);
      return updated;
    });
  }, [saveResponses]);

  const handleManualSave = async () => {
    setSaving(true);
    try {
      await saveResponses(currentResponsesRef.current);
      await fetchRiskScore();
      message.success(lang === 'gu' ? 'સાચવાઈ ગયું' : 'Saved successfully');
    } catch {
      message.error(lang === 'gu' ? 'સાચવવામાં નિષ્ફળ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      await apiFunctions.audit.submit(auditInstanceId);
      message.success(lang === 'gu' ? 'સમીક્ષા માટે સબમિટ થયું' : 'Submitted for review');
      setReviewModalVisible(false);
      navigate('/auditor');
    } catch {
      message.error(lang === 'gu' ? 'સબમિટ નિષ્ફળ' : 'Submit failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const sectionCompletions = useMemo(() => {
    return sections.map((s) => getSectionCompletion(s, responses));
  }, [sections, responses]);

  const overallCompletion = useMemo(() => {
    if (sections.length === 0) return 0;
    const completed = sectionCompletions.filter((s) => s === 'completed').length;
    const partial = sectionCompletions.filter((s) => s === 'partial').length;
    return Math.round(((completed + partial * 0.5) / sections.length) * 100);
  }, [sections, sectionCompletions]);

  const missingMandatoryFields = useMemo(() => {
    const missing = [];
    sections.forEach((section) => {
      (section.fields || []).forEach((f) => {
        if (f.mandatory) {
          const val = responses?.[f.code];
          if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
            missing.push({
              sectionTitle: section.title || section.code,
              fieldLabel: f.label || f.code,
              fieldCode: f.code,
            });
          }
        }
      });
    });
    return missing;
  }, [sections, responses]);

  const flatFields = useMemo(() => {
    const normalized = normalizeTemplate(template, []);
    return (normalized?.sections || []).flatMap((section) =>
      (section.fields || []).map((field) => ({
        ...field,
        sectionCode: section.code,
        sectionTitle: section.title || section.code,
      }))
    );
  }, [template]);

  const existingFieldCodes = useMemo(
    () => new Set(observations.map((o) => o.fieldCode).filter(Boolean)),
    [observations]
  );

  const detectedIssues = useMemo(
    () =>
      flatFields
        .map((field) => ({
          field,
          severity: getFieldNonCompliance(field, responses?.[field.code]),
        }))
        .filter((item) => item.severity && !existingFieldCodes.has(item.field.code)),
    [flatFields, responses, existingFieldCodes]
  );

  const goToSection = (index) => {
    if (index >= 0 && index < sections.length) {
      setActiveSectionIndex(index);
    }
  };

  const currentSection = sections[activeSectionIndex];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip={lang === 'gu' ? 'ફોર્મ લોડ થઈ રહ્યું છે...' : 'Loading form...'} />
      </div>
    );
  }

  if (!template) {
    return (
      <Empty
        description={lang === 'gu' ? 'ફોર્મ મળ્યું નહીં' : 'Form not found'}
        style={{ marginTop: 80 }}
      />
    );
  }

  const renderSectionNav = () => (
    <div style={{ padding: '12px 8px' }}>
      <Text strong style={{ padding: '0 8px', display: 'block', marginBottom: 12 }}>
        {lang === 'gu' ? 'વિભાગો' : 'Sections'}
      </Text>
      <List
        size="small"
        dataSource={sections}
        renderItem={(section, index) => {
          const completion = sectionCompletions[index];
          const sectionRisk = riskScore?.sectionScores?.[section.code];
          return (
            <List.Item
              key={section.code || index}
              onClick={() => goToSection(index)}
              style={{
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 4,
                background: activeSectionIndex === index ? '#ebf8ff' : 'transparent',
                border: activeSectionIndex === index ? '1px solid #d92332' : '1px solid transparent',
              }}
            >
              <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size={6}>
                  <Badge
                    status={completion === 'completed' ? 'success' : completion === 'partial' ? 'processing' : 'default'}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: activeSectionIndex === index ? 600 : 400,
                      color: activeSectionIndex === index ? '#141416' : undefined,
                    }}
                  >
                    {lang === 'gu' && section.titleGu ? section.titleGu : section.title || section.code}
                  </Text>
                </Space>
                {sectionRisk != null && (
                  <Tag
                    color={sectionRisk.overallScore >= 70 ? 'red' : sectionRisk.overallScore >= 40 ? 'gold' : 'green'}
                    style={{ fontSize: 11 }}
                  >
                    {sectionRisk.overallScore}%
                  </Tag>
                )}
              </Space>
            </List.Item>
          );
        }}
      />
    </div>
  );

  const renderObservationModal = () => (
    <Modal
      title={lang === 'gu' ? 'નિરિક્ષણ ઉમેરો' : 'Raise Observation'}
      open={obsModalOpen}
      onCancel={() => setObsModalOpen(false)}
      onOk={() => obsForm.submit()}
      confirmLoading={obsSubmitting}
      okText={lang === 'gu' ? 'સાચવો' : 'Save'}
      cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
      width={620}
    >
      <Form form={obsForm} layout="vertical" onFinish={handleRaiseObservation}>
        <Form.Item name="fieldCode" label={lang === 'gu' ? 'સંબંધિત પ્રશ્ન' : 'Linked Question'}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={lang === 'gu' ? 'પ્રશ્ન પસંદ કરો' : 'Select a question (optional)'}
            options={flatFields.map((f) => ({
              value: f.code,
              label: `${f.sectionTitle} — ${f.label}`,
            }))}
            onChange={(val) => {
              const field = flatFields.find((f) => f.code === val);
              if (field) {
                obsForm.setFieldsValue({
                  sectionCode: field.sectionCode,
                  title: obsForm.getFieldValue('title') || field.label,
                });
              }
            }}
          />
        </Form.Item>
        <Form.Item name="sectionCode" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="title"
          label={lang === 'gu' ? 'શીર્ષક' : 'Title'}
          rules={[{ required: true, message: lang === 'gu' ? 'શીર્ષક જરૂરી છે' : 'Title is required' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label={lang === 'gu' ? 'વર્ણન' : 'Description'}>
          <TextArea rows={4} />
        </Form.Item>
        <Form.Item
          name="severity"
          label={lang === 'gu' ? 'ગંભીરતા' : 'Severity'}
          rules={[{ required: true, message: lang === 'gu' ? 'ગંભીરતા જરૂરી છે' : 'Severity is required' }]}
        >
          <Select
            options={severityOptions.map((s) => ({
              value: s.value,
              label: lang === 'gu' ? s.labelGu : s.labelEn,
            }))}
          />
        </Form.Item>
        <Form.Item name="targetDate" label={lang === 'gu' ? 'લક્ષ્ય તારીખ' : 'Target Date'}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderReviewModal = () => (
    <Modal
      title={lang === 'gu' ? 'સમીક્ષા અને સબમિટ' : 'Review & Submit'}
      open={reviewModalVisible}
      onCancel={() => setReviewModalVisible(false)}
      footer={null}
      width={720}
      style={{ top: 20 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Progress
          percent={overallCompletion}
          status={missingMandatoryFields.length > 0 ? 'exception' : 'active'}
          format={(pct) => `${pct}%`}
        />
        <Text strong>
          {lang === 'gu' ? 'વિભાગોની સ્થિતિ' : 'Section Status'}
        </Text>
        <List
          size="small"
          dataSource={sections}
          renderItem={(section, index) => {
            const completion = sectionCompletions[index];
            const sectionRisk = riskScore?.sectionScores?.[section.code];
            return (
              <List.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    {sectionStatusIcons[completion]}
                    <Text>
                      {lang === 'gu' && section.titleGu ? section.titleGu : section.title || section.code}
                    </Text>
                  </Space>
                  <Space>
                    <Tag color={completion === 'completed' ? 'success' : completion === 'partial' ? 'warning' : 'default'}>
                      {completion === 'completed'
                        ? lang === 'gu' ? 'પૂર્ણ' : 'Complete'
                        : completion === 'partial'
                        ? lang === 'gu' ? 'આંશિક' : 'Partial'
                        : lang === 'gu' ? 'અપૂર્ણ' : 'Incomplete'}
                    </Tag>
                    {sectionRisk != null && (
                      <Tag color={sectionRisk.overallScore >= 70 ? 'red' : sectionRisk.overallScore >= 40 ? 'gold' : 'green'}>
                        {sectionRisk.overallScore}%
                      </Tag>
                    )}
                  </Space>
                </Space>
              </List.Item>
            );
          }}
        />
        {missingMandatoryFields.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={lang === 'gu' ? 'ફરજિયાત ફીલ્ડ અપૂર્ણ' : 'Missing Mandatory Fields'}
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {missingMandatoryFields.map((mf, i) => (
                  <li key={i}>
                    <Text strong>{mf.sectionTitle}</Text>
                    <Text> - {mf.fieldLabel}</Text>
                  </li>
                ))}
              </ul>
            }
            style={{ marginBottom: 8 }}
          />
        )}
        {riskScore && (
          <RiskScorePanel riskScore={riskScore} />
        )}
        <div style={{ textAlign: 'right', borderTop: '1px solid #e7e2dc', paddingTop: 16 }}>
          <Space>
            <Button onClick={() => setReviewModalVisible(false)}>
              {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitLoading}
              onClick={handleSubmit}
              disabled={missingMandatoryFields.length > 0}
            >
              {lang === 'gu' ? 'સમીક્ષા માટે સબમિટ કરો' : 'Submit for Review'}
            </Button>
          </Space>
        </div>
      </Space>
    </Modal>
  );

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'મારા ઓડિટ' : 'My Audits', onClick: () => navigate('/auditor') },
            { title: auditInstance?.entityName || '-' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={3} style={{ margin: 0 }}>
            {auditInstance?.entityName || (lang === 'gu' ? 'ઓડિટ ફોર્મ' : 'Audit Form')}
          </Title>
          <Space>
            <Progress
              percent={overallCompletion}
              size="small"
              style={{ width: 120 }}
              status={missingMandatoryFields.length > 0 ? 'exception' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {overallCompletion}% {lang === 'gu' ? 'પૂર્ણ' : 'Complete'}
            </Text>
          </Space>
        </div>
      </div>

      {!online && (
        <Alert
          message={lang === 'gu' ? 'તમે ઑફલાઇન છો. ફેરફારો સ્થાનિક રીતે સાચવાશે.' : 'You are offline. Changes will be saved locally.'}
          type="warning"
          showIcon
          banner
          style={{ marginBottom: 12 }}
        />
      )}

      <Layout style={{ background: 'transparent', minHeight: 'calc(100vh - 220px)' }}>
        <Sider
          width={260}
          collapsedWidth={0}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          style={{ background: '#fff', borderRadius: 8, marginRight: 16, border: '1px solid #e7e2dc' }}
          breakpoint="lg"
        >
          {renderSectionNav()}
        </Sider>

        <Content style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid #e7e2dc', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Button
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              type="text"
            />
            <Space>
              <Button
                disabled={activeSectionIndex === 0}
                icon={<LeftOutlined />}
                onClick={() => goToSection(activeSectionIndex - 1)}
              >
                {lang === 'gu' ? 'પાછળ' : 'Previous'}
              </Button>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {activeSectionIndex + 1} / {sections.length}
              </Text>
              <Button
                disabled={activeSectionIndex >= sections.length - 1}
                icon={<RightOutlined />}
                onClick={() => goToSection(activeSectionIndex + 1)}
              >
                {lang === 'gu' ? 'આગળ' : 'Next'}
              </Button>
            </Space>
          </div>

          {currentSection ? (
            <FormRenderer
              key={currentSection.code}
              template={{ sections: [currentSection] }}
              responses={responses}
              onChange={handleFieldChange}
              riskScore={riskScore}
              language={lang}
            />
          ) : (
            <Empty description={lang === 'gu' ? 'કોઈ વિભાગ નથી' : 'No sections'} />
          )}
        </Content>
      </Layout>

      <Card
        size="small"
        style={{ marginTop: 16, border: '1px solid #e7e2dc' }}
        title={
          <Space>
            <WarningOutlined style={{ color: '#d92332' }} />
            <Text strong>{lang === 'gu' ? 'નિરિક્ષણો' : 'Observations'}</Text>
            <Badge count={observations.length} size="small" style={{ backgroundColor: '#d92332' }} />
          </Space>
        }
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openObsModal()}>
            {lang === 'gu' ? 'નિરિક્ષણ ઉમેરો' : 'Raise Observation'}
          </Button>
        }
      >
        {detectedIssues.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={lang === 'gu' ? 'સંભવિત નોન-કમ્પ્લાયન્સ મળ્યું' : 'Potential non-compliance detected'}
            description={
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {detectedIssues.map(({ field, severity }) => (
                  <div
                    key={field.code}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {field.sectionTitle} — {field.label}
                    </Text>
                    <Space>
                      <Tag color={severity === 'High' ? 'red' : 'orange'}>{severity}</Tag>
                      <Button
                        size="small"
                        onClick={() =>
                          openObsModal({
                            fieldCode: field.code,
                            sectionCode: field.sectionCode,
                            title: field.label,
                            description: `${lang === 'gu' ? 'અનુપાલન નથી' : 'Non-compliance'}: ${field.label}`,
                            severity,
                            targetDate: dayjs().add(15, 'day'),
                          })
                        }
                      >
                        {lang === 'gu' ? 'ઉમેરો' : 'Raise'}
                      </Button>
                    </Space>
                  </div>
                ))}
              </Space>
            }
          />
        )}
        {observations.length > 0 ? (
          <List
            size="small"
            dataSource={observations}
            renderItem={(obs) => (
              <List.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>{obs.title}</Text>
                    <Tag color={observationStatusColor[obs.status] || 'default'}>{obs.status}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {obs.severity || ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          detectedIssues.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={lang === 'gu' ? 'કોઈ નિરિક્ષણ નથી' : 'No observations yet'}
            />
          )
        )}
      </Card>

      <div style={{
        marginTop: 16,
        padding: '16px 24px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e7e2dc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <RiskScorePanel riskScore={riskScore} />
        <Space>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleManualSave}
            size="large"
          >
            {lang === 'gu' ? 'સાચવો અને ચાલુ રાખો' : 'Save & Continue'}
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="large"
            onClick={() => setReviewModalVisible(true)}
          >
            {lang === 'gu' ? 'સમીક્ષા અને સબમિટ' : 'Review & Submit'}
          </Button>
        </Space>
      </div>

      {renderReviewModal()}
      {renderObservationModal()}
    </div>
  );
};

export default AuditExecution;
