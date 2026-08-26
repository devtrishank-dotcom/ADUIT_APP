import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Tabs, Form, Input, DatePicker, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  BankOutlined, HomeOutlined, CalendarOutlined, FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MastersPanel = () => {
  const { t, language } = useLanguage();

  // Branches
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm] = Form.useForm();
  const [branchSaving, setBranchSaving] = useState(false);

  // PACS
  const [pacs, setPacs] = useState([]);
  const [pacsLoading, setPacsLoading] = useState(false);
  const [pacModalOpen, setPacModalOpen] = useState(false);
  const [editingPac, setEditingPac] = useState(null);
  const [pacForm] = Form.useForm();
  const [pacSaving, setPacSaving] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');

  // Financial Years
  const [fyears, setFyears] = useState([]);
  const [fyearsLoading, setFyearsLoading] = useState(false);
  const [fyearModalOpen, setFyearModalOpen] = useState(false);
  const [editingFyear, setEditingFyear] = useState(null);
  const [fyearForm] = Form.useForm();
  const [fyearSaving, setFyearSaving] = useState(false);

  // Audit Types
  const [auditTypes, setAuditTypes] = useState([]);
  const [auditTypesLoading, setAuditTypesLoading] = useState(false);
  const [atModalOpen, setAtModalOpen] = useState(false);
  const [editingAT, setEditingAT] = useState(null);
  const [atForm] = Form.useForm();
  const [atSaving, setAtSaving] = useState(false);

  // ------------------ Branches ------------------
  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const res = await apiFunctions.masters.branches.list();
      setBranches(res.data?.data || res.data || []);
    } catch {
      message.error('Failed to load branches');
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openBranchModal = (rec = null) => {
    setEditingBranch(rec);
    if (rec) branchForm.setFieldsValue(rec);
    else branchForm.resetFields();
    setBranchModalOpen(true);
  };

  const handleBranchSave = async () => {
    try {
      const vals = await branchForm.validateFields();
      setBranchSaving(true);
      if (editingBranch) {
        await apiFunctions.masters.branches.update(editingBranch.id, vals);
        message.success('Branch updated');
      } else {
        await apiFunctions.masters.branches.create(vals);
        message.success('Branch created');
      }
      setBranchModalOpen(false);
      branchForm.resetFields();
      fetchBranches();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setBranchSaving(false);
    }
  };

  const handleBranchDelete = async (id) => {
    try {
      await apiFunctions.masters.branches.delete(id);
      message.success('Branch deleted');
      fetchBranches();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  // ------------------ PACS ------------------
  const fetchPacs = useCallback(async () => {
    setPacsLoading(true);
    try {
      const res = await apiFunctions.masters.pacs.list();
      setPacs(res.data?.data || res.data || []);
    } catch {
      message.error('Failed to load PACS');
    } finally {
      setPacsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPacs(); }, [fetchPacs]);

  const openPacModal = (rec = null) => {
    setEditingPac(rec);
    if (rec) pacForm.setFieldsValue(rec);
    else pacForm.resetFields();
    setPacModalOpen(true);
  };

  const handlePacSave = async () => {
    try {
      const vals = await pacForm.validateFields();
      setPacSaving(true);
      if (editingPac) {
        await apiFunctions.masters.pacs.update(editingPac.id, vals);
        message.success('PACS updated');
      } else {
        await apiFunctions.masters.pacs.create(vals);
        message.success('PACS created');
      }
      setPacModalOpen(false);
      pacForm.resetFields();
      fetchPacs();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save PACS');
    } finally {
      setPacSaving(false);
    }
  };

  const handlePacDelete = async (id) => {
    try {
      await apiFunctions.masters.pacs.delete(id);
      message.success('PACS deleted');
      fetchPacs();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete PACS');
    }
  };

  const handleBulkImport = async () => {
    try {
      const data = JSON.parse(bulkJson);
      if (!Array.isArray(data)) {
        message.error('JSON must be an array of PACS objects');
        return;
      }
      await apiFunctions.masters.pacs.bulkImport({ items: data });
      message.success(`${data.length} PACS imported successfully`);
      setBulkImportOpen(false);
      setBulkJson('');
      fetchPacs();
    } catch (err) {
      if (err instanceof SyntaxError) {
        message.error('Invalid JSON format');
      } else {
        message.error(err.response?.data?.message || 'Failed to import PACS');
      }
    }
  };

  // ------------------ Financial Years ------------------
  const fetchFyears = useCallback(async () => {
    setFyearsLoading(true);
    try {
      const res = await apiFunctions.masters.financialYears.list();
      setFyears(res.data?.data || res.data || []);
    } catch {
      message.error('Failed to load financial years');
    } finally {
      setFyearsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFyears(); }, [fetchFyears]);

  const openFyearModal = (rec = null) => {
    setEditingFyear(rec);
    if (rec) {
      fyearForm.setFieldsValue({
        ...rec,
        startDate: rec.startDate ? dayjs(rec.startDate) : null,
        endDate: rec.endDate ? dayjs(rec.endDate) : null,
      });
    } else {
      fyearForm.resetFields();
    }
    setFyearModalOpen(true);
  };

  const handleFyearSave = async () => {
    try {
      const vals = await fyearForm.validateFields();
      const payload = {
        ...vals,
        startDate: vals.startDate?.format('YYYY-MM-DD'),
        endDate: vals.endDate?.format('YYYY-MM-DD'),
      };
      setFyearSaving(true);
      if (editingFyear) {
        await apiFunctions.masters.financialYears.update(editingFyear.id, payload);
        message.success('Financial year updated');
      } else {
        await apiFunctions.masters.financialYears.create(payload);
        message.success('Financial year created');
      }
      setFyearModalOpen(false);
      fyearForm.resetFields();
      fetchFyears();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save financial year');
    } finally {
      setFyearSaving(false);
    }
  };

  const handleFyearDelete = async (id) => {
    try {
      await apiFunctions.masters.financialYears.delete(id);
      message.success('Financial year deleted');
      fetchFyears();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete financial year');
    }
  };

  // ------------------ Audit Types ------------------
  const fetchAuditTypes = useCallback(async () => {
    setAuditTypesLoading(true);
    try {
      const res = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(res.data?.data || res.data || []);
    } catch {
      message.error('Failed to load audit types');
    } finally {
      setAuditTypesLoading(false);
    }
  }, []);

  useEffect(() => { fetchAuditTypes(); }, [fetchAuditTypes]);

  const openATModal = (rec = null) => {
    setEditingAT(rec);
    if (rec) atForm.setFieldsValue(rec);
    else atForm.resetFields();
    setAtModalOpen(true);
  };

  const handleATSave = async () => {
    try {
      const vals = await atForm.validateFields();
      setAtSaving(true);
      if (editingAT) {
        await apiFunctions.masters.auditTypes.update(editingAT.id, vals);
        message.success('Audit type updated');
      } else {
        await apiFunctions.masters.auditTypes.create(vals);
        message.success('Audit type created');
      }
      setAtModalOpen(false);
      atForm.resetFields();
      fetchAuditTypes();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save audit type');
    } finally {
      setAtSaving(false);
    }
  };

  const handleATDelete = async (id) => {
    try {
      await apiFunctions.masters.auditTypes.delete(id);
      message.success('Audit type deleted');
      fetchAuditTypes();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete audit type');
    }
  };

  // ------------------ Shared Columns ------------------
  const statusRender = (v) => (
    <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>
      {v === 'ACTIVE' ? t('active', 'Active') : t('inactive', 'Inactive')}
    </Tag>
  );

  const actionRender = (onEdit, onDelete) => (
    <Space size="small">
      <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
      <Popconfirm title={t('confirmDelete')} onConfirm={onDelete} okButtonProps={{ danger: true }}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  );

  const branchColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 120 },
    { title: 'Region', dataIndex: 'region', key: 'region', width: 120 },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true, width: 180 },
    { title: t('status'), dataIndex: 'status', key: 'status', width: 90, render: statusRender },
    { title: t('actions'), key: 'actions', width: 120, render: (_, r) => actionRender(() => openBranchModal(r), () => handleBranchDelete(r.id)) },
  ];

  const pacColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Reg No', dataIndex: 'regNo', key: 'regNo', width: 120 },
    { title: 'Branch', dataIndex: 'linkedBranchName', key: 'linkedBranchName', width: 130 },
    { title: 'Taluka', dataIndex: 'taluka', key: 'taluka', width: 100 },
    { title: 'Village', dataIndex: 'village', key: 'village', width: 100 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 100, render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: t('status'), dataIndex: 'status', key: 'status', width: 90, render: statusRender },
    { title: t('actions'), key: 'actions', width: 120, render: (_, r) => actionRender(() => openPacModal(r), () => handlePacDelete(r.id)) },
  ];

  const fyearColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 130, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 130, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Open', dataIndex: 'isOpen', key: 'isOpen', width: 80, render: (v) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    { title: t('actions'), key: 'actions', width: 120, render: (_, r) => actionRender(() => openFyearModal(r), () => handleFyearDelete(r.id)) },
  ];

  const atColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Frequency', dataIndex: 'frequency', key: 'frequency', width: 120, render: (v) => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: 'Template', dataIndex: 'templateName', key: 'templateName', width: 150, ellipsis: true },
    { title: 'Workflow', dataIndex: 'workflowName', key: 'workflowName', width: 150, ellipsis: true },
    { title: t('actions'), key: 'actions', width: 120, render: (_, r) => actionRender(() => openATModal(r), () => handleATDelete(r.id)) },
  ];

  const tabItems = [
    {
      key: 'branches',
      label: <span><BankOutlined /> {t('branches', 'Branches')}</span>,
      children: (
        <div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openBranchModal(null)}>
              Add Branch
            </Button>
          </div>
          <Spin spinning={branchesLoading}>
            <Table rowKey="_id" columns={branchColumns} dataSource={branches} size="small" scroll={{ x: 800 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="No branches" /> }} />
          </Spin>
        </div>
      ),
    },
    {
      key: 'pacs',
      label: <span><HomeOutlined /> {t('pacs', 'PACS')}</span>,
      children: (
        <div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => setBulkImportOpen(true)}>
                Bulk Import
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openPacModal(null)}>
                Add PACS
              </Button>
            </Space>
          </div>
          <Spin spinning={pacsLoading}>
            <Table rowKey="_id" columns={pacColumns} dataSource={pacs} size="small" scroll={{ x: 900 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="No PACS records" /> }} />
          </Spin>
        </div>
      ),
    },
    {
      key: 'financialYears',
      label: <span><CalendarOutlined /> {t('financialYear', 'Financial Years')}</span>,
      children: (
        <div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openFyearModal(null)}>
              Add Financial Year
            </Button>
          </div>
          <Spin spinning={fyearsLoading}>
            <Table rowKey="_id" columns={fyearColumns} dataSource={fyears} size="small" scroll={{ x: 600 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="No financial years" /> }} />
          </Spin>
        </div>
      ),
    },
    {
      key: 'auditTypes',
      label: <span><FileTextOutlined /> {t('auditType', 'Audit Types')}</span>,
      children: (
        <div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openATModal(null)}>
              Add Audit Type
            </Button>
          </div>
          <Spin spinning={auditTypesLoading}>
            <Table rowKey="_id" columns={atColumns} dataSource={auditTypes} size="small" scroll={{ x: 750 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="No audit types" /> }} />
          </Spin>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <Text>{t('admin', 'Admin')}</Text> },
            { title: <Text>{t('masters', 'Masters')}</Text> },
          ]}
        />
      </div>
      <Card>
        <Title level={4} style={{ marginBottom: 16 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          {t('masters', 'Master Data Management')}
        </Title>
        <Tabs defaultActiveKey="branches" items={tabItems} />
      </Card>

      {/* Branch Modal */}
      <Modal
        title={editingBranch ? 'Edit Branch' : 'Add Branch'}
        open={branchModalOpen}
        onOk={handleBranchSave}
        onCancel={() => { setBranchModalOpen(false); branchForm.resetFields(); }}
        confirmLoading={branchSaving}
        okText={t('save')} cancelText={t('cancel')}
      >
        <Form form={branchForm} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. BR001" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Branch name" />
          </Form.Item>
          <Form.Item name="zone" label="Zone"><Input placeholder="Zone" /></Form.Item>
          <Form.Item name="region" label="Region"><Input placeholder="Region" /></Form.Item>
          <Form.Item name="address" label="Address"><TextArea rows={2} placeholder="Address" /></Form.Item>
          <Form.Item name="status" label={t('status')} initialValue="ACTIVE">
            <Select options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* PACS Modal */}
      <Modal
        title={editingPac ? 'Edit PACS' : 'Add PACS'}
        open={pacModalOpen}
        onOk={handlePacSave}
        onCancel={() => { setPacModalOpen(false); pacForm.resetFields(); }}
        confirmLoading={pacSaving}
        okText={t('save')} cancelText={t('cancel')}
      >
        <Form form={pacForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="PACS / Mandali name" />
          </Form.Item>
          <Form.Item name="regNo" label="Registration Number"><Input placeholder="Registration No" /></Form.Item>
          <Form.Item name="linkedBranchId" label="Linked Branch">
            <Select showSearch placeholder="Select branch" optionFilterProp="label"
              options={branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))} />
          </Form.Item>
          <Form.Item name="taluka" label="Taluka"><Input placeholder="Taluka" /></Form.Item>
          <Form.Item name="village" label="Village"><Input placeholder="Village" /></Form.Item>
          <Form.Item name="category" label="Category"><Input placeholder="Category" /></Form.Item>
          <Form.Item name="status" label={t('status')} initialValue="ACTIVE">
            <Select options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        title="Bulk Import PACS"
        open={bulkImportOpen}
        onOk={handleBulkImport}
        onCancel={() => { setBulkImportOpen(false); setBulkJson(''); }}
        okText="Import"
        width={700}
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Paste a JSON array of PACS objects below:</Text>
          <Input.TextArea
            rows={12}
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            placeholder='[{"name": "PACS Name", "regNo": "REG001", "taluka": "...", "village": "...", ...}]'
            style={{ marginTop: 8, fontFamily: 'monospace' }}
          />
        </div>
      </Modal>

      {/* Financial Year Modal */}
      <Modal
        title={editingFyear ? 'Edit Financial Year' : 'Add Financial Year'}
        open={fyearModalOpen}
        onOk={handleFyearSave}
        onCancel={() => { setFyearModalOpen(false); fyearForm.resetFields(); }}
        confirmLoading={fyearSaving}
        okText={t('save')} cancelText={t('cancel')}
      >
        <Form form={fyearForm} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. FY2025-26" />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="isOpen" label="Is Open" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Audit Type Modal */}
      <Modal
        title={editingAT ? 'Edit Audit Type' : 'Add Audit Type'}
        open={atModalOpen}
        onOk={handleATSave}
        onCancel={() => { setAtModalOpen(false); atForm.resetFields(); }}
        confirmLoading={atSaving}
        okText={t('save')} cancelText={t('cancel')}
      >
        <Form form={atForm} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. STATUTORY" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Audit type name" />
          </Form.Item>
          <Form.Item name="frequency" label="Frequency">
            <Select placeholder="Select frequency" options={[
              { label: 'Monthly', value: 'MONTHLY' },
              { label: 'Quarterly', value: 'QUARTERLY' },
              { label: 'Half-Yearly', value: 'HALF_YEARLY' },
              { label: 'Annual', value: 'ANNUAL' },
            ]} />
          </Form.Item>
          <Form.Item name="templateId" label="Linked Template">
            <Select placeholder="Select template" allowClear showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="workflowId" label="Linked Workflow">
            <Select placeholder="Select workflow" allowClear showSearch optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MastersPanel;
