import React, { useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Space, Divider, Alert, Checkbox, Tooltip,
} from 'antd';
import {
  UserOutlined, LockOutlined, GlobalOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { Text } = Typography;

const DEMO_USERS = [
  { employeeCode: 'ADMIN', password: 'admin123', label: 'Admin', color: 'geekblue' },
  { employeeCode: 'HIA001', password: 'hia123', label: 'HIA', color: 'red' },
  { employeeCode: 'PLANNER', password: 'planner123', label: 'Planner', color: 'cyan' },
  { employeeCode: 'AUDITOR', password: 'auditor123', label: 'Auditor', color: 'blue' },
  { employeeCode: 'COMP', password: 'comp123', label: 'Compliance', color: 'green' },
  { employeeCode: 'BM001', password: 'bm123', label: 'Junagadh', color: 'purple' },
  { employeeCode: 'BM002', password: 'bm123', label: 'Veraval', color: 'purple' },
  { employeeCode: 'BM003', password: 'bm123', label: 'Keshod', color: 'purple' },
  { employeeCode: 'BM004', password: 'bm123', label: 'Mangrol', color: 'purple' },
  { employeeCode: 'BM005', password: 'bm123', label: 'Manavadar', color: 'purple' },
  { employeeCode: 'BM006', password: 'bm123', label: 'Visavadar', color: 'purple' },
  { employeeCode: 'BM007', password: 'bm123', label: 'Malia', color: 'purple' },
  { employeeCode: 'BM008', password: 'bm123', label: 'Vanthali', color: 'purple' },
];

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();

  if (isAuthenticated && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const doLogin = async (employeeCode, password) => {
    setError(null);
    setLoading(true);
    try {
      await login(employeeCode, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || (language === 'gu'
        ? 'લોગિન નિષ્ફળ. કૃપા કરીને તમારા ઓળખપત્રો ચકાસો.'
        : 'Login failed. Please check your credentials.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoUser) => {
    form.setFieldsValue({ employeeCode: demoUser.employeeCode, password: demoUser.password });
    doLogin(demoUser.employeeCode, demoUser.password);
  };

  const onFinish = async (values) => {
    await doLogin(values.employeeCode, values.password);
  };

  return (
    <div className="login-page" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
        <Button
          type="text"
          icon={<GlobalOutlined />}
          onClick={toggleLanguage}
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          {language === 'en' ? 'ગુજરાતી' : 'English'}
        </Button>
      </div>

      <Card
        variant="borderless"
        className="login-card"
        styles={{ body: { padding: 0 } }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div className="login-brand" style={{ textAlign: 'center' }}>
            <img src="/JDCC-Logo.png" alt="JJS Bank" style={{ height: 80, marginBottom: 16 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
              JJS Bank <span style={{ color: '#0066cc' }}>AMS</span>
            </div>
          </div>
          <div className="login-sub">
            {language === 'gu'
              ? 'ઓડિટ મેનેજમેન્ટ સિસ્ટમ - શાખા અને મંડળી ઓડિટનું ડિજિટાઇઝેશન'
              : 'Audit Management System - Digitizing Branch & Mandali Audits'}
          </div>

          <Divider style={{ margin: 0 }} />

          {error && (
            <Alert
              message={language === 'gu' ? 'લોગિન ભૂલ' : 'Login Error'}
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            form={form}
            onFinish={onFinish}
            layout="vertical"
            size="large"
            initialValues={{ remember: false }}
            style={{ width: '100%' }}
          >
            <Form.Item
              name="employeeCode"
              rules={[{
                required: true,
                message: language === 'gu' ? 'કર્મચારી કોડ જરૂરી છે' : 'Employee code is required',
              }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('employeeCode', 'Employee Code')}
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{
                required: true,
                message: language === 'gu' ? 'પાસવર્ડ જરૂરી છે' : 'Password is required',
              }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('password', 'Password')}
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>
                    {language === 'gu' ? 'યાદ રાખો' : 'Remember me'}
                  </Checkbox>
                </Form.Item>
              </Space>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
              >
                {language === 'gu' ? 'સાઇન ઇન' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {language === 'gu' ? 'ડેમો યુઝરથી લોગિન કરો' : 'Quick Demo Login'}
            </Text>
          </Divider>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {DEMO_USERS.map((demoUser) => (
              <Tooltip
                key={demoUser.employeeCode}
                title={`${demoUser.employeeCode} / ${demoUser.password}`}
              >
                <span
                  className="login-demo-chip"
                  onClick={() => handleDemoLogin(demoUser)}
                >
                  <LoginOutlined style={{ marginRight: 5 }} />
                  {demoUser.label}
                </span>
              </Tooltip>
            ))}
          </div>



          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid #eef2f7',
              paddingTop: 14,
            }}
          >
            <Button
              type="link"
              size="small"
              href="/AMS_Flow_Presentation.html"
              target="_blank"
              rel="noreferrer"
              style={{ padding: 0 }}
            >
              {language === 'gu' ? 'પ્રેઝન્ટેશન જુઓ' : 'View Presentation'}
            </Button>
            <Divider type="vertical" style={{ margin: 0 }} />
            <Button
              type="link"
              size="small"
              href="/AMS_User_Guide.html"
              target="_blank"
              rel="noreferrer"
              style={{ padding: 0 }}
            >
              {language === 'gu' ? 'યુઝર ગાઈડ' : 'User Guide'}
            </Button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {language === 'gu'
                ? 'ડીસીસીબી - ઓડિટ મેનેજમેન્ટ સિસ્ટમ v2.0'
                : 'JJS Bank - Audit Management System'}
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
