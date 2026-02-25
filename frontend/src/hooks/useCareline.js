/**
 * CareLine React Hooks
 * 数据获取和状态管理
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Generic async data fetching hook
 */
export function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * Auth state hook
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!api.token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      try {
        const fam = await api.getMyFamily();
        setFamily(fam);
      } catch {
        setFamily(null);
      }
    } catch {
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (phone, password) => {
    const data = await api.login(phone, password);
    await loadUser();
    return data;
  };

  const register = async (phone, password, nickname) => {
    const data = await api.register(phone, password, nickname);
    await loadUser();
    return data;
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setFamily(null);
  };

  return { user, family, loading, login, register, logout, refetch: loadUser };
}

/**
 * Current cycle hook
 */
export function useCycle() {
  return useAsync(() => api.getCurrentCycle());
}

/**
 * Today's log hook
 */
export function useTodayLog() {
  return useAsync(() => api.getToday());
}

/**
 * Today's stool summary hook
 */
export function useTodayStool() {
  return useAsync(() => api.getTodayStool());
}

/**
 * Cycle logs for trends
 */
export function useCycleLogs(cycleNo) {
  return useAsync(() => cycleNo ? api.getCycleLogs(cycleNo) : Promise.resolve([]), [cycleNo]);
}

/**
 * Summary hook
 */
export function useSummary(cycleNo, mode = 'caregiver') {
  return useAsync(
    () => api.getSummary(cycleNo, 14, mode),
    [cycleNo, mode]
  );
}

/**
 * Calendar hook
 */
export function useCalendar(year, month) {
  return useAsync(
    () => api.getCalendar(year, month),
    [year, month]
  );
}

/**
 * Active messages hook
 */
export function useMessages() {
  return useAsync(() => api.getActiveMessages());
}

/**
 * Date formatting helper
 */
export function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function toDateStr(d) {
  if (!d) d = new Date();
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
