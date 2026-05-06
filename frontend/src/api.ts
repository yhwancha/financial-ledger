const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '오류가 발생했습니다.' }));
    throw new Error(err.detail ?? '오류가 발생했습니다.');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  memo: string;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ id: number; email: string }>('/users/me'),

  getTransactions: (year: number, month: number) =>
    request<Transaction[]>(`/transactions?year=${year}&month=${month}`),

  createTransaction: (data: Omit<Transaction, 'id'>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: number, data: Partial<Omit<Transaction, 'id'>>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request<void>(`/transactions/${id}`, { method: 'DELETE' }),

  getBudget: (year: number, month: number) =>
    request<{ year: number; month: number; amount: number }>(`/budgets/${year}/${month}`),

  setBudget: (year: number, month: number, amount: number) =>
    request<{ year: number; month: number; amount: number }>(`/budgets/${year}/${month}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }),
};
