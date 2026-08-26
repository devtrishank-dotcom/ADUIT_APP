import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Form, Input, Switch, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  TeamOutlined, LockOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const UserManager = () => {
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.users.list();
      setUsers(res.data?.data || res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiFunctions.masters.branches.list();
      setBranches(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiFunctions.rbac.listRoles();
      setRoles(res.data?.data || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchRoles();
  }, [fetchUsers, fetchBranches, fetchRoles]);

  const openModal = (record = null) => {
    setEditingUser(record);
    if (record) {
      form.setFieldsValue({
        employeeCode: record.employeeCode,
        name: record.name,
        email: record.email,
        mobile: record.mobile,
        designation: record.designation,
        department: record.department,
        branchId: record.branchId,
        roleIds: record.roles?.map((r) => r.id) || record.roleIds || [],
        status: record.status !== 'INACTIVE',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: true });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        employeeCode: values.employeeCode,
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        designation: values.designation,
        department: values.department,
        branchId: values.branchId,
        roleIds: values.roleIds,
        status: values.status ? 'ACTIVE' : 'INACTIVE',
      };
      if (!editingUser && values.password) {
        payload.password = values.password;
      }
      if (editingUser) {
        await apiFunctions.users.update(editingUser.id, payload);
        message.success('User updated');
      } else {
        await apiFunctions.users.create(payload);
        message.success('User created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFunctions.users.delete(id);
      message.success('User deleted');
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiFunctions.users.update(record.id, { status: newStatus });
      message.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = (userId) => {
    Modal.confirm({
      title: 'Reset Password',
      content: (
        <div style={{ marginTop: 16 }}>
          <Input.Password id="newPassword" placeholder="Enter new password" style={{ width: '100%' }} />
        </div>
      ),
      onOk: async () => {
        const pwd = document.getElementById('newPassword')?.value;
        if (!pwd) {
          message.error('Password is required');
          return Promise.reject();
        }
        try {
          await apiFunctions.auth.changePassword({ userId, newPassword: pwd });
          message.success('Password reset successfully');
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to reset password');
          return Promise.reject();
        }
      },
    });
  };

  const getBranchName = (id) => {
    const found = branches.find((b) => b.id === id);
    return found?.name || id || '-';
  };

  const columns = [
    {
      title: 'Employee Code',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      width: 130,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('branch', 'Branch'),
      dataIndex: 'branchId',
      key: 'branchId',
      width: 130,
      render: getBranchName,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 180,
      render: (roles) => (
        <Space size={[2, 2]} wrap>
          {(roles || []).map((r) => (
            <Tag key={r.id || r} color="geekblue">{r.name || r}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v) => (
        <Tag icon={v === 'ACTIVE' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={v === 'ACTIVE' ? 'green' : 'default'}>
          {v === 'ACTIVE' ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Tag>
      ),
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          {editingUser && (
            <Tooltip title="Reset Password">
              <Button size="small" icon={<LockOutlined />} onClick={() => handleResetPassword(record.id)} />
            </Tooltip>
          )}
          <Popconfirm
            title={`${record.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} this user?`}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button size="small" type="text"
              icon={record.status === 'ACTIVE' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              danger={record.status === 'ACTIVE'} />
          </Popconfirm>
          <Popconfirm
            title={t('confirmDelete', 'Delete this user?')}
            onConfirm={() => handleDelete(record.id)}
            okButtonProps={{ danger: true }}
          >
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
            { title: <Text>{t('users', 'Users')}</Text> },
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
            <TeamOutlined style={{ marginRight: 8 }} />
            {t('users', 'User Management')}
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              {t('reset', 'Refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
              Create User
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={users}
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No users found" /> }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText={t('save', 'Save')}
        cancelText={t('cancel', 'Cancel')}
        width={640}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="employeeCode"
              label={t('employeeCode', 'Employee Code')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g. EMP001" disabled={!!editingUser} />
            </Form.Item>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Full name" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="email@example.com" />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile" style={{ flex: 1 }}>
              <Input placeholder="Mobile number" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="designation" label="Designation" style={{ flex: 1 }}>
              <Input placeholder="Job title" />
            </Form.Item>
            <Form.Item name="department" label="Department" style={{ flex: 1 }}>
              <Input placeholder="Department" />
            </Form.Item>
          </div>
          <Form.Item name="branchId" label={t('branch', 'Branch')}>
            <Select
              showSearch
              placeholder="Select branch"
              optionFilterProp="label"
              allowClear
              options={branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))}
            />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label={t('password', 'Password')}
              rules={[{ required: !editingUser, message: 'Password is required' }]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}
          <Form.Item name="roleIds" label="Roles">
            <Select
              mode="multiple"
              placeholder="Select roles"
              optionFilterProp="label"
              options={roles.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item name="status" label={t('status', 'Status')} valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManager;
