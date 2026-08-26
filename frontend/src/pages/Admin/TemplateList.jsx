import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Tooltip, Form, Input,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  SendOutlined, CopyOutlined, ReloadOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const statusConfig = {
  DRAFT: { color: 'gold', labelEn: 'Draft', labelGu: 'Draft' },
  PUBLISHED: { color: 'green', labelEn: 'Published', labelGu: 'Published' },
  ARCHIVED: { color: 'default', labelEn: 'Archived', labelGu: 'Archived' },
};

const getId = (value) => value?._id || value?.id || value;

const TemplateList = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auditTypes, setAuditTypes] = useState([]);
  const [filterAuditType, setFilterAuditType] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAuditType, setSelectedAuditType] = useState(null);
  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterAuditType ? { auditType: filterAuditType } : {};
      const response = await apiFunctions.templates.list(params);
      setTemplates(response.data?.data || response.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [filterAuditType]);

  const fetchAuditTypes = useCallback(async () => {
    try {
      const response = await apiFunctions.masters.auditTypes.list();
      setAuditTypes(response.data?.data || response.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchAuditTypes();
  }, [fetchTemplates, fetchAuditTypes]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await apiFunctions.templates.create({
        auditType: values.auditTypeId,
      });
      message.success(t('operationSuccess', 'Template created successfully'));
      setCreateModalOpen(false);
      form.resetFields();
      fetchTemplates();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFunctions.templates.delete(id);
      message.success(t('operationSuccess', 'Template deleted successfully'));
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handlePublish = async (id) => {
    try {
      await apiFunctions.templates.publish(id);
      message.success('Template published successfully');
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to publish template');
    }
  };

  const handleClone = async (id) => {
    try {
      await apiFunctions.templates.clone(id);
      message.success('Template cloned successfully');
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to clone template');
    }
  };

  const getAuditTypeName = (id) => {
    const found = typeof id === 'object'
      ? id
      : auditTypes.find((at) => getId(at) === id);
    return found?.name || found?.code || id || '-';
  };

  const columns = [
    {
      title: t('auditType', 'Audit Type'),
      dataIndex: 'auditType',
      key: 'auditType',
      render: (val) => getAuditTypeName(val),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (v) => <Tag>v{v}</Tag>,
    },
    {
      title: t('status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
        render: (status) => {
          const cfg = statusConfig[String(status || '').toUpperCase()] || { color: 'default', labelEn: status };
        return (
          <Tag color={cfg.color}>
            {language === 'gu' ? (cfg.labelGu || cfg.labelEn) : (cfg.labelEn || status)}
          </Tag>
        );
      },
    },
    {
      title: t('sections', 'Sections'),
      dataIndex: 'sectionsCount',
      key: 'sectionsCount',
      width: 100,
      render: (v) => v ?? '-',
    },
    {
      title: t('created', 'Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: t('updated', 'Updated'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t('view', 'View')}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/templates/${getId(record)}/builder`)}
            />
          </Tooltip>
          {hasPermission('templates', 'edit') && (
            <Tooltip title={t('edit', 'Edit')}>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/admin/templates/${getId(record)}/builder`)}
              />
            </Tooltip>
          )}
          {String(record.status || '').toUpperCase() === 'DRAFT' && (
            <Tooltip title={t('publish', 'Publish')}>
              <Popconfirm
                title="Publish this template?"
                onConfirm={() => handlePublish(getId(record))}
                okText={t('yes', 'Yes')}
                cancelText={t('no', 'No')}
              >
                <Button size="small" icon={<SendOutlined />} type="primary" />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title={t('clone', 'Clone')}>
            <Popconfirm
              title="Clone this template?"
              onConfirm={() => handleClone(getId(record))}
              okText={t('yes', 'Yes')}
              cancelText={t('no', 'No')}
            >
              <Button size="small" icon={<CopyOutlined />} />
            </Popconfirm>
          </Tooltip>
          {hasPermission('templates', 'delete') && (
            <Tooltip title={t('delete', 'Delete')}>
              <Popconfirm
                title={t('confirmDelete', 'Are you sure you want to delete this template?')}
                onConfirm={() => handleDelete(getId(record))}
                okText={t('yes', 'Yes')}
                cancelText={t('no', 'No')}
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
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
            { title: <Text>{t('templates', 'Templates')}</Text> },
          ]}
        />
      </div>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            {t('templates', 'Templates')}
          </Title>
          <Space wrap>
            <Select
              allowClear
              placeholder={t('auditType', 'Filter Audit Type')}
              style={{ width: 220 }}
              value={filterAuditType}
              onChange={setFilterAuditType}
              options={auditTypes.map((at) => ({
                label: at.name || at.code,
                value: getId(at),
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>
              {t('reset', 'Refresh')}
            </Button>
            {hasPermission('templates', 'create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create New Template
              </Button>
            )}
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={templates}
            scroll={{ x: 1100 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `${t('total', 'Total')}: ${total}`,
            }}
            locale={{
              emptyText: <Empty description={t('noData', 'No templates found')} />,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Create New Template"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={creating}
        okText={t('create', 'Create')}
        cancelText={t('cancel', 'Cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="auditTypeId"
            label={t('auditType', 'Audit Type')}
            rules={[{ required: true, message: t('requiredField', 'This field is required') }]}
          >
            <Select
              showSearch
              placeholder={t('selectOption', 'Select audit type')}
              optionFilterProp="label"
              options={auditTypes.map((at) => ({
                label: at.name || at.code,
                value: getId(at),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplateList;
