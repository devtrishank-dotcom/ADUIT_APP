import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Tooltip, Tree, Drawer, Form, Input,
  InputNumber, Switch, Slider, Tabs, Divider, Row, Col, Layout, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined,
  SendOutlined, EyeOutlined, ArrowUpOutlined, ArrowDownOutlined,
  HolderOutlined, FolderOutlined, FileOutlined, LeftOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { Sider, Content: LayoutContent } = Layout;
const { TreeNode } = Tree;

const FIELD_TYPES = [
  'TEXT_SHORT', 'TEXT_LONG', 'NUMBER', 'CURRENCY', 'PERCENTAGE',
  'DATE', 'DATE_RANGE', 'DROPDOWN', 'MULTI_SELECT', 'RADIO_YN',
  'CHECKBOX_GROUP', 'GRID', 'FILE_ATTACH', 'IMAGE', 'COMPUTED', 'SIGNATURE',
];

const FIELD_TYPE_LABELS = {
  TEXT_SHORT: 'Text (Short)',
  TEXT_LONG: 'Text (Long)',
  NUMBER: 'Number',
  CURRENCY: 'Currency',
  PERCENTAGE: 'Percentage',
  DATE: 'Date',
  DATE_RANGE: 'Date Range',
  DROPDOWN: 'Dropdown',
  MULTI_SELECT: 'Multi Select',
  RADIO_YN: 'Radio Y/N',
  CHECKBOX_GROUP: 'Checkbox Group',
  GRID: 'Grid / Table',
  FILE_ATTACH: 'File Attachment',
  IMAGE: 'Image',
  COMPUTED: 'Computed',
  SIGNATURE: 'Signature',
};

const TemplateBuilder = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm] = Form.useForm();

  const [previewOpen, setPreviewOpen] = useState(false);

  const [selectedFieldType, setSelectedFieldType] = useState(null);
  const [optionLists, setOptionLists] = useState([]);
  const [valueStatements, setValueStatements] = useState([]);

  // ------------------ Data Fetching ------------------
  const fetchTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.templates.get(templateId);
      const data = res.data?.data || res.data;
      setTemplate(data);
      setSections(data?.sections || []);
    } catch {
      message.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const fetchSections = useCallback(async () => {
    try {
      const res = await apiFunctions.templates.sections.list(templateId);
      setSections(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, [templateId]);

  const fetchFields = useCallback(async (sectionId) => {
    if (!sectionId) return;
    setFieldsLoading(true);
    try {
      const res = await apiFunctions.templates.fields.list(templateId, sectionId);
      setFields(res.data?.data || res.data || []);
    } catch {
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, [templateId]);

  const fetchOptionLists = useCallback(async () => {
    try {
      const res = await apiFunctions.optionLists.list();
      setOptionLists(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchValueStatements = useCallback(async () => {
    try {
      const res = await apiFunctions.valueStatements.list({ active: true });
      setValueStatements(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTemplate();
    fetchSections();
    fetchOptionLists();
    fetchValueStatements();
  }, [fetchTemplate, fetchSections, fetchOptionLists, fetchValueStatements]);

  useEffect(() => {
    if (selectedSection) {
      fetchFields(selectedSection.code);
    }
  }, [selectedSection, fetchFields]);

  // ------------------ Section Operations ------------------
  const handleAddSection = async (parentSectionCode = null) => {
    Modal.confirm({
      title: 'Add Section',
      content: (
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Section Code" required>
            <Input id="sectionCode" placeholder="e.g. CASH" />
          </Form.Item>
          <Form.Item label="Name (English)" required>
            <Input id="sectionNameEn" placeholder="Section name in English" />
          </Form.Item>
          <Form.Item label="Name (Gujarati)">
            <Input id="sectionNameGu" placeholder="Section name in Gujarati" />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const code = document.getElementById('sectionCode').value;
        const nameEn = document.getElementById('sectionNameEn').value;
        const nameGu = document.getElementById('sectionNameGu').value;
        if (!code || !nameEn) {
          message.error('Code and English name are required');
          return Promise.reject();
        }
        try {
          await apiFunctions.templates.sections.create(templateId, {
            code,
            titleEn: nameEn,
            titleGu: nameGu,
            parentSectionCode,
            sequence: sections.length + 1,
          });
          message.success('Section added');
          fetchSections();
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to add section');
          return Promise.reject();
        }
      },
    });
  };

  const handleDeleteSection = async (sectionId) => {
    try {
      await apiFunctions.templates.sections.delete(templateId, sectionId);
      message.success('Section deleted');
      if (selectedSection?.code === sectionId) setSelectedSection(null);
      fetchSections();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete section');
    }
  };

  // ------------------ Field Operations ------------------
  const openFieldDrawer = (field = null) => {
    setEditingField(field);
    if (field) {
      const validation = field.validationRule || {};
      const riskConfig = field.riskConfig || {};
      fieldForm.setFieldsValue({
        code: field.code,
        labelEn: field.labelEn,
        labelGu: field.labelGu,
        fieldType: field.fieldType,
        isMandatory: field.isMandatory,
        helpTextEn: field.helpTextEn,
        helpTextGu: field.helpTextGu,
        visibilityRule: field.visibilityRule,
        maxLength: validation.maxLength,
        minValue: validation.min,
        maxValue: validation.max,
        regex: validation.regex,
        allowedFileTypes: validation.allowedTypes,
        optionListId: field.optionListId?._id || field.optionListId,
        weight: riskConfig.weight || 1,
        riskPoints: riskConfig.pointTable?.map((item) => ({
          optionValue: item.optionValue,
          points: item.riskPoints,
          severity: item.severity,
        })) || [],
        valueStatementIds: field.valueStatementIds || field.valueStatements?.map((vs) => vs._id || vs.id),
        gridColumns: field.gridColumns?.map((column) => ({
          colName: column.labelEn,
          colType: column.columnType,
          code: column.code,
        })),
      });
      setSelectedFieldType(field.fieldType);
    } else {
      fieldForm.resetFields();
      setSelectedFieldType(null);
      const autoCode = `FLD_${Date.now()}`;
      fieldForm.setFieldsValue({ code: autoCode, weight: 1, isMandatory: false, riskPoints: [] });
    }
    setDrawerOpen(true);
  };

  const handleSaveField = async () => {
    try {
      const values = await fieldForm.validateFields();
      const {
        maxLength,
        minValue,
        maxValue,
        regex,
        allowedFileTypes,
        weight,
        riskPoints,
        gridColumns,
        ...fieldValues
      } = values;
      const validationRule = {};
      if (maxLength !== undefined) validationRule.maxLength = maxLength;
      if (minValue !== undefined) validationRule.min = minValue;
      if (maxValue !== undefined) validationRule.max = maxValue;
      if (regex) validationRule.regex = regex;
      if (allowedFileTypes?.length) validationRule.allowedTypes = allowedFileTypes;

      const payload = {
        ...fieldValues,
        validationRule,
        riskConfig: {
          weight: weight || 1,
          pointTable: (riskPoints || []).map((item) => ({
            optionValue: item.optionValue,
            riskPoints: item.points || 0,
            severity: item.severity,
          })),
        },
        gridColumns: (gridColumns || []).map((column, index) => ({
          code: column.code || `COL_${index + 1}`,
          labelEn: column.colName,
          columnType: column.colType,
          sequence: index + 1,
        })),
      };
      if (editingField) {
        await apiFunctions.templates.fields.update(
          templateId, selectedSection.code, editingField.code, payload,
        );
        message.success('Field updated');
      } else {
        await apiFunctions.templates.fields.create(
          templateId, selectedSection.code, payload,
        );
        message.success('Field added');
      }
      setDrawerOpen(false);
      fetchFields(selectedSection.code);
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save field');
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await apiFunctions.templates.fields.delete(templateId, selectedSection.code, fieldId);
      message.success('Field deleted');
      fetchFields(selectedSection.code);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete field');
    }
  };

  // ------------------ Template Operations ------------------
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await apiFunctions.templates.update(templateId, { status: 'Draft' });
      message.success('Draft saved');
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    Modal.confirm({
      title: 'Publish Template',
      icon: <ExclamationCircleOutlined />,
      content: 'Publishing will make this template available for audits. Continue?',
      onOk: async () => {
        try {
          await apiFunctions.templates.publish(templateId);
          message.success('Template published');
          fetchTemplate();
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to publish');
        }
      },
    });
  };

  // ------------------ Tree Data ------------------
  const buildTreeData = (sectionList, parentSectionCode = null) => {
    return sectionList
      .filter((s) => (
        parentSectionCode
          ? s.parentSectionCode === parentSectionCode
          : !s.parentSectionCode
      ))
      .map((sec) => ({
        title: (
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>
              <FolderOutlined style={{ marginRight: 6 }} />
              {language === 'gu' && sec.titleGu ? sec.titleGu : sec.titleEn}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({sec.code})</Text>
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Add Sub-section">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddSection(sec.code)}
                />
              </Tooltip>
                <Popconfirm title="Delete section?" onConfirm={() => handleDeleteSection(sec.code)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </span>
          </span>
        ),
        key: sec.code,
        children: buildTreeData(sectionList, sec.code),
      }));
  };

  // ------------------ Field Table Columns ------------------
  const fieldColumns = [
    {
      title: '#',
      width: 50,
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: 'Label',
      dataIndex: 'labelEn',
      key: 'labelEn',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 130,
      render: (v) => <Text code>{FIELD_TYPE_LABELS[v] || v}</Text>,
    },
    {
      title: 'Mandatory',
      dataIndex: 'isMandatory',
      key: 'isMandatory',
      width: 90,
      render: (v) => (v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openFieldDrawer(record)} />
          <Button size="small" icon={<ArrowUpOutlined />} />
          <Button size="small" icon={<ArrowDownOutlined />} />
          <Popconfirm
            title="Delete this field?"
            onConfirm={() => handleDeleteField(record.code)}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ------------------ Render ------------------
  const renderFieldConfig = () => {
    const ft = selectedFieldType;
    if (!ft) return null;

    return (
      <>
        <Divider>Field Configuration</Divider>
        {['TEXT_SHORT', 'TEXT_LONG'].includes(ft) && (
          <Form.Item name="maxLength" label="Max Length">
            <InputNumber min={1} max={4000} style={{ width: '100%' }} />
          </Form.Item>
        )}
        {['NUMBER', 'CURRENCY', 'PERCENTAGE'].includes(ft) && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minValue" label="Min Value">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxValue" label="Max Value">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
        {ft === 'TEXT_SHORT' && (
          <Form.Item name="regex" label="Validation Regex">
            <Input placeholder="e.g. ^[A-Z]{3}-\\d{4}$" />
          </Form.Item>
        )}
        {ft === 'FILE_ATTACH' && (
          <Form.Item name="allowedFileTypes" label="Allowed File Types">
            <Select
              mode="tags"
              placeholder="e.g. .pdf, .jpg"
              options={[
                { label: 'PDF', value: '.pdf' },
                { label: 'JPG', value: '.jpg' },
                { label: 'PNG', value: '.png' },
                { label: 'DOCX', value: '.docx' },
                { label: 'XLSX', value: '.xlsx' },
              ]}
            />
          </Form.Item>
        )}
        {['DROPDOWN', 'MULTI_SELECT', 'RADIO_YN', 'CHECKBOX_GROUP'].includes(ft) && (
          <Form.Item name="optionListId" label="Option List">
            <Select
              allowClear
              showSearch
              placeholder="Select option list"
              optionFilterProp="label"
              options={optionLists.map((ol) => ({
                label: `${ol.name || ol.code} (${ol.code})`,
                value: ol._id || ol.id,
              }))}
            />
          </Form.Item>
        )}
        {ft === 'GRID' && (
          <Form.Item name="gridColumns" label="Grid Columns">
            <Form.List name="gridColumns">
              {(subFields, { add, remove }) => (
                <>
                  {subFields.map((subField, index) => (
                    <Space key={subField.key} align="baseline" style={{ marginBottom: 8 }}>
                      <Form.Item {...subField} name={[subField.name, 'colName']} noStyle>
                        <Input placeholder="Column Name" style={{ width: 140 }} />
                      </Form.Item>
                      <Form.Item {...subField} name={[subField.name, 'colType']} noStyle>
                        <Select placeholder="Type" style={{ width: 120 }} options={FIELD_TYPES.slice(0, 10).map((t) => ({ label: FIELD_TYPE_LABELS[t], value: t }))} />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(index)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add({ colName: '', colType: 'TEXT_SHORT' })} block icon={<PlusOutlined />}>
                    Add Column
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb
          items={[
            { title: <a onClick={() => navigate('/admin/templates')}>{t('admin', 'Admin')}</a> },
            { title: <a onClick={() => navigate('/admin/templates')}>{t('templates', 'Templates')}</a> },
            { title: <Text>{template?.name || 'Template'}</Text> },
          ]}
        />
      </div>

      <Layout style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', minHeight: '70vh' }}>
        <Sider width={320} style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0', padding: 16, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>{t('sections', 'Sections')}</Title>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAddSection()}>
              Add
            </Button>
          </div>
          {sections.length === 0 ? (
            <Empty description="No sections yet" />
          ) : (
            <Tree
              showLine
              defaultExpandAll
              treeData={buildTreeData(sections)}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  const found = sections.find((s) => s.code === keys[0]);
                  setSelectedSection(found);
                }
              }}
            />
          )}
        </Sider>

        <LayoutContent style={{ padding: 16, overflow: 'auto' }}>
          {!selectedSection ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
              <Empty description="Select a section from the left panel to edit its fields" />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {language === 'gu' && selectedSection.titleGu ? selectedSection.titleGu : selectedSection.titleEn}
                  </Title>
                  <Text type="secondary">Code: {selectedSection.code}</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openFieldDrawer(null)}>
                  Add Field
                </Button>
              </div>

              <Spin spinning={fieldsLoading}>
                <Table
                  rowKey="_id"
                  columns={fieldColumns}
                  dataSource={fields}
                  size="small"
                  pagination={false}
                  locale={{ emptyText: <Empty description="No fields in this section. Click 'Add Field' to begin." /> }}
                />
              </Spin>
            </>
          )}
        </LayoutContent>
      </Layout>

      {/* Bottom Bar */}
      <div
        style={{
          marginTop: 16,
          padding: '12px 24px',
          background: '#fff',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <Button icon={<LeftOutlined />} onClick={() => navigate('/admin/templates')}>
          Back to Templates
        </Button>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={saving}>
            Save Draft
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}>
            Publish
          </Button>
        </Space>
      </div>

      {/* Field Editor Drawer */}
      <Drawer
        title={editingField ? `Edit Field: ${editingField.code}` : 'Add New Field'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); fieldForm.resetFields(); }}
        width={640}
        extra={
          <Space>
            <Button onClick={() => { setDrawerOpen(false); fieldForm.resetFields(); }}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="primary" onClick={handleSaveField}>
              {t('save', 'Save')}
            </Button>
          </Space>
        }
      >
        <Form form={fieldForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Field Code"
                rules={[{ required: true, message: 'Code is required' }]}
              >
                <Input placeholder="e.g. CASH_DATE" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fieldType"
                label="Field Type"
                rules={[{ required: true, message: 'Type is required' }]}
              >
                <Select
                  showSearch
                  placeholder="Select field type"
                  onChange={setSelectedFieldType}
                  options={FIELD_TYPES.map((ft) => ({
                    label: FIELD_TYPE_LABELS[ft],
                    value: ft,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="labelEn"
                label="Label (English)"
                rules={[{ required: true, message: 'English label is required' }]}
              >
                <Input placeholder="e.g. Cash Balance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="labelGu" label="Label (Gujarati)">
                <Input placeholder="ગુજરાતી label" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isMandatory" label="Mandatory" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label="Risk Weight">
                <Slider min={0} max={10} step={0.5} marks={{ 0: '0', 5: '5', 10: '10' }} />
              </Form.Item>
            </Col>
          </Row>

          {renderFieldConfig()}

          <Form.Item name="visibilityRule" label="Visibility Rule (Expression)">
            <Input.TextArea
              rows={2}
              placeholder={`e.g. CASH_LIMIT_STATUS == "NOT_COMPLIED"\nConditionally show/hide this field`}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="helpTextEn" label="Help Text (English)">
                <Input.TextArea rows={2} placeholder="Guidance or help text for the field" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="helpTextGu" label="Help Text (Gujarati)">
                <Input.TextArea rows={2} placeholder="ગુજરાતી help text" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="valueStatementIds" label="Value Statements">
            <Select
              mode="multiple"
              placeholder="Attach value statements"
              optionFilterProp="label"
              options={valueStatements.map((vs) => ({
                label: `${vs.code}: ${(vs.textEn || '').substring(0, 60)}...`,
                value: vs._id || vs.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="riskPoints" label="Risk Point Configuration">
            <Form.List name="riskPoints">
              {(subFields, { add, remove }) => (
                <>
                  {subFields.map((subField, index) => (
                    <Space key={subField.key} align="baseline" style={{ marginBottom: 8 }}>
                      <Form.Item {...subField} name={[subField.name, 'optionValue']} noStyle>
                        <Input placeholder="Option value" style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item {...subField} name={[subField.name, 'points']} noStyle>
                        <InputNumber placeholder="Points" min={0} style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item {...subField} name={[subField.name, 'severity']} noStyle>
                        <Select placeholder="Severity" style={{ width: 120 }} options={[
                          { label: 'Critical', value: 'CRITICAL' },
                          { label: 'High', value: 'HIGH' },
                          { label: 'Medium', value: 'MEDIUM' },
                          { label: 'Low', value: 'LOW' },
                        ]} />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(index)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add({ optionValue: '', points: 0, severity: 'LOW' })} block icon={<PlusOutlined />}>
                    Add Risk Point
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Preview Modal */}
      <Modal
        title="Template Preview"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={900}
      >
        <div style={{ padding: 16 }}>
          <Text type="secondary">FormRenderer preview would render here with the current template data.</Text>
          <div style={{ marginTop: 16, padding: 24, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Title level={5}>Template: {template?.name || 'N/A'}</Title>
            <Text>Status: {template?.status}</Text>
            <Divider />
            <Text type="secondary">{sections.length} sections configured</Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TemplateBuilder;
