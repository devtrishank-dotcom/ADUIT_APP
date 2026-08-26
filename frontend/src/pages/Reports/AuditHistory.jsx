import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Descriptions, Table, Tag, Button, Typography,
  Space, Spin, Empty, Timeline, Progress, Row, Col, Statistic,
} from 'antd';
import {
  EnvironmentOutlined, ArrowLeftOutlined, RiseOutlined,
  AuditOutlined, SafetyOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiFunctions from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const riskBandColors = {
  Green: 'green',
  Yellow: 'gold',
  Red: 'red',
};

const statusConfig = {
  Draft: { color: 'default', labelEn: 'Draft', labelGu: 'ડ્રાફ્ટ' },
  InProgress: { color: 'processing', labelEn: 'In Progress', labelGu: 'પ્રગતિમાં' },
  Submitted: { color: 'blue', labelEn: 'Submitted', labelGu: 'સબમિટ' },
  UnderReview: { color: 'purple', labelEn: 'Under Review', labelGu: 'સમીક્ષા હેઠળ' },
  Approved: { color: 'success', labelEn: 'Approved', labelGu: 'મંજૂર' },
  Closed: { color: 'green', labelEn: 'Closed', labelGu: 'બંધ' },
};

const AuditHistory = () => {
  const { entityId } = useParams();
  const [searchParams] = useSearchParams();
  const entityType = searchParams.get('entityType') || 'Branch';
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState(null);
  const [audits, setAudits] = useState([]);
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [riskTrend, setRiskTrend] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.audit.listInstances({
        entityId,
        entityType,
        sort: '-startDate',
      });
      const list = res.data?.data || res.data || [];
      setAudits(list);

      const scores = list
        .filter((a) => a.overallScore != null)
        .map((a) => ({
          period: a.periodFrom
            ? dayjs(a.periodFrom).format('MMM YY')
            : dayjs(a.startDate).format('MMM YY'),
          score: a.overallScore,
          riskBand: a.riskBand,
        }))
        .reverse();
      setRiskTrend(scores.map((s, i) => ({ ...s, index: i + 1 })));

      if (list.length >= 2) {
        setComparisonData({
          latest: list[0],
          previous: list[1],
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  const fetchEntity = useCallback(async () => {
    try {
      let res;
      if (entityType === 'PACS') {
        res = await apiFunctions.masters.pacs.get(entityId);
      } else {
        res = await apiFunctions.masters.branches.get(entityId);
      }
      setEntity(res.data?.data || res.data);
    } catch {
      // silent
    }
  }, [entityId, entityType]);

  useEffect(() => {
    fetchEntity();
    fetchHistory();
  }, [fetchEntity, fetchHistory]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const getRiskProgress = (score) => {
    if (score == null) return { percent: 0, status: 'normal', color: '#a0aec0' };
    if (score >= 70) return { percent: score, status: 'exception', color: '#b91c2c' };
    if (score >= 40) return { percent: score, status: 'active', color: '#c77d2e' };
    return { percent: score, status: 'success', color: '#4a7c59' };
  };

  const comparisonColumns = [
    {
      title: lang === 'gu' ? 'વિગત' : 'Detail',
      dataIndex: 'label',
      key: 'label',
      width: 180,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: lang === 'gu' ? 'તાજેતરનું' : 'Latest',
      dataIndex: 'latest',
      key: 'latest',
    },
    {
      title: lang === 'gu' ? 'પાછલું' : 'Previous',
      dataIndex: 'previous',
      key: 'previous',
    },
  ];

  const getComparisonRows = () => {
    if (!comparisonData) return [];
    const { latest, previous } = comparisonData;
    return [
      {
        key: 'auditType',
        label: lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type',
        latest: latest.auditType || '-',
        previous: previous.auditType || '-',
      },
      {
        key: 'period',
        label: lang === 'gu' ? 'અવધિ' : 'Period',
        latest: latest.periodFrom
          ? `${dayjs(latest.periodFrom).format('DD/MM/YYYY')} - ${dayjs(latest.periodTo).format('DD/MM/YYYY')}`
          : '-',
        previous: previous.periodFrom
          ? `${dayjs(previous.periodFrom).format('DD/MM/YYYY')} - ${dayjs(previous.periodTo).format('DD/MM/YYYY')}`
          : '-',
      },
      {
        key: 'riskScore',
        label: lang === 'gu' ? 'જોખમ સ્કોર' : 'Risk Score',
        latest: (
          <Text style={{ color: getRiskProgress(latest.overallScore).color, fontWeight: 600 }}>
            {latest.overallScore != null ? `${latest.overallScore}%` : '-'}
          </Text>
        ),
        previous: (
          <Text style={{ color: getRiskProgress(previous.overallScore).color, fontWeight: 600 }}>
            {previous.overallScore != null ? `${previous.overallScore}%` : '-'}
          </Text>
        ),
      },
      {
        key: 'riskBand',
        label: lang === 'gu' ? 'જોખમ સ્તર' : 'Risk Band',
        latest: (
          <Tag color={riskBandColors[latest.riskBand] || 'default'}>
            {latest.riskBand || '-'}
          </Tag>
        ),
        previous: (
          <Tag color={riskBandColors[previous.riskBand] || 'default'}>
            {previous.riskBand || '-'}
          </Tag>
        ),
      },
      {
        key: 'status',
        label: lang === 'gu' ? 'સ્થિતિ' : 'Status',
        latest: (
          <Tag color={statusConfig[latest.status]?.color || 'default'}>
            {lang === 'gu'
              ? statusConfig[latest.status]?.labelGu
              : statusConfig[latest.status]?.labelEn || latest.status}
          </Tag>
        ),
        previous: (
          <Tag color={statusConfig[previous.status]?.color || 'default'}>
            {lang === 'gu'
              ? statusConfig[previous.status]?.labelGu
              : statusConfig[previous.status]?.labelEn || previous.status}
          </Tag>
        ),
      },
    ];
  };

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'અહેવાલો' : 'Reports' },
            { title: lang === 'gu' ? 'ઓડિટ ઇતિહાસ' : 'Audit History' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {lang === 'gu' ? 'પાછા' : 'Back'}
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <EnvironmentOutlined style={{ fontSize: 36, color: '#141416' }} />
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>
              {entity?.name || entity?.branchName || entityId}
            </Title>
            <Space size={12}>
              <Tag>{entityType === 'PACS' ? 'PACS' : lang === 'gu' ? 'શાખા' : 'Branch'}</Tag>
              {entity?.code && <Text type="secondary">Code: {entity.code}</Text>}
              {entity?.district && <Text type="secondary">{entity.district}</Text>}
            </Space>
          </Col>
          <Col>
            <Space>
              <Statistic
                title={lang === 'gu' ? 'કુલ ઓડિટ' : 'Total Audits'}
                value={audits.length}
                prefix={<AuditOutlined />}
              />
              {audits.length > 0 && audits[0].overallScore != null && (
                <Statistic
                  title={lang === 'gu' ? 'તાજેતરનો સ્કોર' : 'Latest Score'}
                  value={audits[0].overallScore}
                  suffix="%"
                  valueStyle={{
                    color: audits[0].overallScore >= 70 ? '#b91c2c'
                      : audits[0].overallScore >= 40 ? '#c77d2e' : '#4a7c59',
                  }}
                />
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {riskTrend.length > 1 && (
        <Card title={lang === 'gu' ? 'જોખમ વલણ' : 'Risk Trend'} style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={riskTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <ReTooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#b91c2c"
                strokeWidth={2}
                dot={{ r: 5, fill: '#b91c2c' }}
                name={lang === 'gu' ? 'જોખમ સ્કોર' : 'Risk Score'}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {comparisonData && (
        <Card title={lang === 'gu' ? 'છેલ્લા 2 ઓડિટની સરખામણી' : 'Last 2 Audits Comparison'} style={{ marginBottom: 16 }}>
          <Table
            columns={comparisonColumns}
            dataSource={getComparisonRows()}
            rowKey="key"
            pagination={false}
            bordered
            size="small"
          />
        </Card>
      )}

      <Card title={lang === 'gu' ? 'ઓડિટ ઇતિહાસ' : 'Audit History'}>
        {audits.length > 0 ? (
          <Timeline
            items={audits.map((audit, idx) => ({
              key: audit.id || idx,
              color: audit.riskBand === 'Red' ? 'red'
                : audit.riskBand === 'Yellow' ? 'gold'
                : audit.riskBand === 'Green' ? 'green'
                : 'blue',
              children: (
                <Card
                  size="small"
                  style={{ marginBottom: 8 }}
                  styles={{ body: { padding: 12 } }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
                  >
                    <Space size={8}>
                      <Text strong style={{ fontSize: 14 }}>
                        {audit.auditType || '-'}
                      </Text>
                      <Tag color={statusConfig[audit.status]?.color || 'default'}>
                        {lang === 'gu'
                          ? statusConfig[audit.status]?.labelGu
                          : statusConfig[audit.status]?.labelEn || audit.status}
                      </Tag>
                    </Space>
                    <Space size={8}>
                      <Tag color={riskBandColors[audit.riskBand] || 'default'}>
                        {audit.riskBand || '-'}
                      </Tag>
                      {audit.overallScore != null && (
                        <Progress
                          type="circle"
                          percent={audit.overallScore}
                          size={40}
                          status={getRiskProgress(audit.overallScore).status}
                          strokeColor={getRiskProgress(audit.overallScore).color}
                        />
                      )}
                    </Space>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Space size={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {audit.periodFrom
                          ? `${dayjs(audit.periodFrom).format('DD/MM/YYYY')} - ${dayjs(audit.periodTo).format('DD/MM/YYYY')}`
                          : audit.startDate ? dayjs(audit.startDate).format('DD/MM/YYYY') : ''}
                      </Text>
                      {audit.auditorName && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {lang === 'gu' ? 'ઓડિટર' : 'Auditor'}: {audit.auditorName}
                        </Text>
                      )}
                    </Space>
                  </div>

                  <Button
                    type="link"
                    size="small"
                    onClick={() => setExpandedAudit(expandedAudit === audit.id ? null : audit.id)}
                    style={{ marginTop: 4 }}
                  >
                    {expandedAudit === audit.id
                      ? (lang === 'gu' ? 'ઓછું બતાવો' : 'Show Less')
                      : (lang === 'gu' ? 'વધુ બતાવો' : 'Show More')}
                  </Button>

                  {expandedAudit === audit.id && (
                    <div style={{ marginTop: 8, padding: '0 8px' }}>
                      {audit.observations && audit.observations.length > 0 ? (
                        <div>
                          <Text strong style={{ fontSize: 12 }}>
                            {lang === 'gu' ? 'મુખ્ય નિરિક્ષણો' : 'Key Observations'}:
                          </Text>
                          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                            {audit.observations.slice(0, 5).map((obs, i) => (
                              <li key={i}>
                                <Text style={{ fontSize: 12 }}>{obs.title || obs.description}</Text>
                                {obs.severity && (
                                  <Tag
                                    color={
                                      obs.severity === 'Critical' ? 'red'
                                        : obs.severity === 'High' ? 'volcano'
                                        : obs.severity === 'Medium' ? 'orange'
                                        : 'blue'
                                    }
                                    style={{ marginLeft: 8, fontSize: 10 }}
                                  >
                                    {obs.severity}
                                  </Tag>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {lang === 'gu' ? 'કોઈ નિરિક્ષણ ઉપલબ્ધ નથી' : 'No observations available'}
                        </Text>
                      )}

                      {audit.sectionScores && Object.keys(audit.sectionScores).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>
                            {lang === 'gu' ? 'વિભાગ સ્કોર્સ' : 'Section Scores'}:
                          </Text>
                          <Row gutter={[8, 4]} style={{ marginTop: 4 }}>
                            {Object.entries(audit.sectionScores).map(([section, score]) => (
                              <Col xs={12} sm={8} md={6} key={section}>
                                <Text style={{ fontSize: 11 }}>
                                  {section}:{' '}
                                  <Text
                                    strong
                                    style={{
                                      color: Number(score) >= 70 ? '#b91c2c'
                                        : Number(score) >= 40 ? '#c77d2e'
                                        : '#4a7c59',
                                    }}
                                  >
                                    {score}%
                                  </Text>
                                </Text>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ),
            }))}
          />
        ) : (
          <Empty description={lang === 'gu' ? 'કોઈ ઓડિટ ઇતિહાસ નથી' : 'No audit history'} />
        )}
      </Card>
    </div>
  );
};

export default AuditHistory;
