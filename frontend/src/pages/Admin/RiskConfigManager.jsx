import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Select, Space, Typography, Card, Breadcrumb, Modal,
  Spin, Empty, Popconfirm, Input, InputNumber, ColorPicker, Divider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const RiskConfigManager = () => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditTypes, setAuditTypes] = useState([]);
  const [selectedAuditType, setSelectedAuditType] = useState(null);

  const [bands, setBands] = useState([]);
  const [rules, setRules] = useState([]);
  const [config, setConfig] = useState(null);
  const [editingBandKey, setEditingBandKey] = useState(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleDraft, setRuleDraft] = useState({ condition: '', forceBand: '' });

  const fetchAuditTypes = useCallback(async () => {
    try {
      const res = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchAuditTypes();
  }, [fetchAuditTypes]);

  const fetchConfig = useCallback(async (auditTypeId) => {
    if (!auditTypeId) return;
    setLoading(true);
    try {
      const res = await apiFunctions.riskConfigs.list({ auditTypeId });
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        const found = data[0];
        setConfig(found || null);
        setBands((found?.bandDefinitions || found?.bands || []).map((band) => ({
          ...band,
          id: band.id || band._id,
          color: band.bandColor || band.color || '#1890ff',
        })));
        setRules((found?.specialRules || found?.rules || []).map((rule) => ({
          ...rule,
          id: rule.id || rule._id,
        })));
      } else {
        setConfig(data);
        setBands((data?.bandDefinitions || data?.bands || []).map((band) => ({
          ...band,
          id: band.id || band._id,
          color: band.bandColor || band.color || '#1890ff',
        })));
        setRules((data?.specialRules || data?.rules || []).map((rule) => ({
          ...rule,
          id: rule.id || rule._id,
        })));
      }
    } catch {
      setBands([]);
      setRules([]);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAuditType) {
      fetchConfig(selectedAuditType);
    }
  }, [selectedAuditType, fetchConfig]);

  const handleBandChange = (index, field, value) => {
    setBands((prev) =>
      prev.map((band, i) => (i === index ? { ...band, [field]: value } : band)),
    );
  };

  const handleAddBand = () => {
    setBands((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        bandName: `Band ${prev.length + 1}`,
        color: '#1890ff',
        minScore: 0,
        maxScore: 100,
        description: '',
      },
    ]);
    setEditingBandKey(bands.length);
  };

  const handleDeleteBand = (index) => {
    setBands((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setRuleDraft({ condition: '', forceBand: '' });
    setRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    const { condition, forceBand } = ruleDraft;
    if (!condition || !forceBand) {
      message.error('Condition and Force Band are required');
      return;
    }
    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          (r.id || r._id) === (editingRule.id || editingRule._id)
            ? { ...r, condition, forceBand }
            : r,
        ),
      );
    } else {
      setRules((prev) => [
        ...prev,
        { id: `rule_${Date.now()}`, condition, forceBand },
      ]);
    }
    setRuleModalOpen(false);
    setEditingRule(null);
    setRuleDraft({ condition: '', forceBand: '' });
  };

  const handleDeleteRule = (ruleId) => {
    setRules((prev) => prev.filter((r) => (r.id || r._id) !== ruleId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        auditType: selectedAuditType,
        level: config?.level || 'template',
        name: config?.name || 'Risk Configuration',
        weight: config?.weight || 1,
        formulaRef: config?.formulaRef || 'weighted_sum_normalized',
        bandDefinitions: bands.map(({ color, id, _id, ...band }) => ({
          ...band,
          bandColor: color || band.bandColor || '#1890ff',
        })),
        specialRules: rules.map(({ id, _id, ...rule }) => rule),
      };
      if (config?.id) {
        await apiFunctions.riskConfigs.update(config.id, payload);
      } else {
        await apiFunctions.riskConfigs.create(payload);
      }
      message.success(t('operationSuccess', 'Risk configuration saved'));
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save risk config');
    } finally {
      setSaving(false);
    }
  };

  const bandColumns = [
    {
      title: 'Band Name',
      dataIndex: 'bandName',
      key: 'bandName',
      width: 180,
      render: (v, record, index) => (
        <Input
          value={v}
          size="small"
          onChange={(e) => handleBandChange(index, 'bandName', e.target.value)}
          placeholder="e.g. Low"
        />
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 110,
      render: (v, record, index) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker
            value={v}
            size="small"
            onChange={(color) => handleBandChange(index, 'color', color.toHexString())}
          />
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: 2,
              background: v,
            }}
          />
        </div>
      ),
    },
    {
      title: 'Min Score',
      dataIndex: 'minScore',
      key: 'minScore',
      width: 120,
      render: (v, record, index) => (
        <InputNumber
          value={v}
          size="small"
          min={0}
          max={100}
          style={{ width: '100%' }}
          onChange={(val) => handleBandChange(index, 'minScore', val)}
        />
      ),
    },
    {
      title: 'Max Score',
      dataIndex: 'maxScore',
      key: 'maxScore',
      width: 120,
      render: (v, record, index) => (
        <InputNumber
          value={v}
          size="small"
          min={0}
          max={100}
          style={{ width: '100%' }}
          onChange={(val) => handleBandChange(index, 'maxScore', val)}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v, record, index) => (
        <Input
          value={v}
          size="small"
          onChange={(e) => handleBandChange(index, 'description', e.target.value)}
          placeholder="Optional description"
        />
      ),
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 80,
      render: (_, __, index) => (
        <Popconfirm title="Remove band?" onConfirm={() => handleDeleteBand(index)}>
          <Button size="small" danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>
      ),
    },
  ];

  const ruleColumns = [
    {
      title: 'Condition Expression',
      dataIndex: 'condition',
      key: 'condition',
      ellipsis: true,
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: 'Force Band',
      dataIndex: 'forceBand',
      key: 'forceBand',
      width: 160,
      render: (v) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
           <Button
             size="small"
             icon={<EditOutlined />}
             onClick={() => {
               setEditingRule(record);
               setRuleDraft({ condition: record.condition || '', forceBand: record.forceBand || '' });
               setRuleModalOpen(true);
             }}
          />
          <Popconfirm title="Delete rule?" onConfirm={() => handleDeleteRule(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} type="text" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <Text>{t('admin', 'Admin')}</Text> },
            { title: <Text>{t('riskConfig', 'Risk Configuration')}</Text> },
          ]}
        />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Text strong style={{ whiteSpace: 'nowrap' }}>{t('auditType', 'Audit Type')}:</Text>
          <Select
            showSearch
            placeholder="Select audit type"
            style={{ width: 300 }}
            value={selectedAuditType}
            onChange={setSelectedAuditType}
            optionFilterProp="label"
            allowClear
            options={auditTypes.map((at) => ({
              label: at.name || at.code,
              value: at.id || at._id,
            }))}
          />
        </div>
      </Card>

      {!selectedAuditType ? (
        <Card>
          <Empty description="Select an audit type above to configure risk bands and rules" />
        </Card>
      ) : (
        <Spin spinning={loading}>
          <Card
            title={
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                Risk Bands
              </span>
            }
            style={{ marginBottom: 16 }}
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddBand}>
                Add Band
              </Button>
            }
          >
            <Table
              rowKey="_id"
              columns={bandColumns}
              dataSource={bands}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="No risk bands defined" /> }}
              summary={() => (
                bands.length === 0 ? null : (
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={2} align="right">
                      <Text type="secondary">Total Bands: {bands.length}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell colSpan={4} />
                  </Table.Summary.Row>
                )
              )}
            />
          </Card>

          <Card
            title="Special Rules"
            style={{ marginBottom: 16 }}
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddRule}>
                Add Rule
              </Button>
            }
          >
            <Table
              rowKey="_id"
              columns={ruleColumns}
              dataSource={rules}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="No special rules defined" /> }}
            />
          </Card>

          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              {t('save', 'Save Configuration')}
            </Button>
          </div>

          <Modal
            title={editingRule ? 'Edit Rule' : 'Add Rule'}
            open={ruleModalOpen}
            onOk={handleSaveRule}
            onCancel={() => { setRuleModalOpen(false); setEditingRule(null); setRuleDraft({ condition: '', forceBand: '' }); }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Condition Expression</Text>
                <Input
                  value={ruleDraft.condition}
                  onChange={(event) => setRuleDraft((prev) => ({ ...prev, condition: event.target.value }))}
                  placeholder="e.g. OVERALL_SCORE >= 70"
                />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Force Band</Text>
                <Select
                  style={{ width: '100%' }}
                  value={ruleDraft.forceBand || undefined}
                  onChange={(value) => setRuleDraft((prev) => ({ ...prev, forceBand: value }))}
                  placeholder="Select band"
                  options={bands.map((b) => ({ label: b.bandName, value: b.bandName }))}
                />
              </div>
            </div>
          </Modal>

          {/* Inline Modal import for rule add */}
          <Modal
            title="Rule Configuration"
            open={false}
          />
        </Spin>
      )}
    </div>
  );
};

export default RiskConfigManager;
