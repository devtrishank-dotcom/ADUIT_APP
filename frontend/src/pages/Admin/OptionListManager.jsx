import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Form, Input, Select, Switch, InputNumber,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const OptionListManager = () => {
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [expandedKeys, setExpandedKeys] = useState([]);
  const [itemsMap, setItemsMap] = useState({});

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.optionLists.list();
      setLists(res.data?.data || res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load option lists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const fetchItems = async (listId) => {
    try {
      const res = await apiFunctions.optionLists.items.list(listId);
      setItemsMap((prev) => ({ ...prev, [listId]: res.data?.data || res.data || [] }));
    } catch {
      message.error('Failed to load items');
    }
  };

  const handleExpand = (expanded, record) => {
    setExpandedKeys(expanded ? [...expandedKeys, record.id] : expandedKeys.filter((k) => k !== record.id));
    if (expanded && !itemsMap[record.id]) {
      fetchItems(record.id);
    }
  };

  const openModal = (record = null) => {
    setEditingList(record);
    if (record) {
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        isShared: record.isShared,
      });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingList) {
        await apiFunctions.optionLists.update(editingList.id, values);
        message.success('Option list updated');
      } else {
        await apiFunctions.optionLists.create(values);
        message.success('Option list created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchLists();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFunctions.optionLists.delete(id);
      message.success('Option list deleted');
      fetchLists();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleItemChange = async (listId, itemIndex, field, value) => {
    try {
      await apiFunctions.optionLists.items.update(listId, itemIndex, { [field]: value });
      setItemsMap((prev) => ({
        ...prev,
        [listId]: prev[listId]?.map((item, index) =>
          index === itemIndex ? { ...item, [field]: value } : item,
        ),
      }));
      message.success('Item updated');
    } catch {
      message.error('Failed to update item');
    }
  };

  const handleAddItem = async (listId) => {
    try {
      await apiFunctions.optionLists.items.create(listId, {
        value: 'NEW_ITEM',
        labelEn: 'New Item',
        labelGu: '',
        riskPoints: 0,
        severity: 'LOW',
         isActive: true,
      });
      message.success('Item added');
      fetchItems(listId);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (listId, itemIndex) => {
    try {
      await apiFunctions.optionLists.items.delete(listId, itemIndex);
      setItemsMap((prev) => ({
        ...prev,
        [listId]: prev[listId]?.filter((_, index) => index !== itemIndex),
      }));
      message.success('Item deleted');
    } catch {
      message.error('Failed to delete item');
    }
  };

  const severityColors = {
    CRITICAL: 'red',
    HIGH: 'orange',
    MEDIUM: 'gold',
    LOW: 'green',
  };

  const expandedRowRender = (record) => {
    const items = itemsMap[record.id] || [];
    return (
      <div style={{ padding: '8px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>Items ({items.length})</Text>
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => handleAddItem(record.id)}>
            Add Item
          </Button>
        </div>
        <Table
           rowKey={(item, index) => `${item.value || 'item'}-${index}`}
          dataSource={items}
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Value',
              dataIndex: 'value',
              key: 'value',
              width: 150,
               render: (v, item, index) => (
                <Input
                  defaultValue={v}
                  size="small"
                  onBlur={(e) => {
                    if (e.target.value !== v) handleItemChange(record.id, index, 'value', e.target.value);
                  }}
                />
              ),
            },
            {
              title: 'Label (EN)',
              dataIndex: 'labelEn',
              key: 'labelEn',
              width: 180,
               render: (v, item, index) => (
                <Input
                  defaultValue={v}
                  size="small"
                  onBlur={(e) => {
                    if (e.target.value !== v) handleItemChange(record.id, index, 'labelEn', e.target.value);
                  }}
                />
              ),
            },
            {
              title: 'Label (GU)',
              dataIndex: 'labelGu',
              key: 'labelGu',
              width: 180,
               render: (v, item, index) => (
                <Input
                  defaultValue={v}
                  size="small"
                  onBlur={(e) => {
                    if (e.target.value !== v) handleItemChange(record.id, index, 'labelGu', e.target.value);
                  }}
                />
              ),
            },
            {
              title: 'Risk Points',
              dataIndex: 'riskPoints',
              key: 'riskPoints',
              width: 110,
               render: (v, item, index) => (
                <InputNumber
                  defaultValue={v || 0}
                  size="small"
                  min={0}
                  style={{ width: '100%' }}
                  onBlur={(e) => {
                    const newVal = parseInt(e.target.value, 10);
                     if (!isNaN(newVal) && newVal !== v) handleItemChange(record.id, index, 'riskPoints', newVal);
                  }}
                />
              ),
            },
            {
              title: 'Severity',
              dataIndex: 'severity',
              key: 'severity',
              width: 120,
               render: (v, item, index) => (
                <Select
                  size="small"
                  defaultValue={v || 'LOW'}
                  style={{ width: '100%' }}
                   onChange={(val) => handleItemChange(record.id, index, 'severity', val)}
                  options={[
                    { label: 'Critical', value: 'CRITICAL' },
                    { label: 'High', value: 'HIGH' },
                    { label: 'Medium', value: 'MEDIUM' },
                    { label: 'Low', value: 'LOW' },
                  ]}
                />
              ),
            },
            {
              title: 'Active',
               dataIndex: 'isActive',
               key: 'isActive',
              width: 80,
               render: (v, item, index) => (
                <Switch
                  size="small"
                  defaultChecked={v !== false}
                   onChange={(checked) => handleItemChange(record.id, index, 'isActive', checked)}
                />
              ),
            },
            {
              title: t('actions', 'Actions'),
              key: 'actions',
              width: 80,
               render: (_, item, index) => (
                <Popconfirm
                  title="Delete this item?"
                   onConfirm={() => handleDeleteItem(record.id, index)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                </Popconfirm>
              ),
            },
          ]}
          locale={{ emptyText: <Empty description="No items" /> }}
        />
      </div>
    );
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Shared',
      dataIndex: 'shared',
      key: 'shared',
      width: 100,
      render: (v) => (v ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: 'Items',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      width: 80,
      align: 'center',
       render: (v, record) => v ?? record.items?.length ?? 0,
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm
            title={t('confirmDelete', 'Delete this option list?')}
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
            { title: <Text>Option Lists</Text> },
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
            <UnorderedListOutlined style={{ marginRight: 8 }} />
            Option Lists
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchLists}>
              {t('reset', 'Refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
              Create Option List
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={lists}
            expandable={{
              expandedRowRender,
              onExpand: handleExpand,
            }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No option lists found" /> }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingList ? 'Edit Option List' : 'Create Option List'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText={t('save', 'Save')}
        cancelText={t('cancel', 'Cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Code"
            rules={[{ required: true, message: 'Code is required' }]}
          >
            <Input placeholder="e.g. YES_NO" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Yes/No Options" />
          </Form.Item>
          <Form.Item name="isShared" label="Shared" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OptionListManager;
