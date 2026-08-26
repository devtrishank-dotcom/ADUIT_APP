import { message as staticMessage, notification as staticNotification } from 'antd';

let messageApi = staticMessage;
let notificationApi = staticNotification;

export const setFeedbackApis = ({ message, notification }) => {
  if (message) messageApi = message;
  if (notification) notificationApi = notification;
};

export const feedback = {
  success: (...args) => messageApi.success(...args),
  error: (...args) => messageApi.error(...args),
  info: (...args) => messageApi.info(...args),
  warning: (...args) => messageApi.warning(...args),
  loading: (...args) => messageApi.loading(...args),
  open: (...args) => messageApi.open(...args),
  destroy: (...args) => messageApi.destroy(...args),
};

export const feedbackNotification = {
  success: (...args) => notificationApi.success(...args),
  error: (...args) => notificationApi.error(...args),
  info: (...args) => notificationApi.info(...args),
  warning: (...args) => notificationApi.warning(...args),
  open: (...args) => notificationApi.open(...args),
  destroy: (...args) => notificationApi.destroy(...args),
};
