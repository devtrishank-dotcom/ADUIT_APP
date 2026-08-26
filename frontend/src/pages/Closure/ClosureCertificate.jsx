import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Breadcrumb, Card, Descriptions, Typography, Button, Space,
  Spin, Empty, Tag, Divider, Row, Col, Result, Statistic,
} from 'antd';
import {
  PrinterOutlined, DownloadOutlined, SafetyCertificateOutlined,
  QrcodeOutlined, CheckCircleOutlined, UserOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { feedback as message } from '../../services/feedback';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;

const riskBandColors = {
  Green: 'green',
  Yellow: 'gold',
  Red: 'red',
};

const ClosureCertificate = () => {
  const { auditInstanceId } = useParams();
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchCertificate = useCallback(async () => {
    if (!auditInstanceId) return;
    setLoading(true);
    try {
       const res = await apiFunctions.closure.getCertificate(auditInstanceId);
       const rawCertificate = res.data?.data || res.data;
       const audit = rawCertificate.auditInstance || {};
       const displayValue = (value) => {
         if (value == null) return '';
         if (typeof value === 'object') return value.name || value.employeeCode || value.code || value.id || value._id || '';
         return value;
       };
       setCertificate({
         ...rawCertificate,
         entityType: rawCertificate.entityType || audit.entityType,
         entityName: rawCertificate.entityName || `${audit.entityType || 'Entity'} (${String(audit.entityId || '').slice(-6)})`,
         auditType: displayValue(rawCertificate.auditType || audit.auditType),
         periodFrom: rawCertificate.periodFrom || audit.periodFrom,
         periodTo: rawCertificate.periodTo || audit.periodTo,
         riskBand: rawCertificate.riskBand || audit.overallRiskBand,
         overallScore: rawCertificate.overallScore ?? audit.overallRiskScore,
         auditorName: displayValue(rawCertificate.auditorName || rawCertificate.signedBy_auditor),
         hiaName: displayValue(rawCertificate.hiaName || rawCertificate.signedBy_hia),
       });
    } catch {
      message.error(lang === 'gu' ? 'પ્રમાણપત્ર લાવવામાં નિષ્ફળ' : 'Failed to fetch certificate');
    } finally {
      setLoading(false);
    }
  }, [auditInstanceId, lang]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await apiFunctions.audit.exportPdf(auditInstanceId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `closure-certificate-${auditInstanceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(lang === 'gu' ? 'PDF ડાઉનલોડ થઈ રહ્યું છે' : 'PDF downloading');
    } catch {
      message.info(lang === 'gu' ? 'PDF જનરેશન ટૂંક સમયમાં ઉપલબ્ધ થશે' : 'PDF generation coming soon');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <Empty
        description={lang === 'gu' ? 'પ્રમાણપત્ર ઉપલબ્ધ નથી' : 'Certificate not available'}
        style={{ marginTop: 80 }}
      >
        <Button type="primary" onClick={() => navigate('/closure')}>
          {lang === 'gu' ? 'પાછા જાઓ' : 'Go Back'}
        </Button>
      </Empty>
    );
  }

  const certNumber = certificate.certificateNumber
    || `CLS-${dayjs(certificate.closedAt || certificate.createdAt).format('YYYY')}-${String(certificate.id || '001').padStart(3, '0')}`;

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home', onClick: () => navigate('/dashboard') },
            { title: lang === 'gu' ? 'સમાપ્તિ' : 'Closure', onClick: () => navigate('/closure') },
            { title: lang === 'gu' ? 'પ્રમાણપત્ર' : 'Certificate' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            {lang === 'gu' ? 'છાપો' : 'Print'}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadPdf}
            loading={downloading}
          >
            {lang === 'gu' ? 'PDF ડાઉનલોડ' : 'Download PDF'}
          </Button>
        </Space>
      </div>

      <div className="no-print" ref={printRef}>
        <Card
          style={{
            maxWidth: 800,
            margin: '0 auto',
            borderWidth: 2,
            borderColor: '#141416',
            borderRadius: 0,
          }}
          styles={{ body: { padding: 48 } }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <SafetyCertificateOutlined style={{ fontSize: 40, color: '#141416' }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#141416', letterSpacing: 2 }}>
                  DCCB
                </div>
                <div style={{ fontSize: 12, color: '#718096' }}>
                  District Central Co-operative Bank
                </div>
              </div>
            </div>
            <Title level={2} style={{ marginTop: 16, marginBottom: 8, color: '#141416' }}>
              {lang === 'gu' ? 'ઓડિટ સમાપ્તિ પ્રમાણપત્ર' : 'AUDIT CLOSURE CERTIFICATE'}
            </Title>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 16px', marginBottom: 8 }}>
              {lang === 'gu' ? 'પ્રમાણપત્ર ક્રમાંક' : 'Certificate No.'}: {certNumber}
            </Tag>
          </div>

          <Divider />

          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            size="small"
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી નામ' : 'Entity Name'} span={2}>
              <Text strong>{certificate.entityName || certificate.branchName || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'એન્ટિટી પ્રકાર' : 'Entity Type'}>
              {certificate.entityType || lang === 'gu' ? 'શાખા/PACS' : 'Branch/PACS'}
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}>
              {certificate.auditType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'ઓડિટ અવધિ' : 'Audit Period'}>
              {certificate.periodFrom ? dayjs(certificate.periodFrom).format('DD/MM/YYYY') : '-'}
              {' - '}
              {certificate.periodTo ? dayjs(certificate.periodTo).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'શરૂઆત તારીખ' : 'Start Date'}>
              {certificate.startDate ? dayjs(certificate.startDate).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'જોખમ રેટિંગ' : 'Risk Rating at Closure'}>
              <Tag color={riskBandColors[certificate.riskBand] || 'default'}>
                {certificate.riskBand || '-'}
              </Tag>
              {certificate.overallScore != null && (
                <Text style={{ marginLeft: 8 }}>
                  {lang === 'gu' ? 'સ્કોર' : 'Score'}: {certificate.overallScore}%
                </Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={lang === 'gu' ? 'બંધ તારીખ' : 'Closure Date'}>
              {certificate.closedAt ? dayjs(certificate.closedAt).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
          </Descriptions>

          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#faf9f7' }}>
                <Statistic
                  title={lang === 'gu' ? 'કુલ ઉઠાવેલ નિરિક્ષણો' : 'Total Observations Raised'}
                  value={certificate.totalObservations || certificate.observationsRaised || 0}
                  valueStyle={{ color: '#b91c2c' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#f0fff4' }}>
                <Statistic
                  title={lang === 'gu' ? 'કુલ અનુપાલિત' : 'Total Complied'}
                  value={certificate.totalComplied || certificate.observationsComplied || 0}
                  valueStyle={{ color: '#4a7c59' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 24, color: '#4a7c59', marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: 500 }}>
              {lang === 'gu'
                ? 'પાછલા ઓડિટની અનિયમિતતાઓ સુધારી લેવામાં આવી છે.'
                : 'The irregularities of previous audit have been rectified.'}
            </Text>
          </div>

          <Divider />

          <Row gutter={24} style={{ marginTop: 32 }}>
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 40 }}>
                  <div style={{ borderBottom: '1px solid #333', width: 180, margin: '0 auto' }} />
                </div>
                <Text strong>
                  {certificate.auditorName || certificate.auditedBy || lang === 'gu' ? 'ઓડિટર' : 'Auditor'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {certificate.auditorSignedAt
                    ? dayjs(certificate.auditorSignedAt).format('DD/MM/YYYY HH:mm')
                    : (lang === 'gu' ? 'ડિજિટલ સહી' : 'Digital Signature')}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 40 }}>
                  <div style={{ borderBottom: '1px solid #333', width: 180, margin: '0 auto' }} />
                </div>
                <Text strong>
                  {certificate.hiaName || certificate.approvedBy || 'HIA'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {certificate.hiaSignedAt
                    ? dayjs(certificate.hiaSignedAt).format('DD/MM/YYYY HH:mm')
                    : (lang === 'gu' ? 'ડિજિટલ સહી' : 'Digital Signature')}
                </Text>
              </div>
            </Col>
          </Row>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {lang === 'gu' ? 'જનરેટ તારીખ' : 'Generated'}: {dayjs(certificate.createdAt || new Date()).format('DD/MM/YYYY HH:mm')}
              </Text>
            </div>
            <div style={{
              width: 80,
              height: 80,
              border: '2px dashed #cfc9c0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <QrcodeOutlined style={{ fontSize: 24, color: '#718096' }} />
              <Text style={{ fontSize: 9, color: '#a0aec0', marginTop: 2 }}>
                {certNumber}
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClosureCertificate;
