import React from 'react';
import { Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Result
        status="403"
        title="403"
        subTitle={
          language === 'gu'
            ? 'તમને આ પૃષ્ઠ એક્સેસ કરવાની અનુમતિ નથી'
            : t('notAuthorized', 'You do not have permission to access this page')
        }
        icon={<LockOutlined style={{ color: '#b91c2c', fontSize: 72 }} />}
        extra={
          <Button type="primary" size="large" onClick={() => navigate('/dashboard')}>
            {language === 'gu' ? 'ડેશબોર્ડ પર પાછા જાઓ' : t('backToDashboard', 'Back to Dashboard')}
          </Button>
        }
      />
    </div>
  );
};

export default Unauthorized;
