import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import App from './App';
import { setFeedbackApis } from './services/feedback';
import './App.css';

const theme = {
  token: {
    colorPrimary: '#d92332',
    colorPrimaryHover: '#ef4b5a',
    colorPrimaryActive: '#b91c2c',
    colorInfo: '#d92332',
    colorSuccess: '#4a7c59',
    colorWarning: '#c77d2e',
    colorError: '#b91c2c',
    colorTextBase: '#17181c',
    colorText: '#17181c',
    colorTextSecondary: '#6b7280',
    colorBgLayout: '#f4f3f1',
    colorBgContainer: '#ffffff',
    colorBorder: '#e7e2dc',
    colorBorderSecondary: '#f0ece6',
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    controlHeight: 36,
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Gujarati', sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#141416',
      headerBg: '#141416',
      headerHeight: 58,
      headerColor: '#ffffff',
      bodyBg: '#f4f3f1',
    },
    Menu: {
      darkItemBg: '#141416',
      darkSubMenuItemBg: '#141416',
      darkItemSelectedBg: '#2a171b',
      darkItemHoverBg: '#222225',
      darkItemColor: '#a3a3a8',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverColor: '#ffffff',
      itemBorderRadius: 9,
      activeBarBorderWidth: 0,
    },
    Button: {
      primaryShadow: '0 2px 6px rgba(217, 35, 50, 0.25)',
      fontWeight: 600,
      borderRadius: 10,
      borderRadiusSM: 8,
    },
    Card: {
      borderRadiusLG: 14,
      headerFontSize: 14,
    },
    Table: {
      headerBg: '#faf9f7',
      headerColor: '#6b7280',
      rowHoverBg: '#fbf7f7',
      borderColor: '#f0ece6',
      headerSplitColor: '#e7e2dc',
      fontSize: 13,
    },
    Tag: {
      borderRadiusSM: 20,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Statistic: {
      contentFontSize: 22,
    },
    Tabs: {
      itemSelectedColor: '#d92332',
      inkBarColor: '#d92332',
    },
    Select: {
      optionSelectedBg: '#fde8ea',
    },
    Dropdown: {
      borderRadiusLG: 12,
    },
  },
};

const container = document.getElementById('root');
const root = createRoot(container);

const FeedbackBridge = () => {
  const apis = AntApp.useApp();

  useEffect(() => {
    setFeedbackApis(apis);
  }, [apis]);

  return null;
};

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <FeedbackBridge />
          <App />
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
