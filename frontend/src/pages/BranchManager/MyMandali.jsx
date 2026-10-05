import React, { useState, useEffect, useCallback } from 'react';
import { Breadcrumb, Card, Table, Tag, Typography, Spin, Empty, Button, Modal, Form, Input, Space, Popconfirm } from 'antd';
import { BankOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;

const MyMandali = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const lang = language;

  const [loading, setLoading] = useState(true);
  const [pacs, setPacs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPac, setEditingPac] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchPacs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.masters.pacs.list();
      setPacs(res.data?.data || res.data || []);
    } catch {
      setPacs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacs();
  }, [fetchPacs]);

  const openCreate = () => {
    setEditingPac(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingPac(record);
    form.setFieldsValue({
      name: record.name,
      registrationNumber: record.registrationNumber,
      taluka: record.taluka,
      village: record.village,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editingPac) {
        await apiFunctions.masters.pacs.update(editingPac.id || editingPac._id, vals);
        message.success(lang === 'gu' ? 'મંડળી અપડેટ થઈ' : 'Mandali updated');
      } else {
        await apiFunctions.masters.pacs.create({
          name: vals.name,
          registrationNumber: vals.registrationNumber,
          linkedBranch: user?.branch,
          taluka: vals.taluka,
          village: vals.village,
          status: 'active',
        });
        message.success(lang === 'gu' ? 'મંડળી બનાવી દીધી' : 'Mandali created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchPacs();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || err.response?.data?.message || (lang === 'gu' ? 'મંડળી સાચવવામાં નિષ્ફળ' : 'Failed to save mandali'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiFunctions.masters.pacs.delete(record.id || record._id);
      message.success(lang === 'gu' ? 'મંડળી કાઢી નાખી' : 'Mandali deleted');
      fetchPacs();
    } catch (err) {
      message.error(err.response?.data?.error || err.response?.data?.message || (lang === 'gu' ? 'કાઢવામાં નિષ્ફળ' : 'Failed to delete'));
    }
  };

  const columns = [
    {
      title: lang === 'gu' ? 'મંડળીનું નામ' : 'Mandali Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: lang === 'gu' ? 'નોંધણી નંબર' : 'Registration No.',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber',
      width: 180,
      render: (v) => v || '-',
    },
    {
      title: lang === 'gu' ? 'તાલુકા' : 'Taluka',
      dataIndex: 'taluka',
      key: 'taluka',
      width: 140,
      render: (v) => v || '-',
    },
    {
      title: lang === 'gu' ? 'ગામ' : 'Village',
      dataIndex: 'village',
      key: 'village',
      width: 180,
      render: (v) => v || '-',
    },
    {
      title: lang === 'gu' ? 'શાખા' : 'Branch',
      dataIndex: 'linkedBranch',
      key: 'linkedBranch',
      width: 200,
      render: (v) => {
        if (!v) return '-';
        if (typeof v === 'object') return v.name || v.code || '-';
        return v;
      },
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || '-'}</Tag>,
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={lang === 'gu' ? 'મંડળી કાઢી નાખવી?' : 'Delete this mandali?'}
            onConfirm={() => handleDelete(record)}
            okText={lang === 'gu' ? 'હા' : 'Yes'}
            cancelText={lang === 'gu' ? 'ના' : 'No'}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home', onClick: () => navigate('/dashboard') },
            { title: lang === 'gu' ? 'મારી મંડળી' : 'My Mandali' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Title level={3} style={{ margin: 0 }}>
            <BankOutlined style={{ marginRight: 8 }} />
            {lang === 'gu' ? 'મારી મંડળી' : 'My Mandali'}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {lang === 'gu' ? 'નવી મંડળી બનાવો' : 'Create Mandali'}
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : pacs.length === 0 ? (
          <Empty description={lang === 'gu' ? 'કોઈ મંડળી નથી' : 'No mandali assigned'} />
        ) : (
          <Table
            columns={columns}
            dataSource={pacs}
            rowKey={(r) => r.id || r._id}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      <Modal
        title={editingPac ? (lang === 'gu' ? 'મંડળી સુધારો' : 'Edit Mandali') : (lang === 'gu' ? 'નવી મંડળી બનાવો' : 'Create Mandali')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText={lang === 'gu' ? 'સાચવો' : 'Save'}
        cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={lang === 'gu' ? 'મંડળીનું નામ' : 'Mandali Name'} rules={[{ required: true, message: lang === 'gu' ? 'નામ જરૂરી છે' : 'Name is required' }]}>
            <Input placeholder={lang === 'gu' ? 'મંડળીનું નામ' : 'Mandali name'} />
          </Form.Item>
          <Form.Item name="registrationNumber" label={lang === 'gu' ? 'નોંધણી નંબર' : 'Registration Number'}>
            <Input placeholder="REG-XXXX" />
          </Form.Item>
          <Form.Item name="taluka" label={lang === 'gu' ? 'તાલુકા' : 'Taluka'}>
            <Input placeholder={lang === 'gu' ? 'તાલુકા' : 'Taluka'} />
          </Form.Item>
          <Form.Item name="village" label={lang === 'gu' ? 'ગામ' : 'Village'}>
            <Input placeholder={lang === 'gu' ? 'ગામ' : 'Village'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyMandali;
