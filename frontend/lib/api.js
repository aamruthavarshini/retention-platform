import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use(config => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const getCustomers = (params) => api.get('/customers', { params }).then(r => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then(r => r.data);
export const getRetentionActions = (params) => api.get('/retention-actions', { params }).then(r => r.data);
export const updateRetentionAction = (id, data) => api.patch(`/retention-actions/${id}`, data).then(r => r.data);
export const downloadTemplate = () => api.get('/upload/template', { responseType: 'blob' }).then(r => r.data);
export const generateForensicsReport = (customerId) => api.post(`/ai/forensics/${customerId}`).then(r => r.data);
export const generateRetentionEmail = (customerId) => api.post(`/ai/retention-email/${customerId}`).then(r => r.data);
export const sendRetentionEmail = (to, customerName, emailBody) => api.post('/ai/send-email', { to, customerName, emailBody }).then(r => r.data);
export const previewCSV = (formData) => api.post('/upload/preview', formData).then(r => r.data);
export const importCSV = (formData) => api.post('/upload/import', formData).then(r => r.data);
export const validateCSV = (formData) => api.post('/upload/validate', formData).then(r => r.data);
export const sendChatMessage = (message, history) => api.post('/chat', { message, history }).then(r => r.data);
export const downloadReport = () => api.get('/report/executive', { responseType: 'blob' }).then(r => r.data);
export const getWinbackCampaigns = () => api.get('/winback').then(r => r.data);
export const addWinbackCampaign = (data) => api.post('/winback', data).then(r => r.data);
export const updateWinbackCampaign = (id, data) => api.patch(`/winback/${id}`, data).then(r => r.data);
export const deleteWinbackCampaign = (id) => api.delete(`/winback/${id}`).then(r => r.data);