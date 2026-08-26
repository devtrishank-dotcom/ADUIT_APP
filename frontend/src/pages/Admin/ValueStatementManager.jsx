import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Form, Input, Select, Switch, Tabs,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, FileTextOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ValueStatementManager = () => {
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.valueStatements.list();
      setStatements(res.data?.data || res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load value statements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const openModal = (record = null) => {
    setEditingStatement(record);
    if (record) {
      form.setFieldsValue({
        code: record.code,
        category: record.category,
        textEn: record.textEn,
        textGu: record.textGu,
        active: record.active,
        version: record.version,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ active: true, version: '1.0' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingStatement) {
        await apiFunctions.valueStatements.update(editingStatement.id, values);
        message.success('Value statement updated');
      } else {
        await apiFunctions.valueStatements.create(values);
        message.success('Value statement created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchStatements();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFunctions.valueStatements.delete(id);
      message.success('Value statement deleted');
      fetchStatements();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const categories = [
    'GENERAL_GUIDANCE',
    'REGULATORY',
    'COMPLIANCE',
    'RISK_INDICATOR',
    'BEST_PRACTICE',
    'POLICY',
    'PROCEDURE',
  ];

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Text (EN)',
      dataIndex: 'textEn',
      key: 'textEn',
      ellipsis: true,
      render: (v) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
          {v}
        </Paragraph>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (v) => (
        <Tag color="geekblue">
          {v
            ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : '-'}
        </Tag>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 90,
      align: 'center',
      render: (v) => <Tag>v{v}</Tag>,
    },
    {
      title: t('active', 'Active'),
      dataIndex: 'active',
      key: 'active',
      width: 80,
      align: 'center',
      render: (v) => (
        <Tag color={v ? 'green' : 'default'}>
          {v ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Tag>
      ),
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm
            title={t('confirmDelete', 'Delete this value statement?')}
            onConfirm={() => handleDelete(record.id)}
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
            { title: <Text>{t('valueStatement', 'Value Statements')}</Text> },
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
            {t('valueStatement', 'Value Statements')}
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchStatements}>
              {t('reset', 'Refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
              Create Value Statement
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={statements}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No value statements found" /> }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingStatement ? 'Edit Value Statement' : 'Create Value Statement'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText={t('save', 'Save')}
        cancelText={t('cancel', 'Cancel')}
        width={720}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="code"
              label="Code"
              rules={[{ required: true, message: 'Code is required' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g. VS_CASH_001" disabled={!!editingStatement} />
            </Form.Item>
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Category is required' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select category"
                options={categories.map((c) => ({
                  label: c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
                  value: c,
                }))}
              />
            </Form.Item>
          </div>

          <Tabs
            defaultActiveKey="en"
            items={[
              {
                key: 'en',
                label: 'English Text',
                children: (
                  <Form.Item
                    name="textEn"
                    label="Text (English)"
                    rules={[{ required: true, message: 'Text is required' }]}
                  >
                    <TextArea
                      rows={6}
                      placeholder="Enter the value statement / guidance text in English..."
                      showCount
                      maxLength={4000}
                    />
                  </Form.Item>
                ),
              },
              {
                key: 'gu',
                label: 'Gujarati Text',
                children: (
                  <Form.Item name="textGu" label="Text (Gujarati)">
                    <TextArea
                      rows={6}
                      placeholder="Enter the value statement / guidance text in Gujarati..."
                      showCount
                      maxLength={4000}
                    />
                  </Form.Item>
                ),
              },
            ]}
          />

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="version" label="Version">
              <Input placeholder="1.0" style={{ width: 120 }} disabled />
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

export default ValueStatementManager;
