import React from 'react';
import { Card, Progress, Tag, Typography, Space, Tooltip, Row, Col } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';

const { Text, Title } = Typography;

const getRiskLevel = (score) => {
  if (score >= 70) return { label: 'High', labelGu: 'ઉચ્ચ', color: '#b91c2c', icon: <CloseCircleOutlined /> };
  if (score >= 40) return { label: 'Medium', labelGu: 'મધ્યમ', color: '#c77d2e', icon: <ExclamationCircleOutlined /> };
  return { label: 'Low', labelGu: 'નીચું', color: '#4a7c59', icon: <CheckCircleOutlined /> };
};

const RiskScorePanel = ({ riskScore }) => {
  const { language, t } = useLanguage();
  const lang = language;

  if (!riskScore) {
    return (
      <Card size="small">
        <Text type="secondary">
          {lang === 'gu' ? 'કોઈ જોખમ સ્કોર ઉપલબ્ધ નથી' : 'No risk score available'}
        </Text>
      </Card>
    );
  }

  const { overallScore = 0, overallBand, sectionScores = {} } = riskScore;
  const numericOverallScore = Number(overallScore) || 0;
  const riskLevel = getRiskLevel(numericOverallScore);
  const sectionEntries = Array.isArray(sectionScores)
    ? sectionScores.map((item, index) => [item.section || item.code || String(index), item])
    : Object.entries(sectionScores || {});

  return (
    <Card
      size="small"
      title={
        <Space>
          <Text strong>{lang === 'gu' ? 'જોખમ આકારણી' : 'Risk Assessment'}</Text>
          <Tag color={riskLevel.color} icon={riskLevel.icon}>
            {lang === 'gu' ? riskLevel.labelGu : riskLevel.label}
          </Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
             percent={numericOverallScore}
            strokeColor={{
              '0%': '#4a7c59',
              '40%': '#c77d2e',
              '70%': '#b91c2c',
            }}
            format={(percent) => (
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {percent}
                <span style={{ fontSize: 12 }}>%</span>
              </span>
            )}
            size={140}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              {lang === 'gu' ? 'એકંદર સ્કોર' : 'Overall Score'}
            </Text>
          </div>
          {overallBand && (
            <Tag color={riskLevel.color} style={{ marginTop: 4 }}>
              {overallBand}
            </Tag>
          )}
        </Col>

        <Col xs={24} sm={16}>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            {lang === 'gu' ? 'વિભાગ-મુજબ સ્કોર' : 'Section-wise Scores'}:
          </Text>
          {sectionEntries.length === 0 ? (
            <Text type="secondary">
              {lang === 'gu' ? 'કોઈ વિભાગ સ્કોર નથી' : 'No section scores'}
            </Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
               {sectionEntries.map(([code, score]) => {
                 const scoreValue = typeof score === 'number'
                   ? score
                   : Number(score?.score ?? score?.overallScore ?? 0) || 0;
                 const isScoreObject = score !== null && typeof score === 'object';
                 const sectionLabel = isScoreObject
                   ? score.sectionTitle || score.section || score.code || code
                   : score?.label || score?.sectionTitle || code;
                 const sLevel = getRiskLevel(scoreValue);
                 const bandLabel = isScoreObject ? score.band : null;
                return (
                  <div
                    key={code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      background: '#faf9f7',
                      borderRadius: 4,
                    }}
                  >
                    <Space>
                      {sLevel.icon}
                      <Text style={{ fontSize: 13 }}>
                         {sectionLabel}
                      </Text>
                    </Space>
                     <Tooltip title={`${lang === 'gu' ? 'સ્કોર' : 'Score'}: ${scoreValue}%`}>
                       <Tag color={sLevel.color} style={{ marginLeft: 8 }}>
                         {scoreValue}%{bandLabel ? ` (${bandLabel})` : ''}
                       </Tag>
                    </Tooltip>
                  </div>
                );
              })}
            </Space>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default RiskScorePanel;
