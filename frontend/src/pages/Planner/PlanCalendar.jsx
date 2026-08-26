import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Calendar, Badge, Popover, Select, Space, Tag, Typography, Card, Row, Col, Spin,
} from 'antd';
import { CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiFunctions from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { Title, Text } = Typography;

const typeColors = {
  Branch: '#d92332',
  PACS: '#dd6b20',
};

const statusColors = {
  Planned: 'default',
  InProgress: 'processing',
  Completed: 'success',
  Missed: 'error',
};

const PlanCalendar = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const lang = language;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auditTypeFilter, setAuditTypeFilter] = useState(undefined);
  const [auditorFilter, setAuditorFilter] = useState(undefined);
  const [auditors, setAuditors] = useState([]);
  const [auditTypes, setAuditTypes] = useState([]);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (auditTypeFilter) params.auditType = auditTypeFilter;
      if (auditorFilter) params.assignedTo = auditorFilter;
      const res = await apiFunctions.planning.plans.getCalendar(params);
      const rawData = res.data?.data || res.data || [];
      setEvents(rawData.map((event) => ({
        ...event,
        id: event.id || event._id,
        entityName: event.entityName || `${event.entityType || 'Entity'} (${String(event.entityId).slice(-6)})`,
        auditType: event.auditType?.name || event.auditType?.code || event.auditType,
        plannedStartDate: event.plannedStart || event.plannedStartDate,
        plannedEndDate: event.plannedEnd || event.plannedEndDate,
        assignedToName: event.assignedTo?.name || event.assignedToName,
      })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auditTypeFilter, auditorFilter]);

  const fetchFilters = useCallback(async () => {
    try {
      const [auditorsRes, typesRes] = await Promise.all([
        apiFunctions.users.getAuditors(),
        apiFunctions.masters.auditTypes.list(),
      ]);
      setAuditors(auditorsRes.data?.data || auditorsRes.data || []);
      setAuditTypes(typesRes.data?.data || typesRes.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const getEventsForDate = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return events.filter((evt) => {
      const start = dayjs(evt.plannedStartDate || evt.start);
      const end = dayjs(evt.plannedEndDate || evt.end);
      const current = dayjs(dateStr);
      return (current.isSame(start, 'day') || current.isSame(end, 'day') ||
        (current.isAfter(start, 'day') && current.isBefore(end, 'day')));
    });
  };

  const dateCellRender = (date) => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return null;

    const display = dayEvents.slice(0, 3);
    const more = dayEvents.length > 3 ? dayEvents.length - 3 : 0;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {display.map((evt) => (
          <li key={evt.id} style={{ marginBottom: 2 }}>
            <Popover
              title={evt.entityName}
              content={
                <div style={{ maxWidth: 280 }}>
                  <Space direction="vertical" size={4}>
                    <Text strong>{lang === 'gu' ? 'એન્ટિટી' : 'Entity'}: {evt.entityName}</Text>
                    <Text>{lang === 'gu' ? 'પ્રકાર' : 'Type'}: <Tag color={typeColors[evt.entityType] || 'default'}>{evt.entityType}</Tag></Text>
                    <Text>{lang === 'gu' ? 'ઓડિટ' : 'Audit'}: {evt.auditType}</Text>
                    <Text>
                      {lang === 'gu' ? 'શરૂઆત' : 'Start'}: {evt.plannedStartDate ? dayjs(evt.plannedStartDate).format('DD/MM/YYYY') : '-'} &nbsp;
                      {lang === 'gu' ? 'અંત' : 'End'}: {evt.plannedEndDate ? dayjs(evt.plannedEndDate).format('DD/MM/YYYY') : '-'}
                    </Text>
                    {evt.assignedToName && (
                      <Text>{lang === 'gu' ? 'સોંપાયેલ' : 'Assigned'}: {evt.assignedToName}</Text>
                    )}
                    <Text>
                      {lang === 'gu' ? 'સ્થિતિ' : 'Status'}:{' '}
                      <Tag color={statusColors[evt.status] || 'default'}>{evt.status}</Tag>
                    </Text>
                  </Space>
                </div>
              }
              trigger="hover"
            >
              <Badge
                status={evt.entityType === 'Branch' ? 'processing' : 'warning'}
                text={
                  <Text style={{ fontSize: 11, color: typeColors[evt.entityType] || '#333' }}>
                    {evt.entityName}
                  </Text>
                }
              />
            </Popover>
          </li>
        ))}
        {more > 0 && (
          <li>
            <Text type="secondary" style={{ fontSize: 10 }}>
              +{more} {lang === 'gu' ? 'વધુ' : 'more'}
            </Text>
          </li>
        )}
      </ul>
    );
  };

  return (
    <div>
      <div className="page-header">
        <Breadcrumb
          items={[
            { title: lang === 'gu' ? 'હોમ' : 'Home' },
            { title: lang === 'gu' ? 'આયોજન' : 'Planning' },
            { title: lang === 'gu' ? 'કેલેન્ડર' : 'Calendar' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <Title level={3}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {lang === 'gu' ? 'યોજના કેલેન્ડર' : 'Plan Calendar'}
        </Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder={lang === 'gu' ? 'ઓડિટ પ્રકાર' : 'Audit Type'}
              allowClear
              style={{ width: '100%' }}
              value={auditTypeFilter}
              onChange={setAuditTypeFilter}
              options={auditTypes.map((at) => ({
                value: at.code || at.name,
                label: at.name || at.code,
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder={lang === 'gu' ? 'ઓડિટર' : 'Auditor'}
              allowClear
              style={{ width: '100%' }}
              value={auditorFilter}
              onChange={setAuditorFilter}
              options={auditors.map((a) => ({
                value: a.id,
                label: a.firstName ? `${a.firstName} ${a.lastName || ''}` : a.name || a.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={12}>
            <Space>
              <Tag color="blue" icon={<EnvironmentOutlined />}>
                {lang === 'gu' ? 'શાખા' : 'Branch'}
              </Tag>
              <Tag color="orange" icon={<EnvironmentOutlined />}>
                PACS
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Calendar
            dateCellRender={dateCellRender}
            mode="month"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default PlanCalendar;
