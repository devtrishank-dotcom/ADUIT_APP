import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Drawer, Select, Space, Typography, Card, Breadcrumb,
  Spin, Empty, Popconfirm, Form, Input, Checkbox, Divider, Badge, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SafetyOutlined, LockOutlined,
} from '@ant-design/icons';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const MODULES = [
  'dashboard', 'templates', 'masters', 'users', 'rbac',
  'planning', 'audit', 'compliance', 'closure', 'reports',
  'notifications', 'workflows', 'riskConfigs', 'valueStatements',
  'optionLists',
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'configure'];

const DASHBOARD_WIDGETS = [
  'planVsActual', 'riskTrend', 'observationRegister',
  'complianceAgeing', 'recentAudits', 'pendingApprovals', 'notifications',
];

const getId = (value) => value?._id || value?.id || value;

const normalizeAction = (action) => ({
  read: 'view',
  update: 'edit',
}[String(action || '').toLowerCase()] || String(action || '').toLowerCase());

const isAdministratorRole = (role) => {
  const name = String(role?.name || '').trim().toUpperCase().replace(/\s+/g, '_');
  return ['SYSTEM_ADMINISTRATOR', 'ADMIN', 'SUPER_ADMIN'].includes(name);
};

const RoleManager = () => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [scopeRules, setScopeRules] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [permMatrix, setPermMatrix] = useState({});

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.rbac.listRoles();
      setRoles(res.data?.data || res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [permRes, scopeRes] = await Promise.all([
        apiFunctions.rbac.listPermissions(),
        apiFunctions.rbac.dataScopeRules(),
      ]);
      setPermissions(permRes.data?.data || permRes.data || []);
      setScopeRules(scopeRes.data?.data || scopeRes.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchMeta();
  }, [fetchRoles, fetchMeta]);

  const openDrawer = (record = null) => {
    setEditingRole(record);
    const matrix = {};
    MODULES.forEach((mod) => {
      ACTIONS.forEach((act) => {
        matrix[`${mod}:${act}`] = false;
      });
    });
    if (record) {
      form.setFieldsValue({
        name: record.name,
        description: record.description,
        dataScopeRuleId: getId(record.dataScopeRule),
        dashboardWidgets: record.dashboardConfig?.widgets || [],
      });
      if (isAdministratorRole(record)) {
        MODULES.forEach((mod) => ACTIONS.forEach((act) => {
          matrix[`${mod}:${act}`] = true;
        }));
      } else {
        (record.permissions || []).forEach((p) => {
          const actions = p.actions || (p.action ? [p.action] : []);
          actions.forEach((action) => {
            const normalized = normalizeAction(action);
            if (ACTIONS.includes(normalized)) matrix[`${p.module}:${normalized}`] = true;
          });
        });
      }
    } else {
      form.resetFields();
    }
    setPermMatrix(matrix);
    setDrawerOpen(true);
  };

  const handlePermChange = (mod, act, checked) => {
    setPermMatrix((prev) => ({ ...prev, [`${mod}:${act}`]: checked }));
  };

  const handleSelectAllModule = (mod, checked) => {
    setPermMatrix((prev) => {
      const next = { ...prev };
      ACTIONS.forEach((act) => {
        next[`${mod}:${act}`] = checked;
      });
      return next;
    });
  };

  const handleSelectAllAction = (act, checked) => {
    setPermMatrix((prev) => {
      const next = { ...prev };
      MODULES.forEach((mod) => {
        next[`${mod}:${act}`] = checked;
      });
      return next;
    });
  };

  const handleModuleAllChecked = (mod) => {
    return ACTIONS.every((act) => permMatrix[`${mod}:${act}`]);
  };

  const handleModuleIndeterminate = (mod) => {
    const some = ACTIONS.some((act) => permMatrix[`${mod}:${act}`]);
    const all = ACTIONS.every((act) => permMatrix[`${mod}:${act}`]);
    return some && !all;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const permList = [];
      Object.entries(permMatrix).forEach(([key, checked]) => {
        if (checked) {
          const [module, action] = key.split(':');
          permList.push({ module, actions: [action] });
        }
      });
      const payload = {
        name: values.name,
        description: values.description,
        dataScopeRule: values.dataScopeRule || values.dataScopeRuleId || null,
        dashboardConfig: { widgets: values.dashboardWidgets || [] },
        permissions: permList,
      };
      if (editingRole) {
        await apiFunctions.rbac.updateRole(getId(editingRole), payload);
        message.success('Role updated');
      } else {
        await apiFunctions.rbac.createRole(payload);
        message.success('Role created');
      }
      setDrawerOpen(false);
      fetchRoles();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, isSystem) => {
    if (isSystem) {
      message.error('System roles cannot be deleted');
      return;
    }
    try {
      await apiFunctions.rbac.deleteRole(id);
      message.success('Role deleted');
      fetchRoles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (v, record) => (
        <Space>
          {v}
          {record.isSystemRole && (
            <Tooltip title="System Role">
              <span>
                <Badge status="processing" />
              </span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'System Role',
      dataIndex: 'isSystemRole',
      key: 'isSystemRole',
      width: 110,
      align: 'center',
      render: (v) => v ? <Tag color="purple">System</Tag> : <Tag>Custom</Tag>,
    },
    {
      title: 'Users',
      dataIndex: 'usersCount',
      key: 'usersCount',
      width: 80,
      align: 'center',
      render: (v) => v ?? 0,
    },
    {
      title: t('actions', 'Actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          <Popconfirm
            title={record.isSystemRole ? 'System roles cannot be deleted' : t('confirmDelete')}
            onConfirm={() => handleDelete(getId(record), record.isSystemRole)}
            okButtonProps={{ danger: true, disabled: record.isSystemRole }}
            disabled={record.isSystemRole}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={record.isSystemRole} />
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
            { title: <Text>{t('rbac', 'Role Management')}</Text> },
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
            <SafetyOutlined style={{ marginRight: 8 }} />
            {t('rbac', 'Role-Based Access Control')}
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRoles}>
              {t('reset', 'Refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer(null)}>
              Create Role
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={roles}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No roles defined" /> }}
          />
        </Spin>
      </Card>

      <Drawer
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); }}
        width={800}
        extra={
          <Space>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields(); }}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving}>
              {t('save', 'Save Role')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Role name is required' }]}
          >
            <Input placeholder="e.g. Auditor" disabled={editingRole?.isSystemRole} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Role description" />
          </Form.Item>

          <Divider>Permissions Matrix</Divider>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Configure module-level permissions for this role. Check the actions allowed.
          </Text>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #f0f0f0', minWidth: 140 }}>
                    Module
                  </th>
                  {ACTIONS.map((act) => (
                    <th key={act} style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid #f0f0f0', minWidth: 70 }}>
                      <Checkbox
                        onChange={(e) => handleSelectAllAction(act, e.target.checked)}
                        style={{ fontSize: 11 }}
                      >
                        {act.charAt(0).toUpperCase() + act.slice(1)}
                      </Checkbox>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod}>
                    <td style={{ padding: '6px 12px', border: '1px solid #f0f0f0' }}>
                      <Checkbox
                        checked={handleModuleAllChecked(mod)}
                        indeterminate={handleModuleIndeterminate(mod)}
                        onChange={(e) => handleSelectAllModule(mod, e.target.checked)}
                      >
                        <Text style={{ textTransform: 'capitalize' }}>{mod.replace(/([A-Z])/g, ' $1').trim()}</Text>
                      </Checkbox>
                    </td>
                    {ACTIONS.map((act) => (
                      <td key={act} style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #f0f0f0' }}>
                        <Checkbox
                          checked={permMatrix[`${mod}:${act}`]}
                          onChange={(e) => handlePermChange(mod, act, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider>Additional Settings</Divider>
          <Form.Item name="dataScopeRuleId" label="Data Scope Rule">
            <Select
              allowClear
              placeholder="Select data scope rule"
              options={(scopeRules || []).map((sr) => ({
                label: sr.name || sr.code,
                 value: getId(sr),
              }))}
            />
          </Form.Item>

          <Form.Item name="dashboardWidgets" label="Dashboard Widgets">
            <Select
              mode="multiple"
              placeholder="Select visible dashboard widgets"
              options={DASHBOARD_WIDGETS.map((w) => ({
                label: w.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
                value: w,
              }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default RoleManager;
