/**
 * CareLine API Client
 * 封装所有后端 API 调用
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('careline_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('careline_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('careline_token');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.clearToken();
      window.location.reload();
      throw new Error('登录已过期');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '请求失败' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  get(path) {
    return this.request(path);
  }

  post(path, data) {
    return this.request(path, { method: 'POST', body: JSON.stringify(data) });
  }

  put(path, data) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(data) });
  }

  patch(path, data) {
    return this.request(path, { method: 'PATCH', body: JSON.stringify(data) });
  }

  del(path) {
    return this.request(path, { method: 'DELETE' });
  }

  // ─── Auth ────────────────────────────────────────────────────────
  async register(phone, password, nickname) {
    const data = await this.post('/auth/register', { phone, password, nickname });
    this.setToken(data.access_token);
    return data;
  }

  async login(phone, password) {
    const data = await this.post('/auth/login', { phone, password });
    this.setToken(data.access_token);
    return data;
  }

  async wechatLogin(code) {
    const data = await this.post('/auth/wechat', { code });
    this.setToken(data.access_token);
    return data;
  }

  getMe() {
    return this.get('/auth/me');
  }

  // ─── Family ──────────────────────────────────────────────────────
  createFamily(name, role) {
    return this.post('/family/create', { name, role });
  }

  joinFamily(inviteCode, role) {
    return this.post('/family/join', { invite_code: inviteCode, role });
  }

  getMyFamily() {
    return this.get('/family/me');
  }

  // ─── Cycle ───────────────────────────────────────────────────────
  createCycle(cycleNo, startDate, lengthDays, regimen) {
    return this.post('/cycle', {
      cycle_no: cycleNo,
      start_date: startDate,
      length_days: lengthDays,
      regimen: regimen || null,
    });
  }

  getCurrentCycle() {
    return this.get('/cycle/current');
  }

  listCycles() {
    return this.get('/cycle/list');
  }

  // ─── DailyLog ────────────────────────────────────────────────────
  upsertDailyLog(dateStr, data) {
    return this.put(`/daily/${dateStr}`, data);
  }

  getDailyRange(from, to) {
    return this.get(`/daily/range?from=${from}&to=${to}`);
  }

  getCycleLogs(cycleNo) {
    return this.get(`/daily/cycle/${cycleNo}`);
  }

  getToday() {
    return this.get('/daily/today');
  }

  // ─── Stool ───────────────────────────────────────────────────────
  createStoolEvent(data) {
    return this.post('/stool', data);
  }

  getTodayStool() {
    return this.get('/stool/today');
  }

  getStoolRange(from, to) {
    return this.get(`/stool/range?from=${from}&to=${to}`);
  }

  deleteStoolEvent(eventId) {
    return this.del(`/stool/${eventId}`);
  }

  // ─── Summary ─────────────────────────────────────────────────────
  getSummary(cycleNo, days = 14, mode = 'caregiver') {
    const params = new URLSearchParams({ days, mode });
    if (cycleNo) params.set('cycle_no', cycleNo);
    return this.get(`/summary?${params}`);
  }

  getCalendar(year, month) {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return this.get(`/summary/calendar?${params}`);
  }

  // ─── Message ─────────────────────────────────────────────────────
  sendMessage(content) {
    return this.post('/message', { content });
  }

  getActiveMessages() {
    return this.get('/message/active');
  }
}

export const api = new ApiClient();
export default api;
