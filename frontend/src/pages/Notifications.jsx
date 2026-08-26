import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb, Card, Table, Button, Tag, Space, Typography, Spin, Empty,
  Segmented, Badge,
} from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined, ReloadOutlined,
  MailOutlined, MobileOutlined, DesktopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import apiFunctions from '../services/api';
import { feedback as message } from '../services/feedback';
import { useLanguage } from '../context/LanguageContext';

const { Title, Text } = Typography;

const channelConfig = {
  InApp: { icon: <DesktopOutlined />, color: 'red', label: 'In-App' },
  Email: { icon: <MailOutlined />, color: 'blue', label: 'Email' },
  SMS: { icon: <MobileOutlined />, color: 'green', label: 'SMS' },
};

const Notifications = () => {
  const { t, language } = useLanguage();
  const lang = language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFunctions.notifications.list();
      setNotifications(res.data?.data || res.data || []);
    } catch {
      message.error(lang === 'gu' ? 'સૂચનાઓ લાવવામાં નિષ્ફળ' : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await apiFunctions.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          (notification.id || notification._id) === id ? { ...notification, isRead: true } : notification,
        ),
      );
      message.success(lang === 'gu' ? 'વાંચી ચિહ્નિત કરી' : 'Marked as read');
    } catch {
      message.error(lang === 'gu' ? 'નિષ્ફળ' : 'Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFunctions.notifications.markAllRead();
      message.success(lang === 'gu' ? 'બધી વાંચી ચિહ્નિત કરી' : 'All marked as read');
      fetchNotifications();
    } catch {
      message.error(lang === 'gu' ? 'નિષ્ફળ' : 'Failed to mark all as read');
    }
  };

  const filtered = notifications.filter((notification) => {
    const read = notification.isRead;
    if (filter === 'unread') return !read;
    if (filter === 'read') return !!read;
    return true;
  });

  const unread = notifications.filter((notification) => !notification.isRead).length;

  const columns = [
    {
      title: '',
      key: 'dot',
      width: 40,
      render: (_, record) => (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: record.isRead ? '#cfc9c0' : '#d92332',
            display: 'inline-block',
          }}
        />
      ),
    },
    {
      title: lang === 'gu' ? 'શીર્ષક' : 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (value, record) => (
        <div>
          <Text strong={!record.isRead}>{value || record.message}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.message}</Text>
          </div>
        </div>
      ),
    },
    {
      title: lang === 'gu' ? 'ચેનલ' : 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      width: 110,
      render: (value) => {
        const config = channelConfig[value] || channelConfig.InApp;
        return <Tag icon={config.icon} color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: lang === 'gu' ? 'ઘટના' : 'Event',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 160,
      render: (value) => (value ? <Tag>{value.replace(/_/g, ' ')}</Tag> : '-'),
    },
    {
      title: lang === 'gu' ? 'સમય' : 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: lang === 'gu' ? 'ક્રિયાઓ' : 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          {!record.isRead && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarkRead(record.id || record._id)}
            >
              {lang === 'gu' ? 'વાંચી' : 'Read'}
            </Button>
          )}
          {record.subjectType === 'AuditInstance' && record.subjectId && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/auditor/audit/${record.subjectId}/view`)}
            >
              {lang === 'gu' ? 'જુઓ' : 'View'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb
            items={[
              { title: lang === 'gu' ? 'હોમ' : 'Home' },
              { title: lang === 'gu' ? 'સૂચનાઓ' : 'Notifications' },
            ]}
            style={{ marginBottom: 8 }}
          />
          <Title level={3} style={{ margin: 0 }}>
            <BellOutlined style={{ marginRight: 10, color: '#d92332' }} />
            {lang === 'gu' ? 'સૂચનાઓ' : 'Notifications'}
            {unread > 0 && (
              <Badge
                count={unread}
                style={{ marginLeft: 12, verticalAlign: 'middle' }}
                color="#d92332"
              />
            )}
          </Title>
        </div>
        <Space wrap>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: lang === 'gu' ? `બધી (${notifications.length})` : `All (${notifications.length})`, value: 'all' },
              { label: lang === 'gu' ? `નવી (${unread})` : `Unread (${unread})`, value: 'unread' },
              { label: lang === 'gu' ? 'વાંચેલી' : 'Read', value: 'read' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchNotifications}>
            {lang === 'gu' ? 'રિફ્રેશ' : 'Refresh'}
          </Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            {lang === 'gu' ? 'બધી વાંચી' : 'Mark All Read'}
          </Button>
        </Space>
      </div>

      <Card>
        <Spin spinning={loading}>
          <Table
            rowKey={(record) => record.id || record._id}
            columns={columns}
            dataSource={filtered}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) =>
                lang === 'gu' ? `કુલ ${total} સૂચનાઓ` : `Total ${total} notifications`,
            }}
            locale={{
              emptyText: <Empty description={lang === 'gu' ? 'કોઈ સૂચનાઓ નથી' : 'No notifications'} />,
            }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default Notifications;
