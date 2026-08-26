import axios from 'axios';
import { feedbackNotification as notification } from './feedback';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const addDocumentIds = (value) => {
  if (Array.isArray(value)) return value.map(addDocumentIds);
  if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof Date) return value;

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, addDocumentIds(item)])
  );
  if (normalized._id && !normalized.id) normalized.id = String(normalized._id);
  return normalized;
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ams_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data && response.config.responseType !== 'blob') {
      response.data = addDocumentIds(response.data);
    }
    return response;
  },
  (error) => {
    const { response } = error;
    if (response) {
      if (response.status === 401) {
        localStorage.removeItem('ams_token');
        localStorage.removeItem('ams_refresh_token');
        localStorage.removeItem('ams_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (response.status >= 500) {
        notification.error({ message: 'Server Error', description: 'An unexpected error occurred.' });
      }
    } else {
      notification.error({ message: 'Network Error', description: 'Unable to connect to server.' });
    }
    return Promise.reject(error);
  }
);

const apiFunctions = {
  auth: {
    login: (employeeCode, password) => api.post('/auth/login', { employeeCode, password }),
    refresh: (token) => api.post('/auth/refresh', { refreshToken: token }),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    updateMe: (data) => api.put('/auth/me', data),
    changePassword: (data) => api.put('/auth/change-password', data),
  },
  users: {
    list: (params) => api.get('/users', { params }),
    get: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    assignRoles: (id, data) => api.put(`/users/${id}/roles`, data),
    getAuditors: () => api.get('/users/auditors'),
    getBranchManagers: () => api.get('/users/branch-managers'),
  },
  rbac: {
    listRoles: () => api.get('/rbac/roles'),
    createRole: (data) => api.post('/rbac/roles', data),
    getRole: (id) => api.get(`/rbac/roles/${id}`),
    updateRole: (id, data) => api.put(`/rbac/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/rbac/roles/${id}`),
    updatePermissions: (id, data) => api.put(`/rbac/roles/${id}/permissions`, data),
    listPermissions: () => api.get('/rbac/permissions'),
    createPermission: (data) => api.post('/rbac/permissions', data),
  },
  masters: {
    branches: {
      list: () => api.get('/masters/branches'),
      get: (id) => api.get(`/masters/branches/${id}`),
      create: (data) => api.post('/masters/branches', data),
      update: (id, data) => api.put(`/masters/branches/${id}`, data),
      delete: (id) => api.delete(`/masters/branches/${id}`),
    },
    pacs: {
      list: () => api.get('/masters/pacs'),
      get: (id) => api.get(`/masters/pacs/${id}`),
      create: (data) => api.post('/masters/pacs', data),
      update: (id, data) => api.put(`/masters/pacs/${id}`, data),
      delete: (id) => api.delete(`/masters/pacs/${id}`),
      bulkImport: (data) => api.post('/masters/pacs/bulk-import', data),
    },
    financialYears: {
      list: () => api.get('/masters/financial-years'),
      create: (data) => api.post('/masters/financial-years', data),
      update: (id, data) => api.put(`/masters/financial-years/${id}`, data),
      delete: (id) => api.delete(`/masters/financial-years/${id}`),
    },
    auditTypes: {
      list: () => api.get('/masters/audit-types'),
      create: (data) => api.post('/masters/audit-types', data),
      update: (id, data) => api.put(`/masters/audit-types/${id}`, data),
      delete: (id) => api.delete(`/masters/audit-types/${id}`),
    },
  },
  templates: {
    list: (params) => api.get('/templates', { params }),
    get: (id) => api.get(`/templates/${id}`),
    create: (data) => api.post('/templates', data),
    update: (id, data) => api.put(`/templates/${id}`, data),
    delete: (id) => api.delete(`/templates/${id}`),
    publish: (id) => api.post(`/templates/${id}/publish`),
    clone: (id) => api.post(`/templates/${id}/clone`),
    preview: (id) => api.get(`/templates/${id}/preview`),
    sections: {
      list: (tid) => api.get(`/templates/${tid}/sections`),
      create: (tid, data) => api.post(`/templates/${tid}/sections`, data),
      update: (tid, sc, data) => api.put(`/templates/${tid}/sections/${sc}`, data),
      delete: (tid, sc) => api.delete(`/templates/${tid}/sections/${sc}`),
    },
    fields: {
      list: (tid, sc) => api.get(`/templates/${tid}/sections/${sc}/fields`),
      create: (tid, sc, data) => api.post(`/templates/${tid}/sections/${sc}/fields`, data),
      update: (tid, sc, fc, data) => api.put(`/templates/${tid}/sections/${sc}/fields/${fc}`, data),
      delete: (tid, sc, fc) => api.delete(`/templates/${tid}/sections/${sc}/fields/${fc}`),
    },
  },
  optionLists: {
    list: () => api.get('/templates/option-lists'),
    create: (data) => api.post('/templates/option-lists', data),
    update: (id, data) => api.put(`/templates/option-lists/${id}`, data),
    delete: (id) => api.delete(`/templates/option-lists/${id}`),
    addItem: (id, data) => api.post(`/templates/option-lists/${id}/items`, data),
    updateItem: (id, idx, data) => api.put(`/templates/option-lists/${id}/items/${idx}`, data),
    deleteItem: (id, idx) => api.delete(`/templates/option-lists/${id}/items/${idx}`),
    items: {
      list: (id) => api.get(`/templates/option-lists/${id}/items`),
      create: (id, data) => api.post(`/templates/option-lists/${id}/items`, data),
      update: (id, idx, data) => api.put(`/templates/option-lists/${id}/items/${idx}`, data),
      delete: (id, idx) => api.delete(`/templates/option-lists/${id}/items/${idx}`),
    },
  },
  valueStatements: {
    list: () => api.get('/templates/value-statements'),
    create: (data) => api.post('/templates/value-statements', data),
    update: (id, data) => api.put(`/templates/value-statements/${id}`, data),
    delete: (id) => api.delete(`/templates/value-statements/${id}`),
  },
  riskConfigs: {
    list: (params) => api.get('/templates/risk-configs', { params }),
    create: (data) => api.post('/templates/risk-configs', data),
    update: (id, data) => api.put(`/templates/risk-configs/${id}`, data),
  },
  planning: {
    list: () => api.get('/planning'),
    create: (data) => api.post('/planning', data),
    get: (id) => api.get(`/planning/${id}`),
    update: (id, data) => api.put(`/planning/${id}`, data),
    delete: (id) => api.delete(`/planning/${id}`),
    autoGenerate: (id) => api.post(`/planning/${id}/auto-generate`),
    submit: (id) => api.post(`/planning/${id}/submit`),
    approve: (id) => api.post(`/planning/${id}/approve`),
    getCalendar: () => api.get('/planning/calendar'),
    items: {
      list: (planId) => api.get(`/planning/${planId}/items`),
      create: (planId, data) => api.post(`/planning/${planId}/items`, data),
      update: (planId, id, data) => api.put(`/planning/${planId}/items/${id}`, data),
      delete: (planId, id) => api.delete(`/planning/${planId}/items/${id}`),
      bulkImport: (planId, data) => api.post(`/planning/${planId}/items/bulk-import`, data),
    },
    plans: {
      list: () => api.get('/planning'),
      get: (id) => api.get(`/planning/${id}`),
      create: (data) => api.post('/planning', data),
      update: (id, data) => api.put(`/planning/${id}`, data),
      delete: (id) => api.delete(`/planning/${id}`),
      autoGenerate: ({ planId }) => api.post(`/planning/${planId}/auto-generate`),
      submit: (id) => api.post(`/planning/${id}/submit`),
      approve: (id) => api.post(`/planning/${id}/approve`),
      getCalendar: (params) => api.get('/planning/calendar', { params }),
      items: {
        list: (planId) => api.get(`/planning/${planId}/items`),
        create: (planId, data) => api.post(`/planning/${planId}/items`, data),
        update: (planId, itemId, data) => api.put(`/planning/${planId}/items/${itemId}`, data),
        delete: (planId, itemId) => api.delete(`/planning/${planId}/items/${itemId}`),
        bulkImport: (planId, data) => api.post(`/planning/${planId}/items/bulk-import`, data),
      },
    },
  },
  audit: {
    list: () => api.get('/audit'),
    listInstances: (params) => api.get('/audit', { params }),
    create: (data) => api.post('/audit', data),
    get: (id) => api.get(`/audit/${id}`),
    getInstance: (id) => api.get(`/audit/${id}`),
    deleteInstance: (id) => api.delete(`/audit/${id}`),
    getForm: (id) => api.get(`/audit/${id}/form`),
    saveResponses: (id, data) => api.post(`/audit/${id}/responses`, data),
    uploadAttachments: (id, formData) => api.post(`/audit/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    createObservation: (id, data) => api.post(`/audit/${id}/observations`, data),
    submit: (id) => api.post(`/audit/${id}/submit`),
    workflowAction: (id, data) => api.post(`/audit/${id}/workflow-action`, data),
    getRiskScore: (id) => api.get(`/audit/${id}/risk-score`),
    exportPdf: (id) => api.get(`/audit/${id}/export-pdf`, { responseType: 'blob' }),
  },
  compliance: {
    listObservations: (params) => api.get('/compliance/observations', { params }),
    getObservation: (id) => api.get(`/compliance/observations/${id}`),
    submitAction: (id, data) => api.post(`/compliance/observations/${id}/actions`, data),
    verify: (id) => api.post(`/compliance/observations/${id}/verify`),
    getAgeing: () => api.get('/compliance/observations/ageing'),
  },
  closure: {
    getReady: () => api.get('/closure/ready-for-closure'),
    getReadyForClosure: () => api.get('/closure/ready-for-closure'),
    generate: (id) => api.post(`/closure/${id}/generate`),
    generateClosure: ({ auditInstanceId, remarks }) => api.post(`/closure/${auditInstanceId}/generate`, { remarks }),
    getCertificate: (id) => api.get(`/closure/${id}/certificate`),
    reopen: (id) => api.post(`/closure/${id}/reopen`),
  },
  reports: {
    planVsActual: (params) => api.get('/reports/plan-vs-actual', { params }),
    observationRegister: (params) => api.get('/reports/observation-register', { params }),
    riskTrend: (params) => api.get('/reports/risk-trend', { params }),
    complianceAgeing: (params) => api.get('/reports/compliance-ageing', { params }),
    hiaDashboard: (params) => api.get('/reports/hia-dashboard', { params }),
    auditorDashboard: (params) => api.get('/reports/auditor-dashboard', { params }),
    branchManagerDashboard: (params) => api.get('/reports/branch-manager-dashboard', { params }),
  },
  notifications: {
    list: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
    unreadCount: () => api.get('/notifications/unread-count'),
    templates: {
      list: () => api.get('/notifications/templates'),
      create: (data) => api.post('/notifications/templates', data),
      update: (id, data) => api.put(`/notifications/templates/${id}`, data),
      delete: (id) => api.delete(`/notifications/templates/${id}`),
    },
  },
};

export default apiFunctions;
export { api };
