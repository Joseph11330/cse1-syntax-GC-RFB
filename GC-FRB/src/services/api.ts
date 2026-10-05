import axios from 'axios';
import type { LoginPayload, LoginResponse, Stat, Activity } from '../types';

const TOKEN_KEY = 'gcfrb_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Set VITE_API_URL in .env (e.g. http://localhost:5000/api). Set VITE_USE_MOCK=true to run without the backend.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api' });

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export const authApi = {
  async login(p: LoginPayload): Promise<LoginResponse> {
    if (USE_MOCK) {
      await wait();
      if (p.password.length < 4) throw new Error('Incorrect email or password.');
      return { token: 'mock-token', user: { id: '1', name: 'Joseph Reyes', email: p.email, role: 'admin' } };
    }
    try {
      const { data } = await http.post<LoginResponse>('/auth/login', p); // adjust to your backend route
      return data;
    } catch (e: any) {
      throw new Error(e?.response?.data?.message ?? 'Incorrect email or password.');
    }
  },
  async me() {
    if (USE_MOCK) { await wait(200); return { id: '1', name: 'Joseph Reyes', email: 'joseph@example.com', role: 'admin' as const }; }
    return (await http.get('/auth/me')).data; // adjust to your backend route
  },
};

export const dashboardApi = {
  async stats(): Promise<Stat[]> {
    if (USE_MOCK) {
      await wait();
      return [
        { label: 'Total records', value: '1,284', hint: '+36 this week', tone: 'good' },
        { label: 'Pending review', value: '27', hint: '5 older than 3 days', tone: 'warn' },
        { label: 'Completed today', value: '48', hint: 'Target is 60' },
        { label: 'Active users', value: '12', hint: '3 online now' },
      ];
    }
    return (await http.get('/dashboard/stats')).data;
  },
  async activity(): Promise<Activity[]> {
    if (USE_MOCK) {
      await wait();
      return [
        { id: 'A-1042', title: 'Record updated', by: 'Maria Santos', date: 'Oct 5, 2026', status: 'Done' },
        { id: 'A-1041', title: 'New entry submitted', by: 'Jun Dela Cruz', date: 'Oct 5, 2026', status: 'Pending' },
        { id: 'A-1040', title: 'Entry flagged for review', by: 'Ana Lim', date: 'Oct 4, 2026', status: 'Flagged' },
        { id: 'A-1039', title: 'Record approved', by: 'Maria Santos', date: 'Oct 4, 2026', status: 'Done' },
        { id: 'A-1038', title: 'New entry submitted', by: 'Paolo Cruz', date: 'Oct 3, 2026', status: 'Pending' },
      ];
    }
    return (await http.get('/dashboard/activity')).data;
  },
};
