import axios from 'axios';

const api = axios.create({
  baseURL: 'https://vedanshipanda-zomathon-api.hf.space',
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Unknown error';
    console.error('[API Error]', msg);
    return Promise.reject(new Error(msg));
  }
);

export const getRecommendations = (payload) =>
  api.post('/api/recommend', payload).then((res) => res.data);

// ── Health check ──────────────────────────────────────
export const healthCheck = () =>
  api.get('/health').then((res) => res.data);

export default api;
