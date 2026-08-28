import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nutridapur_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/parent-portal') {
      localStorage.removeItem('nutridapur_token');
      localStorage.removeItem('nutridapur_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const fmtRp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
