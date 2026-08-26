import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tag, Button, Select, Space, Typography, Breadcrumb,
  Spin, Empty, Popconfirm, Input, InputNumber, Switch, Checkbox,
  Divider, Tooltip, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ApartmentOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const ACTOR_ROLES = [
  'AUDITOR', 'BRANCH_MANAGER', 'HIA_REVIEWER', 'COMPLIANCE_OFFICER',
  'ADMIN', 'SUPER_ADMIN', 'PLANNER', 'CLOSURE_OFFICER', 'SYSTEM',
];

const ALLOWED_ACTIONS = [
  { key: 'APPROVE', label: 'Approve' },
  { key: 'RETURN', label: 'Return' },
  { key: 'ESCALATE', label: 'Escalate' },
  { key: 'REJECT', label: 'Reject' },
  { key: 'REQUEST_INFO', label: 'Request Info' },
  { key: 'OVERRIDE', label: 'Override' },
];

const SUBJECT_TYPES = [
  { label: 'Audit Plan', value: 'AUDIT_PLAN' },
  { label: 'Audit Instance', value: 'AUDIT_INSTANCE' },
  { label: 'Observation', value: 'OBSERVATION' },
];

const WorkflowDesigner = () => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditTypes, setAuditTypes] = useState([]);

  const [selectedAuditType, setSelectedAuditType] = useState(null);
  const [selectedSubjectType, setSelectedSubjectType] = useState('AUDIT_INSTANCE');
  const [stages, setStages] = useState([]);
  const [workflowName, setWorkflowName] = useState('');

  const fetchAuditTypes = useCallback(async () => {
    try {
      const res = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchAuditTypes(); }, [fetchAuditTypes]);

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        id: `stage_${Date.now()}`,
        name: `Stage ${prev.length + 1}`,
        sequence: prev.length + 1,
        actorRole: null,
        allowedActions: ['APPROVE'],
        slaHours: 24,
        workingDaysOnly: true,
        entryCondition: '',
        isParallelGroup: false,
        fallbackRole: null,
      },
    ]);
  };

  const removeStage = (index) => {
    setStages((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 }))
    );
  };

  const moveStage = (index, direction) => {
    setStages((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
  };

  const updateStage = (index, field, value) => {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleActionToggle = (index, action, checked) => {
    setStages((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const actions = checked
          ? [...s.allowedActions, action]
          : s.allowedActions.filter((a) => a !== action);
        return { ...s, allowedActions: actions };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedAuditType) {
      message.error('Please select an audit type');
      return;
    }
    if (stages.length === 0) {
      message.error('Add at least one stage');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        auditTypeId: selectedAuditType,
        subjectType: selectedSubjectType,
        name: workflowName || `Workflow_${selectedAuditType}`,
        stages,
      };
      message.success(t('operationSuccess', 'Workflow saved successfully'));
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <Text>{t('admin', 'Admin')}</Text> },
            { title: <Text>Workflow Designer</Text> },
          ]}
        />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('auditType', 'Audit Type')}</Text>
            <Select
              showSearch
              placeholder="Select audit type"
              style={{ width: 240 }}
              value={selectedAuditType}
              onChange={setSelectedAuditType}
              optionFilterProp="label"
              options={auditTypes.map((at) => ({ label: at.name || at.code, value: at.id }))}
            />
          </Col>
          <Col>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Subject Type</Text>
            <Select
              style={{ width: 200 }}
              value={selectedSubjectType}
              onChange={setSelectedSubjectType}
              options={SUBJECT_TYPES}
            />
          </Col>
          <Col>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Workflow Name</Text>
            <Input
              style={{ width: 240 }}
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g. Statutory Audit Flow"
            />
          </Col>
        </Row>
      </Card>

      {!selectedAuditType ? (
        <Card>
          <Empty description="Select an audit type and subject type to design workflow stages" />
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              <ApartmentOutlined style={{ marginRight: 8 }} />
              Workflow Stages ({stages.length})
            </Title>
            <Space>
              <Button icon={<PlusOutlined />} type="primary" onClick={addStage}>Add Stage</Button>
              <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={handleSave}>{t('save', 'Save Workflow')}</Button>
            </Space>
          </div>

          {stages.length === 0 ? (
            <Card>
              <Empty description="No stages defined">
                <Button type="primary" icon={<PlusOutlined />} onClick={addStage}>Add Stage</Button>
              </Empty>
            </Card>
          ) : (
            stages.map((stage, index) => (
              <Card
                key={stage.id}
                style={{ marginBottom: 16 }}
                size="small"
                title={
                  <Space>
                    <BranchesOutlined />
                    <Input
                      value={stage.name}
                      size="small"
                      style={{ width: 200, fontWeight: 600 }}
                      variant="borderless"
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                    />
                    <Tag color="blue">Seq: {stage.sequence}</Tag>
                    {stage.isParallelGroup && <Tag color="purple">Parallel</Tag>}
                  </Space>
                }
                extra={
                  <Space size="small">
                    <Tooltip title="Move Up">
                      <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0}
                        onClick={() => moveStage(index, -1)} />
                    </Tooltip>
                    <Tooltip title="Move Down">
                      <Button size="small" icon={<ArrowDownOutlined />} disabled={index === stages.length - 1}
                        onClick={() => moveStage(index, 1)} />
                    </Tooltip>
                    <Popconfirm title="Remove this stage?" onConfirm={() => removeStage(index)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Actor Role</Text>
                    <Select
                      style={{ width: '100%' }}
                      value={stage.actorRole}
                      onChange={(v) => updateStage(index, 'actorRole', v)}
                      placeholder="Select actor role"
                      options={ACTOR_ROLES.map((r) => ({ label: r.replace(/_/g, ' '), value: r }))}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Fallback Role</Text>
                    <Select
                      style={{ width: '100%' }}
                      value={stage.fallbackRole}
                      onChange={(v) => updateStage(index, 'fallbackRole', v)}
                      placeholder="Optional fallback"
                      allowClear
                      options={ACTOR_ROLES.map((r) => ({ label: r.replace(/_/g, ' '), value: r }))}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>SLA (Hours)</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={stage.slaHours}
                      onChange={(v) => updateStage(index, 'slaHours', v)}
                      min={1}
                      max={720}
                      addonAfter={
                        <Switch
                          size="small"
                          checkedChildren="WD"
                          unCheckedChildren="All"
                          checked={stage.workingDaysOnly}
                          onChange={(v) => updateStage(index, 'workingDaysOnly', v)}
                        />
                      }
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                <Text strong style={{ display: 'block', marginBottom: 8 }}>Allowed Actions</Text>
                <Space wrap>
                  {ALLOWED_ACTIONS.map((action) => (
                    <Checkbox
                      key={action.key}
                      checked={stage.allowedActions.includes(action.key)}
                      onChange={(e) => handleActionToggle(index, action.key, e.target.checked)}
                    >
                      {action.label}
                    </Checkbox>
                  ))}
                </Space>

                <Divider style={{ margin: '12px 0' }} />

                <Row gutter={[16, 8]} align="middle">
                  <Col xs={24} sm={16}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Entry Condition (Expression)</Text>
                    <Input
                      value={stage.entryCondition}
                      onChange={(e) => updateStage(index, 'entryCondition', e.target.value)}
                      placeholder="e.g. OVERALL_SCORE >= 40 || OBSERVATION_COUNT > 0"
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ marginTop: 22 }}>
                      <Switch
                        checked={stage.isParallelGroup}
                        onChange={(v) => updateStage(index, 'isParallelGroup', v)}
                        checkedChildren="Parallel"
                        unCheckedChildren="Sequential"
                      />
                      <Text style={{ marginLeft: 8 }}>Group</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default WorkflowDesigner;
