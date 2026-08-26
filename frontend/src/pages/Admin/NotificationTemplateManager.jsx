import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Form, Input, Switch, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  BellOutlined, MailOutlined, MobileOutlined, DesktopOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const EVENT_TYPES = [
  'AUDIT_ASSIGNED', 'AUDIT_STARTED', 'AUDIT_SUBMITTED', 'AUDIT_APPROVED',
  'AUDIT_REJECTED', 'AUDIT_OVERDUE', 'OBSERVATION_CREATED', 'OBSERVATION_RESOLVED',
  'OBSERVATION_OVERDUE', 'HIA_PENDING', 'HIA_COMPLETED', 'CLOSURE_READY',
  'CERTIFICATE_GENERATED', 'REMINDER_SENT', 'ESCALATION_TRIGGERED',
];

const CHANNELS = [
  { key: 'EMAIL', label: 'Email', icon: <MailOutlined /> },
  { key: 'SMS', label: 'SMS', icon: <MobileOutlined /> },
  { key: 'IN_APP', label: 'In-App', icon: <BellOutlined /> },
  { key: 'PUSH', label: 'Push', icon: <DesktopOutlined /> },
];

const PLACEHOLDER_HINTS = [
  { key: '{{auditId}}', label: 'Audit ID' },
  { key: '{{auditName}}', label: 'Audit Name' },
  { key: '{{entityName}}', label: 'Entity / PACS Name' },
  { key: '{{branchName}}', label: 'Branch Name' },
  { key: '{{auditorName}}', label: 'Auditor Name' },
  { key: '{{observationCount}}', label: 'Observation Count' },
  { key: '{{riskScore}}', label: 'Risk Score' },
  { key: '{{dueDate}}', label: 'Due Date' },
  { key: '{{statusLabel}}', label: 'Status Label' },
  { key: '{{link}}', label: 'Action Link' },
];

const NotificationTemplateManager = () => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.notifications.templates.list();
      setTemplates(res.data?.data || res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openModal = (record = null) => {
    setEditingTemplate(record);
    if (record) {
      form.setFieldsValue({
        eventType: record.eventType,
        title: record.title,
        messageBody: record.messageBody,
        channels: record.channels || ['IN_APP'],
        active: record.active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ active: true, channels: ['IN_APP'] });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingTemplate) {
        await apiFunctions.notifications.templates.update(editingTemplate._id, values);
        message.success('Notification template updated');
      } else {
        await apiFunctions.notifications.templates.create(values);
        message.success('Notification template created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchTemplates();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFunctions.notifications.templates.delete(id);
      message.success('Notification template deleted');
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getChannelIcon = (ch) => {
    const found = CHANNELS.find((c) => c.key === ch);
    return found?.icon || <BellOutlined />;
  };

  const getChannelColor = (ch) => {
    const map = { EMAIL: 'blue', SMS: 'green', IN_APP: 'geekblue', PUSH: 'purple' };
    return map[ch] || 'default';
  };

  const columns = [
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 200,
      render: (v) => (
        <Tag color="cyan">
          <BellOutlined style={{ marginRight: 4 }} />
          {v ? v.replace(/_/g, ' ') : '-'}
        </Tag>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Channels',
      dataIndex: 'channels',
      key: 'channels',
      width: 200,
      render: (channels) => (
        <Space size={[2, 2]} wrap>
          {(channels || []).map((ch) => (
            <Tag key={ch} color={getChannelColor(ch)} icon={getChannelIcon(ch)}>
              {ch === 'IN_APP' ? 'In-App' : ch}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('active', 'Active'),
      dataIndex: 'active',
      key: 'active',
      width: 80,
      align: 'center',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm
            title={t('confirmDelete', 'Delete this template?')}
            onConfirm={() => handleDelete(record._id)}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
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
            { title: <Text>{t('notification', 'Notification Templates')}</Text> },
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
            <BellOutlined style={{ marginRight: 8 }} />
            {t('notification', 'Notification Templates')}
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>
              {t('reset', 'Refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
              Create Template
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={templates}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No notification templates found" /> }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingTemplate ? 'Edit Notification Template' : 'Create Notification Template'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText={t('save', 'Save')}
        cancelText={t('cancel', 'Cancel')}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="eventType"
            label="Event Type"
            rules={[{ required: true, message: 'Event type is required' }]}
          >
            <Select
              showSearch
              placeholder="Select event type"
              disabled={!!editingTemplate}
              options={EVENT_TYPES.map((et) => ({
                label: et.replace(/_/g, ' '),
                value: et,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="Notification Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="e.g. Audit Assigned: {{entityName}}" />
          </Form.Item>
          <Form.Item
            name="messageBody"
            label="Message Body"
            rules={[{ required: true, message: 'Message body is required' }]}
          >
            <TextArea
              rows={6}
              placeholder={`Dear {{auditorName}},\n\nA new audit has been assigned for {{entityName}} at {{branchName}}.\n\nAudit ID: {{auditId}}\nDue Date: {{dueDate}}\n\nPlease review and start the audit.`}
              showCount
              maxLength={2000}
            />
          </Form.Item>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Available Placeholders:</Text>
            <Space wrap>
              {PLACEHOLDER_HINTS.map((ph) => (
                <Tooltip key={ph.key} title={`Click to copy: ${ph.key}`}>
                  <Tag
                    color="processing"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      navigator.clipboard.writeText(ph.key);
                      message.success(`Copied ${ph.key}`);
                    }}
                  >
                    {ph.key}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item name="channels" label="Channels" style={{ flex: 1 }}>
              <Select
                mode="multiple"
                placeholder="Select delivery channels"
                options={CHANNELS.map((ch) => ({
                  label: (
                    <span>
                      {ch.icon} {ch.label}
                    </span>
                  ),
                  value: ch.key,
                }))}
              />
            </Form.Item>
            <Form.Item name="active" label={t('active', 'Active')} valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationTemplateManager;
