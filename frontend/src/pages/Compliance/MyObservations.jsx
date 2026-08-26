import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Row, Col, Card, Statistic, Table, Button,
  Select, DatePicker, Tag, Space, Modal, Form, Input,
  Typography, Upload, Tooltip, Badge,
} from 'antd';
import {
  EyeOutlined, SendOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FileTextOutlined, WarningOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import FileUpload from '../../components/common/FileUpload';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const severityConfig = {
  Critical: { color: 'red', labelEn: 'Critical', labelGu: 'ગંભીર' },
  High: { color: 'volcano', labelEn: 'High', labelGu: 'ઉચ્ચ' },
  Medium: { color: 'orange', labelEn: 'Medium', labelGu: 'મધ્યમ' },
  Low: { color: 'blue', labelEn: 'Low', labelGu: 'નીચું' },
};

const statusConfig = {
  Open: { color: 'red', labelEn: 'Open', labelGu: 'ખુલ્લું' },
  PartiallyComplied: { color: 'orange', labelEn: 'Partially Complied', labelGu: 'આંશિક અનુપાલન' },
  Complied: { color: 'green', labelEn: 'Complied', labelGu: 'અનુપાલિત' },
  Verified: { color: 'blue', labelEn: 'Verified', labelGu: 'ચકાસાયેલ' },
};

const MyObservations = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [observations, setObservations] = useState([]);
  const [stats, setStats] = useState({ totalOpen: 0, compliedThisMonth: 0, overdue: 0, verified: 0 });
  const [filters, setFilters] = useState({
    status: undefined,
    severity: undefined,
    entityType: undefined,
    dateRange: undefined,
  });
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [form] = Form.useForm();

  const fetchObservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.dateRange) {
        params.raisedDateFrom = filters.dateRange[0].toISOString();
        params.raisedDateTo = filters.dateRange[1].toISOString();
      }
      const res = await apiFunctions.compliance.listObservations(params);
       const rawList = res.data?.data || res.data || [];
       const list = rawList.map((observation) => ({
         ...observation,
         id: observation.id || observation._id,
       }));
      setObservations(list);

      const now = dayjs();
      const startOfMonth = now.startOf('month');
      setStats({
        totalOpen: list.filter((o) => o.status === 'Open').length,
        compliedThisMonth: list.filter(
          (o) => o.status === 'Complied' && o.compliedAt && dayjs(o.compliedAt).isAfter(startOfMonth),
        ).length,
        overdue: list.filter(
          (o) => o.status === 'Open' && o.targetDate && dayjs(o.targetDate).isBefore(now),
        ).length,
        verified: list.filter((o) => o.status === 'Verified').length,
      });
    } catch {
      message.error(lang === 'gu' ? 'નિરિક્ષણો લાવવામાં નિષ્ફળ' : 'Failed to fetch observations');
    } finally {
      setLoading(false);
    }
  }, [filters, lang]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const handleRespond = (record) => {
    setSelectedObs(record);
    form.resetFields();
    setUploadedFiles([]);
    setRespondModalOpen(true);
  };

  const handleSubmitResponse = async (values) => {
    setActionLoading(true);
    try {
      const payload = {
        description: values.response,
        actionType: 'Response',
        attachments: uploadedFiles.map((f) => f.id || f.uid),
        observationId: selectedObs.id,
      };
      await apiFunctions.compliance.submitAction(selectedObs.id, payload);
      message.success(lang === 'gu' ? 'પ્રતિભાવ સફળતાપૂર્વક સબમિટ થયો' : 'Response submitted successfully');
      setRespondModalOpen(false);
      form.resetFields();
      fetchObservations();
    } catch {
      message.error(lang === 'gu' ? 'પ્રતિભાવ સબમિટ કરવામાં નિષ્ફળ' : 'Failed to submit response');
    } finally {
      setActionLoading(false);
    }
  };

  const getDaysRemaining = (targetDate, status) => {
    if (status === 'Complied' || status === 'Verified') return null;
    if (!targetDate) return null;
    return dayjs(targetDate).diff(dayjs(), 'day');
  };

  const getAgeingColor = (days) => {
    if (days < 0) return '#b91c2c';
    if (days <= 7) return '#4a7c59';
    if (days <= 15) return '#c77d2e';
    if (days <= 30) return '#dd6b20';
    return '#b91c2c';
  };

  const handleExport = () => {
    message.info(lang === 'gu' ? 'નિકાસ સુવિધા ટૂંક સમયમાં ઉપલબ્ધ થશે' : 'Export feature coming soon');
  };

  const columns = [
    {
      title: lang === 'gu' ? 'નિરિક્ષણ શીર્ષક' : 'Observation Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (val, record) => (
        <a onClick={() => navigate(`/compliance/${record.id}`)}>
          {val || record.observationTitle || '-'}
        </a>
      ),
    },
    {
      title: lang === 'gu' ? 'એન્ટિટી' : 'Entity',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 140,
      render: (val, record) => val || record.entity || '-',
    },
    {
      title: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
      dataIndex: 'auditType',
      key: 'auditType',
      width: 120,
    },
    {
      title: lang === 'gu' ? 'ગંભીરતા' : 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (val) => {
        const cfg = severityConfig[val] || { color: 'default', labelEn: val, labelGu: val };
        return <Tag color={cfg.color}>{lang === 'gu' ? cfg.labelGu : cfg.labelEn}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'ઉઠાવવાની તારીખ' : 'Raised Date',
      dataIndex: 'raisedDate',
      key: 'raisedDate',
      width: 110,
      render: (val, record) => {
        const d = val || record.createdAt;
        return d ? dayjs(d).format('DD/MM/YYYY') : '-';
      },
    },
    {
      title: lang === 'gu' ? 'લક્ષ્ય તારીખ' : 'Target Date',
      dataIndex: 'targetDate',
      key: 'targetDate',
      width: 110,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: lang === 'gu' ? 'બાકી દિવસો' : 'Days Left',
      key: 'daysRemaining',
      width: 100,
      render: (_, record) => {
        const days = getDaysRemaining(record.targetDate, record.status);
        if (days === null) return '-';
        const displayDays = days < 0 ? `-${Math.abs(days)}` : days;
        return (
          <Text
            style={{
              color: getAgeingColor(days),
              fontWeight: 700,
            }}
          >
            {displayDays}d
          </Text>
        );
      },
    },
    {
      title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val) => {
        const cfg = statusConfig[val] || { color: 'default', labelEn: val, labelGu: val };
        return <Tag color={cfg.color}>{lang === 'gu' ? cfg.labelGu : cfg.labelEn}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={lang === 'gu' ? 'વિગત જુઓ' : 'View Detail'}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/compliance/${record.id}`)}
            />
          </Tooltip>
          {(record.status === 'Open' || record.status === 'PartiallyComplied') && (
            <Tooltip title={lang === 'gu' ? 'પ્રતિભાવ આપો' : 'Respond'}>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleRespond(record)}
              >
                {lang === 'gu' ? 'જવાબ' : 'Respond'}
              </Button>
            </Tooltip>
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
            { title: lang === 'gu' ? 'અનુપાલન' : 'Compliance' },
            { title: lang === 'gu' ? 'મારા નિરિક્ષણો' : 'My Observations' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'મારા નિરિક્ષણો' : 'My Observations'}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'કુલ ખુલ્લા' : 'Total Open'}
              value={stats.totalOpen}
              prefix={<ExclamationCircleOutlined style={{ color: '#b91c2c', fontSize: 20 }} />}
              valueStyle={{ color: '#b91c2c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'આ મહિને અનુપાલિત' : 'Complied (Month)'}
              value={stats.compliedThisMonth}
              prefix={<CheckCircleOutlined style={{ color: '#4a7c59', fontSize: 20 }} />}
              valueStyle={{ color: '#4a7c59' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'મુદતવીતી' : 'Overdue'}
              value={stats.overdue}
              prefix={<WarningOutlined style={{ color: '#dd6b20', fontSize: 20 }} />}
              valueStyle={{ color: '#dd6b20' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card">
            <Statistic
              title={lang === 'gu' ? 'ચકાસાયેલ' : 'Verified'}
              value={stats.verified}
              prefix={<CheckCircleOutlined style={{ color: '#d92332', fontSize: 20 }} />}
              valueStyle={{ color: '#d92332' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'સ્થિતિ' : 'Status'}
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
              options={Object.entries(statusConfig).map(([k, v]) => ({
                value: k,
                label: lang === 'gu' ? v.labelGu : v.labelEn,
              }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'ગંભીરતા' : 'Severity'}
              allowClear
              style={{ width: '100%' }}
              value={filters.severity}
              onChange={(val) => setFilters((prev) => ({ ...prev, severity: val }))}
              options={Object.entries(severityConfig).map(([k, v]) => ({
                value: k,
                label: lang === 'gu' ? v.labelGu : v.labelEn,
              }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder={lang === 'gu' ? 'એન્ટિટી' : 'Entity'}
              allowClear
              style={{ width: '100%' }}
              value={filters.entityType}
              onChange={(val) => setFilters((prev) => ({ ...prev, entityType: val }))}
              options={[
                { value: 'Branch', label: lang === 'gu' ? 'શાખા' : 'Branch' },
                { value: 'PACS', label: 'PACS' },
              ]}
            />
          </Col>
          <Col xs={24} sm={6}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={filters.dateRange}
              onChange={(val) => setFilters((prev) => ({ ...prev, dateRange: val }))}
              placeholder={[
                lang === 'gu' ? 'થી તારીખ' : 'From Date',
                lang === 'gu' ? 'સુધી તારીખ' : 'To Date',
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>
            {lang === 'gu' ? 'નિરિક્ષણોની યાદી' : 'Observations List'}
          </Text>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            {lang === 'gu' ? 'નિકાસ' : 'Export'}
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={observations}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1300 }}
          onRow={(record) => {
            const days = getDaysRemaining(record.targetDate, record.status);
            const isOverdue = days !== null && days < 0;
            return {
              style: isOverdue ? { backgroundColor: '#fff5f5' } : {},
            };
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (ttl) =>
              lang === 'gu' ? `કુલ ${ttl} નિરિક્ષણો` : `Total ${ttl} observations`,
          }}
          locale={{
            emptyText: lang === 'gu' ? 'કોઈ નિરિક્ષણો નથી' : 'No observations',
          }}
        />
      </Card>

      <Modal
        title={lang === 'gu' ? 'પ્રતિભાવ સબમિટ કરો' : 'Submit Response'}
        open={respondModalOpen}
        onCancel={() => setRespondModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={actionLoading}
        width={640}
        okText={lang === 'gu' ? 'સબમિટ કરો' : 'Submit'}
        cancelText={lang === 'gu' ? 'રદ કરો' : 'Cancel'}
      >
        {selectedObs && (
          <div style={{ marginBottom: 16, padding: 12, background: '#faf9f7', borderRadius: 6 }}>
            <Text strong>{selectedObs.title || selectedObs.observationTitle}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedObs.entityName} | {lang === 'gu' ? 'નિયત તારીખ' : 'Target'}:{' '}
              {selectedObs.targetDate ? dayjs(selectedObs.targetDate).format('DD/MM/YYYY') : '-'}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmitResponse}>
          <Form.Item
            name="response"
            label={lang === 'gu' ? 'તમારો પ્રતિભાવ' : 'Your Response'}
            rules={[{
              required: true,
              message: lang === 'gu' ? 'પ્રતિભાવ જરૂરી છે' : 'Response is required',
            }]}
          >
            <TextArea rows={5} placeholder={lang === 'gu'
              ? 'તમારો પ્રતિભાવ અહીં લખો...'
              : 'Type your response here...'} />
          </Form.Item>
          <Form.Item label={lang === 'gu' ? 'જોડાણો' : 'Attachments'}>
            <FileUpload
              onUpload={(files) => setUploadedFiles(files)}
              fileList={uploadedFiles}
              multiple
              maxCount={5}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyObservations;
