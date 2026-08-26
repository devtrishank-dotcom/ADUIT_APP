import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Row, Col, Statistic, Table, Button, Modal,
  Form, Input, Select, DatePicker, Tag, Space, Popconfirm, Typography,
} from 'antd';
import {
  PlusOutlined, UploadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, SyncOutlined,
  PlayCircleOutlined, EditOutlined, CalendarOutlined, DeleteOutlined,
  SendOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const statusConfig = {
  Planned: { color: 'default', label: 'Planned' },
  InProgress: { color: 'processing', label: 'In Progress' },
  Completed: { color: 'success', label: 'Completed' },
  Missed: { color: 'error', label: 'Missed' },
  Cancelled: { color: 'warning', label: 'Cancelled' },
};

const priorityConfig = {
  High: 'red',
  Medium: 'orange',
  Low: 'green',
};

const AuditPlanList = () => {
  const { user, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;

  const [plans, setPlans] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0, missed: 0 });
  const [years, setYears] = useState([]);
  const [auditTypes, setAuditTypes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [filters, setFilters] = useState({ financialYear: undefined, auditType: undefined });

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [autoGenerateModalVisible, setAutoGenerateModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [createPlanModalVisible, setCreatePlanModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [rescheduleForm] = Form.useForm();
  const [createPlanForm] = Form.useForm();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.planning.plans.list();
      const planList = res.data?.data || res.data || [];
      setPlans(planList);
      if (planList.length > 0) {
        const active = planList.find((p) => p.status === 'Active') || planList[0];
        setSelectedPlan(active);
      }
    } catch {
      message.error(lang === 'gu' ? 'યોજનાઓ લોડ કરવામાં નિષ્ફળ' : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const fetchItems = useCallback(async (planId) => {
    if (!planId) return;
    setLoading(true);
    try {
      const res = await apiFunctions.planning.plans.items.list(planId);
      const rawItems = res.data?.data || res.data || [];
      const itemList = rawItems.map((item) => ({
        ...item,
        id: item.id || item._id,
        auditTypeId: item.auditType?._id || item.auditType?.id || item.auditType,
        auditTypeCode: item.auditType?.code || item.auditType,
        auditType: item.auditType?.name || item.auditType?.code || item.auditType,
        assignedTo: item.assignedTo?._id || item.assignedTo?.id || item.assignedTo,
        assignedToName: item.assignedTo?.name || item.assignedToName,
        plannedStartDate: item.plannedStart || item.plannedStartDate,
        plannedEndDate: item.plannedEnd || item.plannedEndDate,
        actualStartDate: item.actualStart || item.actualStartDate,
        actualEndDate: item.actualEnd || item.actualEndDate,
        entityName: item.entityName || `${item.entityType || 'Entity'} (${String(item.entityId).slice(-6)})`,
      }));
      setItems(itemList);
      const ttl = itemList.length;
      const ip = itemList.filter((i) => i.status === 'InProgress').length;
      const cmp = itemList.filter((i) => i.status === 'Completed').length;
      const msd = itemList.filter((i) => i.status === 'Missed').length;
      setStats({ total: ttl, inProgress: ip, completed: cmp, missed: msd });
    } catch {
      message.error(lang === 'gu' ? 'આઇટમો લોડ કરવામાં નિષ્ફળ' : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const fetchMasters = useCallback(async () => {
    try {
      const [fyRes, atRes, branchRes, pacsRes] = await Promise.all([
        apiFunctions.masters.financialYears.list(),
        apiFunctions.masters.auditTypes.list(),
        apiFunctions.masters.branches.list(),
        apiFunctions.masters.pacs.list(),
      ]);
      setYears(fyRes.data?.data || fyRes.data || []);
      setAuditTypes(atRes.data?.data || atRes.data || []);
      const branchOptions = (branchRes.data?.data || branchRes.data || []).map((branch) => ({
        value: branch.id || branch._id,
        label: `Branch - ${branch.name || branch.code}`,
      }));
      const pacsOptions = (pacsRes.data?.data || pacsRes.data || []).map((pacs) => ({
        value: pacs.id || pacs._id,
        label: `PACS - ${pacs.name}`,
      }));
      setEntities([...branchOptions, ...pacsOptions]);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMasters();
    fetchPlans();
  }, [fetchMasters, fetchPlans]);

  useEffect(() => {
    if (selectedPlan) {
      fetchItems(selectedPlan.id);
    }
  }, [selectedPlan, fetchItems]);

  const filteredItems = items.filter((item) => {
    if (filters.auditType && item.auditTypeCode !== filters.auditType) return false;
    return true;
  });

  const handleCreatePlan = async (values) => {
    try {
      await apiFunctions.planning.plans.create({ financialYear: values.financialYear });
      message.success(lang === 'gu' ? 'નવી યોજના બનાવાઈ' : 'New plan created');
      setCreatePlanModalVisible(false);
      createPlanForm.resetFields();
      fetchPlans();
    } catch {
      message.error(lang === 'gu' ? 'યોજના બનાવવામાં નિષ્ફળ' : 'Failed to create plan');
    }
  };

  const handleAddItem = async (values) => {
    try {
      const auditType = auditTypes.find((item) => (item.code || item.name) === values.auditType || (item.id || item._id) === values.auditType);
      await apiFunctions.planning.plans.items.create(selectedPlan.id, {
        entityType: values.entityType,
        entityId: values.entityId,
        auditType: auditType?.id || auditType?._id || values.auditType,
        assignedTo: values.assignedTo,
        priority: values.priority || 'Medium',
        periodFrom: values.periodRange?.[0]?.toISOString(),
        periodTo: values.periodRange?.[1]?.toISOString(),
        plannedStart: values.plannedRange?.[0]?.toISOString(),
        plannedEnd: values.plannedRange?.[1]?.toISOString(),
      });
      message.success(lang === 'gu' ? 'આઇટમ ઉમેરાઈ' : 'Item added successfully');
      setAddModalVisible(false);
      addForm.resetFields();
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'આઇટમ ઉમેરવામાં નિષ્ફળ' : 'Failed to add item');
    }
  };

  const handleEditItem = async (values) => {
    try {
      await apiFunctions.planning.plans.items.update(selectedPlan.id, editingItem.id, {
        ...values,
        plannedStartDate: values.plannedRange?.[0]?.toISOString(),
        plannedEndDate: values.plannedRange?.[1]?.toISOString(),
      });
      message.success(lang === 'gu' ? 'આઇટમ અપડેટ થઈ' : 'Item updated');
      setEditModalVisible(false);
      setEditingItem(null);
      editForm.resetFields();
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'આઇટમ અપડેટ કરવામાં નિષ્ફળ' : 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await apiFunctions.planning.plans.items.delete(selectedPlan.id, itemId);
      message.success(lang === 'gu' ? 'આઇટમ કાઢી નાખી' : 'Item deleted');
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'આઇટમ કાઢવામાં નિષ્ફળ' : 'Failed to delete item');
    }
  };

  const handleStartAudit = async (item) => {
    try {
      await apiFunctions.audit.create({
        planItem: item.id,
        auditType: item.auditTypeId,
        entityType: item.entityType,
        entityId: item.entityId,
        periodFrom: item.periodFrom,
        periodTo: item.periodTo,
      });
      await apiFunctions.planning.plans.items.update(selectedPlan.id, item.id, {
        status: 'InProgress',
        actualStart: new Date().toISOString(),
      });
      message.success(lang === 'gu' ? 'ઓડિટ શરૂ થયું' : 'Audit started');
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'ઓડિટ શરૂ કરવામાં નિષ્ફળ' : 'Failed to start audit');
    }
  };

  const handleReschedule = async (values) => {
    try {
      await apiFunctions.planning.plans.items.update(selectedPlan.id, rescheduleItem.id, {
        ...rescheduleItem,
        plannedStartDate: values.plannedRange?.[0]?.toISOString(),
        plannedEndDate: values.plannedRange?.[1]?.toISOString(),
      });
      message.success(lang === 'gu' ? 'ફરી શેડ્યૂલ થઈ ગયું' : 'Rescheduled');
      setRescheduleModalVisible(false);
      setRescheduleItem(null);
      rescheduleForm.resetFields();
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'ફરી શેડ્યૂલ કરવામાં નિષ્ફળ' : 'Failed to reschedule');
    }
  };

  const handleAutoGenerate = async () => {
    try {
      await apiFunctions.planning.plans.autoGenerate({ planId: selectedPlan.id });
      message.success(lang === 'gu' ? 'યોજના auto-generate થઈ' : 'Plan auto-generated');
      setAutoGenerateModalVisible(false);
      fetchItems(selectedPlan.id);
    } catch {
      message.error(lang === 'gu' ? 'Auto-generate નિષ્ફળ' : 'Auto-generate failed');
    }
  };

  const handleBulkImport = async (values) => {
    try {
      const parsed = JSON.parse(values.jsonData);
      await apiFunctions.planning.plans.items.bulkImport(selectedPlan.id, parsed);
      message.success(lang === 'gu' ? 'બલ્ક આયાત સફળ' : 'Bulk import successful');
      setBulkModalVisible(false);
      fetchItems(selectedPlan.id);
    } catch (err) {
      message.error(
        lang === 'gu'
          ? 'બલ્ક આયાત નિષ્ફળ. માન્ય JSON દાખલ કરો.'
          : 'Bulk import failed. Enter valid JSON.'
      );
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setSubmitLoading(true);
      await apiFunctions.planning.plans.submit(selectedPlan.id);
      message.success(lang === 'gu' ? 'યોજના મંજૂરી માટે સબમિટ થઈ' : 'Plan submitted for approval');
    } catch {
      message.error(lang === 'gu' ? 'સબમિટ નિષ્ફળ' : 'Submit failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const canEdit = hasPermission && hasPermission('planning', 'edit');

  const columns = [
    {
      title: lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 180,
    },
    {
      title: lang === 'gu' ? 'એન્ટિટી પ્રકાર' : 'Entity Type',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 120,
      render: (val) => (
        <Tag color={val === 'Branch' ? 'blue' : 'orange'}>{val}</Tag>
      ),
    },
    {
      title: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
      dataIndex: 'auditType',
      key: 'auditType',
      width: 130,
    },
    {
      title: lang === 'gu' ? 'અવધિ' : 'Period',
      key: 'period',
      width: 160,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {record.periodFrom ? dayjs(record.periodFrom).format('DD/MM/YYYY') : '-'}
          {' - '}
          {record.periodTo ? dayjs(record.periodTo).format('DD/MM/YYYY') : '-'}
        </Text>
      ),
    },
    {
      title: lang === 'gu' ? 'આયોજિત શરૂઆત' : 'Planned Start',
      dataIndex: 'plannedStartDate',
      key: 'plannedStartDate',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'આયોજિત અંત' : 'Planned End',
      dataIndex: 'plannedEndDate',
      key: 'plannedEndDate',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'વાસ્તવિક શરૂઆત' : 'Actual Start',
      dataIndex: 'actualStartDate',
      key: 'actualStartDate',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'વાસ્તવિક અંત' : 'Actual End',
      dataIndex: 'actualEndDate',
      key: 'actualEndDate',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'સોંપાયેલ' : 'Assigned To',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      width: 140,
    },
    {
      title: lang === 'gu' ? 'પ્રાથમિકતા' : 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (val) => (
        <Tag color={priorityConfig[val] || 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (val) => {
        const config = statusConfig[val] || { color: 'default', label: val };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'Planned' && record.assignedTo === user?.id && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartAudit(record)}
            >
              {lang === 'gu' ? 'શરૂ' : 'Start'}
            </Button>
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingItem(record);
                editForm.setFieldsValue({
                  ...record,
                  plannedRange: record.plannedStartDate && record.plannedEndDate
                    ? [dayjs(record.plannedStartDate), dayjs(record.plannedEndDate)]
                    : undefined,
                });
                setEditModalVisible(true);
              }}
            />
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => {
                setRescheduleItem(record);
                rescheduleForm.setFieldsValue({
                  plannedRange: record.plannedStartDate && record.plannedEndDate
                    ? [dayjs(record.plannedStartDate), dayjs(record.plannedEndDate)]
                    : undefined,
                });
                setRescheduleModalVisible(true);
              }}
            />
          )}
          {canEdit && (
            <Popconfirm
              title={lang === 'gu' ? 'આ આઇટમ કાઢી નાખવી?' : 'Delete this item?'}
              onConfirm={() => handleDeleteItem(record.id)}
              okText={lang === 'gu' ? 'હા' : 'Yes'}
              cancelText={lang === 'gu' ? 'ના' : 'No'}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'આયોજન' : 'Planning' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'ઓડિટ યોજના સૂચિ' : 'Audit Plan List'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'કુલ આયોજિત' : 'Total Planned'}
              value={stats.total}
              prefix={<CheckCircleOutlined style={{ color: '#141416', fontSize: 20 }} />}
              valueStyle={{ color: '#141416' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'પ્રગતિમાં' : 'In Progress'}
              value={stats.inProgress}
              prefix={<SyncOutlined spin style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'પૂર્ણ' : 'Completed'}
              value={stats.completed}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'ચૂકી ગયેલ' : 'Missed'}
              value={stats.missed}
              prefix={<CloseCircleOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle" wrap>
          <Col xs={24} sm={8}>
            <Select
              placeholder={lang === 'gu' ? 'નાણાકીય વર્ષ' : 'Financial Year'}
              style={{ width: '100%' }}
              value={selectedPlan?.id}
              onChange={(val) => {
                const plan = plans.find((p) => p.id === val);
                setSelectedPlan(plan);
              }}
              options={plans.map((p) => ({
                value: p.id,
                label: p.name || p.financialYear?.code || p.financialYear?.name || p.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
              style={{ width: '100%' }}
              allowClear
              value={filters.auditType}
              onChange={(val) => setFilters((prev) => ({ ...prev, auditType: val }))}
              options={auditTypes.map((at) => ({
                value: at.code || at.name,
                label: at.name || at.code,
              }))}
            />
          </Col>
          <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  createPlanForm.resetFields();
                  setCreatePlanModalVisible(true);
                }}
              >
                {lang === 'gu' ? 'નવી યોજના' : 'New Plan'}
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => setAutoGenerateModalVisible(true)}
                disabled={!selectedPlan}
              >
                {lang === 'gu' ? 'Auto-Generate' : 'Auto-Generate Plan'}
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setBulkModalVisible(true)}
                disabled={!selectedPlan}
              >
                {lang === 'gu' ? 'બલ્ક આયાત' : 'Bulk Import'}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  addForm.resetFields();
                  setAddModalVisible(true);
                }}
                disabled={!selectedPlan}
              >
                {lang === 'gu' ? 'આઇટમ ઉમેરો' : 'Add Item'}
              </Button>
              <Button
                type="primary"
                danger
                icon={<SendOutlined />}
                loading={submitLoading}
                onClick={handleSubmitForApproval}
                disabled={!selectedPlan}
              >
                {lang === 'gu' ? 'મંજૂરી માટે સબમિટ' : 'Submit for Approval'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (ttl) =>
              lang === 'gu' ? `કુલ ${ttl} આઇટમો` : `Total ${ttl} items`,
          }}
          locale={{
            emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data',
          }}
        />
      </Card>

      <Modal
        title={lang === 'gu' ? 'નવી ઓડિટ યોજના' : 'Create New Audit Plan'}
        open={createPlanModalVisible}
        onOk={() => createPlanForm.submit()}
        onCancel={() => { setCreatePlanModalVisible(false); createPlanForm.resetFields(); }}
        destroyOnHidden
      >
        <Form form={createPlanForm} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item
            name="financialYear"
            label={lang === 'gu' ? 'નાણાકીય વર્ષ' : 'Financial Year'}
            rules={[{ required: true, message: lang === 'gu' ? 'નાણાકીય વર્ષ પસંદ કરો' : 'Select financial year' }]}
          >
            <Select
              placeholder={lang === 'gu' ? 'નાણાકીય વર્ષ પસંદ કરો' : 'Select financial year'}
              options={years.map((year) => ({ value: year.id || year._id, label: year.code }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'આઇટમ ઉમેરો' : 'Add Plan Item'}
        open={addModalVisible}
        onOk={() => addForm.submit()}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); }}
        width={640}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddItem}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="entityName"
                label={lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name'}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="entityType"
                label={lang === 'gu' ? 'એન્ટિટી પ્રકાર' : 'Entity Type'}
                rules={[{ required: true }]}
              >
                <Select options={[
                  { value: 'Branch', label: lang === 'gu' ? 'શાખા' : 'Branch' },
                  { value: 'PACS', label: 'PACS' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="entityId"
                label={lang === 'gu' ? 'એન્ટિટી પસંદ કરો' : 'Select Entity'}
                rules={[{ required: true }]}
              >
                <Select showSearch optionFilterProp="label" options={entities} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="auditType"
                label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
                rules={[{ required: true }]}
              >
                <Select options={auditTypes.map((at) => ({ value: at.code || at.name, label: at.name || at.code }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="assignedTo"
                label={lang === 'gu' ? 'સોંપાયેલ' : 'Assigned To'}
              >
                <Select placeholder={lang === 'gu' ? 'ઓડિટર પસંદ કરો' : 'Select auditor'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label={lang === 'gu' ? 'પ્રાથમિકતા' : 'Priority'}
              >
                <Select options={[
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="periodRange"
                label={lang === 'gu' ? 'ઓડિટ અવધિ' : 'Audit Period'}
                rules={[{ required: true }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="plannedRange"
                label={lang === 'gu' ? 'આયોજિત તારીખો' : 'Planned Dates'}
                rules={[{ required: true }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'આઇટમ સંપાદિત કરો' : 'Edit Plan Item'}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => { setEditModalVisible(false); setEditingItem(null); editForm.resetFields(); }}
        width={640}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditItem}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="entityName" label={lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name'} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="entityType" label={lang === 'gu' ? 'એન્ટિટી પ્રકાર' : 'Entity Type'} rules={[{ required: true }]}>
                <Select options={[
                  { value: 'Branch', label: lang === 'gu' ? 'શાખા' : 'Branch' },
                  { value: 'PACS', label: 'PACS' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditType" label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'} rules={[{ required: true }]}>
                <Select options={auditTypes.map((at) => ({ value: at.code || at.name, label: at.name || at.code }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignedTo" label={lang === 'gu' ? 'સોંપાયેલ' : 'Assigned To'}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label={lang === 'gu' ? 'પ્રાથમિકતા' : 'Priority'}>
                <Select options={[
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={lang === 'gu' ? 'સ્થિતિ' : 'Status'}>
                <Select options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="plannedRange" label={lang === 'gu' ? 'આયોજિત તારીખો' : 'Planned Dates'}>
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'ફરી શેડ્યૂલ' : 'Reschedule'}
        open={rescheduleModalVisible}
        onOk={() => rescheduleForm.submit()}
        onCancel={() => { setRescheduleModalVisible(false); setRescheduleItem(null); rescheduleForm.resetFields(); }}
        destroyOnHidden
      >
        <Form form={rescheduleForm} layout="vertical" onFinish={handleReschedule}>
          <Form.Item
            name="plannedRange"
            label={lang === 'gu' ? 'નવી આયોજિત તારીખો' : 'New Planned Dates'}
            rules={[{ required: true }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'Auto-Generate યોજના' : 'Auto-Generate Plan'}
        open={autoGenerateModalVisible}
        onOk={handleAutoGenerate}
        onCancel={() => setAutoGenerateModalVisible(false)}
        okText={lang === 'gu' ? 'Generate કરો' : 'Generate'}
      >
        <Text>
          {lang === 'gu'
            ? 'શું તમે ખરેખર બધી શાખાઓ/PACS માટે આપોઆપ ઓડિટ આઇટમો જનરેટ કરવા માંગો છો?'
            : 'Are you sure you want to auto-generate audit items for all branches/PACS?'}
        </Text>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'બલ્ક આયાત' : 'Bulk Import'}
        open={bulkModalVisible}
        onCancel={() => setBulkModalVisible(false)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        <Form onFinish={handleBulkImport} layout="vertical">
          <Form.Item
            name="jsonData"
            label={lang === 'gu' ? 'JSON ડેટા' : 'JSON Data'}
            rules={[{ required: true }]}
            extra={lang === 'gu' ? 'ઓડિટ આઇટમોની JSON એરે પેસ્ટ કરો' : 'Paste JSON array of audit items'}
          >
            <TextArea rows={12} placeholder='[{"entityName": "Branch A", "entityType": "Branch", ...}]' />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
              {lang === 'gu' ? 'આયાત કરો' : 'Import'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lang === 'gu' ? 'મંજૂરી માટે સબમિટ' : 'Submit for Approval'}
        open={submitLoading}
        onOk={handleSubmitForApproval}
        onCancel={() => setSubmitLoading(false)}
        okText={lang === 'gu' ? 'સબમિટ કરો' : 'Submit'}
        okButtonProps={{ loading: submitLoading }}
      >
        <Text>
          {lang === 'gu'
            ? 'શું તમે ખરેખર આ યોજના મંજૂરી માટે સબમિટ કરવા માંગો છો?'
            : 'Are you sure you want to submit this plan for approval?'}
        </Text>
      </Modal>
    </div>
  );
};

export default AuditPlanList;
