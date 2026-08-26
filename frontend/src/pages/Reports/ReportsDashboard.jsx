import React, { useState, useCallback, useEffect } from 'react';
import {
  Breadcrumb, Row, Col, Card, Select, DatePicker, Table, Button,
  Typography, Space, Spin, Empty, Statistic, Tag,
} from 'antd';
import {
  BarChartOutlined, FileTextOutlined, RiseOutlined,
  ClockCircleOutlined, UserSwitchOutlined, EnvironmentOutlined,
  DownloadOutlined, FilePdfOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PIE_COLORS = ['#4a7c59', '#c77d2e', '#b91c2c', '#d92332'];
const BAR_COLORS = { planned: '#d92332', actual: '#4a7c59' };
const AGE_COLORS = ['#4a7c59', '#ecc94b', '#dd6b20', '#b91c2c'];
const DEFAULT_REPORT = 'observationRegister';

const reportCards = [
  {
    key: 'planVsActual',
    icon: <BarChartOutlined style={{ fontSize: 32 }} />,
    color: '#d92332',
    labelEn: 'Plan vs Actual',
    labelGu: 'યોજના vs વાસ્તવિક',
  },
  {
    key: 'observationRegister',
    icon: <FileTextOutlined style={{ fontSize: 32 }} />,
    color: '#4a7c59',
    labelEn: 'Observation Register',
    labelGu: 'નિરિક્ષણ રજિસ્ટર',
  },
  {
    key: 'riskTrend',
    icon: <RiseOutlined style={{ fontSize: 32 }} />,
    color: '#b91c2c',
    labelEn: 'Risk Trend Analysis',
    labelGu: 'જોખમ વલણ વિશ્લેષણ',
  },
  {
    key: 'complianceAgeing',
    icon: <ClockCircleOutlined style={{ fontSize: 32 }} />,
    color: '#dd6b20',
    labelEn: 'Compliance Ageing',
    labelGu: 'અનુપાલન જૂનાપણું',
  },
  {
    key: 'auditorProductivity',
    icon: <UserSwitchOutlined style={{ fontSize: 32 }} />,
    color: '#805ad5',
    labelEn: 'Auditor Productivity',
    labelGu: 'ઓડિટર ઉત્પાદકતા',
  },
  {
    key: 'branchAuditHistory',
    icon: <EnvironmentOutlined style={{ fontSize: 32 }} />,
    color: '#c77d2e',
    labelEn: 'Branch-wise Audit History',
    labelGu: 'શાખા-વાર ઓડિટ ઇતિહાસ',
  },
];

const ReportsDashboard = () => {
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: undefined,
    auditType: undefined,
    entityType: undefined,
    riskBand: undefined,
  });

  const normalizeReportData = (reportKey, rawData) => {
    if (reportKey === 'observationRegister' && Array.isArray(rawData)) {
      return rawData.map((item) => ({
        ...item,
        id: item.id || item._id,
        entityName: item.entityName || item.auditInstance?.entityName || `${item.auditInstance?.entityType || 'Entity'} (${String(item.auditInstance?.entityId || '').slice(-6)})`,
        auditType: item.auditType || item.auditInstance?.auditType?.name || item.auditInstance?.auditType?.code,
        raisedDate: item.raisedDate || item.createdAt,
      }));
    }
    if (reportKey === 'riskTrend' && Array.isArray(rawData)) {
      return rawData.map((item) => ({
        period: `${item._id?.year || ''}-${String(item._id?.month || '').padStart(2, '0')}`,
        entityId: item._id?.entityId || item.entityId,
        entityType: item._id?.entityType || item.entityType,
        avgScore: item.avgScore || 0,
        count: item.count || 0,
      }));
    }
    if (reportKey === 'complianceAgeing' && Array.isArray(rawData)) {
      return rawData.map((item) => ({
        ...item,
        category: item.category || `${item.entityType || 'Entity'} ${String(item.entityId || '').slice(-6)}`,
        days0to7: item['0-7'] || item.days0to7 || 0,
        days8to15: item['8-15'] || item.days8to15 || 0,
        days16to30: item['16-30'] || item.days16to30 || 0,
        days30plus: item['30+'] || item.days30plus || 0,
      }));
    }
    if (reportKey === 'branchAuditHistory' && Array.isArray(rawData)) {
      return rawData.map((item) => ({
        id: item.id || item._id,
        entityName: item.entityName || `${item.entityType || 'Entity'} (${String(item.entityId || '').slice(-6)})`,
        entityType: item.entityType || '',
        auditType: item.auditType?.name || item.auditType?.code || item.auditType,
        auditorName: item.startedBy?.name || item.startedBy?.employeeCode || item.auditorName || '',
        periodFrom: item.periodFrom,
        periodTo: item.periodTo,
        startedAt: item.startedAt,
        submittedAt: item.submittedAt,
        riskBand: item.overallRiskBand || item.riskBand,
        riskScore: item.overallRiskScore ?? item.riskScore,
        status: item.status || '',
      }));
    }
    return rawData;
  };

  const fetchReport = useCallback(async (reportKey) => {
    setLoading(true);
    setData(null);
    try {
      const params = {};
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0].toISOString();
        params.endDate = filters.dateRange[1].toISOString();
      }
      if (filters.auditType) params.auditType = filters.auditType;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.riskBand) params.riskBand = filters.riskBand;

      let res;
      switch (reportKey) {
        case 'planVsActual':
          res = await apiFunctions.reports.planVsActual(params);
          break;
        case 'observationRegister':
          res = await apiFunctions.reports.observationRegister(params);
          break;
        case 'riskTrend':
          res = await apiFunctions.reports.riskTrend(params);
          break;
        case 'complianceAgeing':
          res = await apiFunctions.reports.complianceAgeing(params);
          break;
        case 'auditorProductivity':
          res = await apiFunctions.reports.auditorDashboard(params);
          break;
        case 'branchAuditHistory':
          res = await apiFunctions.audit.listInstances(params);
          break;
        default:
          res = { data: [] };
      }
       setData(normalizeReportData(reportKey, res.data?.data || res.data || []));
    } catch {
      message.error(lang === 'gu' ? 'રિપોર્ટ લાવવામાં નિષ્ફળ' : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [filters, lang]);

  useEffect(() => {
    const requestedReport = searchParams.get('report') || DEFAULT_REPORT;
    const validReport = reportCards.some((card) => card.key === requestedReport)
      ? requestedReport
      : DEFAULT_REPORT;
    if (searchParams.get('report') !== validReport) {
      setSearchParams({ report: validReport }, { replace: true });
    }
    if (selectedReport !== validReport) setSelectedReport(validReport);
    fetchReport(validReport);
  }, [searchParams, selectedReport, fetchReport, setSearchParams]);

  const handleReportSelect = (reportKey) => {
    setSearchParams({ report: reportKey });
  };

  const getExportRows = () => {
    if (selectedReport === 'planVsActual' && data?.byStatus) {
      return Object.entries(data.byStatus).map(([status, count]) => ({ status, count }));
    }
    if (selectedReport === 'observationRegister' && Array.isArray(data)) {
      return data.map((item) => ({
        Title: item.title || '',
        Entity: item.entityName || '',
        'Audit Type': item.auditType || '',
        Severity: item.severity || '',
        Status: item.status || '',
        'Raised Date': item.raisedDate ? dayjs(item.raisedDate).format('DD/MM/YYYY') : '',
        'Target Date': item.targetDate ? dayjs(item.targetDate).format('DD/MM/YYYY') : '',
        Description: String(item.description || '').slice(0, 300),
      }));
    }
    if (selectedReport === 'riskTrend' && Array.isArray(data)) {
      return data.map((item) => ({
        Period: item.period || '',
        'Entity Type': item.entityType || '',
        'Entity ID': item.entityId || '',
        'Average Score': item.avgScore || 0,
        Audits: item.count || 0,
      }));
    }
    if (selectedReport === 'complianceAgeing' && Array.isArray(data)) {
      return data.map((item) => ({
        Entity: item.category || '',
        'Entity Type': item.entityType || '',
        '0-7 Days': item.days0to7 || 0,
        '8-15 Days': item.days8to15 || 0,
        '16-30 Days': item.days16to30 || 0,
        '30+ Days': item.days30plus || 0,
        Total: item.total || 0,
      }));
    }
    if (selectedReport === 'branchAuditHistory' && Array.isArray(data)) {
      return data.map((item) => ({
        Entity: item.entityName || '',
        'Entity Type': item.entityType || '',
        'Audit Type': item.auditType || '',
        Status: item.status || '',
        'Risk Band': item.riskBand || '',
        'Risk Score': item.riskScore ?? '',
        'Started Date': item.startedAt ? dayjs(item.startedAt).format('DD/MM/YYYY') : '',
      }));
    }
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return Object.entries(data).map(([key, value]) => ({ Metric: key, Value: value }));
    }
    return [];
  };

  const flattenValue = (value) => {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleExportExcel = () => {
    const rows = getExportRows().map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, flattenValue(value)])
    ));
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ message: 'No data' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `ams-${selectedReport}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`);
  };

  const handleExportPdf = () => {
    const rows = getExportRows().map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, flattenValue(value)])
    ));
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = reportCards.find((card) => card.key === selectedReport)?.labelEn || 'AMS Report';
    doc.setFontSize(16);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 23);
    const columns = rows.length ? Object.keys(rows[0]) : ['Message'];
    const body = rows.length ? rows.map((row) => columns.map((column) => row[column] ?? '')) : [['No data']];
    autoTable(doc, {
      startY: 30,
      margin: { left: 10, right: 10 },
      head: [columns],
      body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: ({ pageNumber }) => {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`AMS - Audit Management System | Page ${pageNumber}`, 10, doc.internal.pageSize.getHeight() - 8);
      },
    });
    doc.save(`ams-${selectedReport}-${dayjs().format('YYYYMMDD-HHmm')}.pdf`);
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;
    const planRows = data?.byStatus
      ? Object.entries(data.byStatus).map(([status, count]) => ({ status, count }))
      : (Array.isArray(data) ? data : []);
    const genericRows = Array.isArray(data) ? data : (data ? [data] : []);
    const renderGenericTable = () => {
      if (genericRows.length === 0) return <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />;
      const columns = Object.keys(genericRows[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (value) => flattenValue(value),
      }));
      return <Table dataSource={genericRows} rowKey={(row, index) => row.id || row._id || index} columns={columns} scroll={{ x: 900 }} pagination={{ pageSize: 10 }} />;
    };
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      );
    }

    switch (selectedReport) {
      case 'planVsActual':
        return (
          <Card
            title={lang === 'gu' ? 'યોજના vs વાસ્તવિક' : 'Plan vs Actual'}
            extra={
              <Space>
                <Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button>
                <Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
              </Space>
            }
          >
             {planRows.length > 0 ? (
               <ResponsiveContainer width="100%" height={400}>
                 <BarChart data={planRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Bar dataKey="count" fill={BAR_COLORS.actual} name={lang === 'gu' ? 'કુલ' : 'Count'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />
            )}
          </Card>
        );

      case 'observationRegister':
        return (
          <Card
            title={lang === 'gu' ? 'નિરિક્ષણ રજિસ્ટર' : 'Observation Register'}
            extra={
              <Space>
                <Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button>
                <Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
              </Space>
            }
          >
            <Table
              dataSource={Array.isArray(data) ? data : []}
              rowKey="_id"
              columns={[
                {
                  title: lang === 'gu' ? 'શીર્ષક' : 'Title',
                  dataIndex: 'title',
                  key: 'title',
                  width: 200,
                  ellipsis: true,
                },
                {
                  title: lang === 'gu' ? 'એન્ટિટી' : 'Entity',
                  dataIndex: 'entityName',
                  key: 'entityName',
                  width: 140,
                },
                {
                  title: lang === 'gu' ? 'ગંભીરતા' : 'Severity',
                  dataIndex: 'severity',
                  key: 'severity',
                  width: 100,
                },
                {
                  title: lang === 'gu' ? 'સ્થિતિ' : 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  width: 100,
                },
                {
                  title: lang === 'gu' ? 'તારીખ' : 'Date',
                  dataIndex: 'raisedDate',
                  key: 'raisedDate',
                  width: 110,
                  render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
                },
              ]}
              scroll={{ x: 700 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data' }}
            />
          </Card>
        );

      case 'riskTrend':
        return (
          <Card
            title={lang === 'gu' ? 'જોખમ વલણ વિશ્લેષણ' : 'Risk Trend Analysis'}
            extra={
              <Space>
                <Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button>
                <Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
              </Space>
            }
          >
            {Array.isArray(data) && data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgScore" stroke={PIE_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="Average Score" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />
            )}
          </Card>
        );

      case 'complianceAgeing':
        return (
          <Card
            title={lang === 'gu' ? 'અનુપાલન જૂનાપણું' : 'Compliance Ageing'}
            extra={
              <Space>
                <Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button>
                <Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
              </Space>
            }
          >
            {Array.isArray(data) && data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Bar dataKey="days0to7" name="0-7 days" stackId="a" fill={AGE_COLORS[0]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="days8to15" name="8-15 days" stackId="a" fill={AGE_COLORS[1]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="days16to30" name="16-30 days" stackId="a" fill={AGE_COLORS[2]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="days30plus" name="30+ days" stackId="a" fill={AGE_COLORS[3]} radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data'} />
            )}
          </Card>
        );

      case 'auditorProductivity':
        return (
          <Card
            title={lang === 'gu' ? 'ઓડિટર ઉત્પાદકતા' : 'Auditor Productivity'}
            extra={<Space><Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button><Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button></Space>}
          >
            {renderGenericTable()}
          </Card>
        );

      case 'branchAuditHistory':
        return (
          <Card
            title={lang === 'gu' ? 'શાખા-વાર ઓડિટ ઇતિહાસ' : 'Branch-wise Audit History'}
            extra={<Space><Button icon={<FilePdfOutlined />} size="small" onClick={handleExportPdf}>PDF</Button><Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button></Space>}
          >
            <Table
              dataSource={Array.isArray(data) ? data : []}
              rowKey="id"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              columns={[
                { title: 'Entity', dataIndex: 'entityName', key: 'entityName' },
                { title: 'Type', dataIndex: 'entityType', key: 'entityType' },
                { title: 'Audit Type', dataIndex: 'auditType', key: 'auditType' },
                { title: 'Auditor', dataIndex: 'auditorName', key: 'auditorName' },
                {
                  title: 'Period',
                  key: 'period',
                  render: (_, row) => `${row.periodFrom ? dayjs(row.periodFrom).format('DD/MM/YYYY') : '-'} - ${row.periodTo ? dayjs(row.periodTo).format('DD/MM/YYYY') : '-'}`,
                },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag>{value || '-'}</Tag> },
                { title: 'Risk Score', dataIndex: 'riskScore', key: 'riskScore', render: (value) => value == null ? '-' : `${value}%` },
                { title: 'Risk Band', dataIndex: 'riskBand', key: 'riskBand', render: (value) => <Tag color={value === 'Red' ? 'red' : value === 'Yellow' ? 'gold' : 'green'}>{value || '-'}</Tag> },
                { title: 'Submitted', dataIndex: 'submittedAt', key: 'submittedAt', render: (value) => value ? dayjs(value).format('DD/MM/YYYY') : '-' },
                {
                  title: 'View',
                  key: 'view',
                  render: (_, row) => <Button type="link" onClick={() => navigate(`/auditor/audit/${row.id}/view`)}>View Audit</Button>,
                },
              ]}
              locale={{ emptyText: lang === 'gu' ? 'કોઈ ડેટા નથી' : 'No data' }}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'અહેવાલો' : 'Reports' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>{lang === 'gu' ? 'અહેવાલો અને MIS' : 'Reports & MIS'}</Title>
      </div>

      {selectedReport && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={6}>
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={filters.dateRange}
                onChange={(val) => setFilters((prev) => ({ ...prev, dateRange: val }))}
                placeholder={[
                  lang === 'gu' ? 'થી તારીખ' : 'Start Date',
                  lang === 'gu' ? 'સુધી તારીખ' : 'End Date',
                ]}
              />
            </Col>
            <Col xs={24} sm={5}>
              <Select
                placeholder={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
                allowClear
                style={{ width: '100%' }}
                value={filters.auditType}
                onChange={(val) => setFilters((prev) => ({ ...prev, auditType: val }))}
                options={[
                  { value: 'Annual', label: lang === 'gu' ? 'વાર્ષિક' : 'Annual' },
                  { value: 'Compliance', label: lang === 'gu' ? 'અનુપાલન' : 'Compliance' },
                  { value: 'Special', label: lang === 'gu' ? 'વિશેષ' : 'Special' },
                  { value: 'FollowUp', label: lang === 'gu' ? 'ફોલોઅપ' : 'Follow Up' },
                ]}
              />
            </Col>
            <Col xs={24} sm={5}>
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
            <Col xs={24} sm={5}>
              <Select
                placeholder={lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band'}
                allowClear
                style={{ width: '100%' }}
                value={filters.riskBand}
                onChange={(val) => setFilters((prev) => ({ ...prev, riskBand: val }))}
                options={[
                  { value: 'Green', label: 'Green' },
                  { value: 'Yellow', label: 'Yellow' },
                  { value: 'Red', label: 'Red' },
                ]}
              />
            </Col>
            <Col xs={24} sm={3}>
              <Button
                type="primary"
                block
                onClick={() => fetchReport(selectedReport)}
                loading={loading}
              >
                {lang === 'gu' ? 'લાગુ કરો' : 'Apply'}
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {renderReportContent()}
    </div>
  );
};

export default ReportsDashboard;
