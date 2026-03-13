import api from './client'

// ── Auth ──────────────────────────────────────────
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me:    ()                   => api.get('/auth/me'),
}

// ── Users (manager only) ──────────────────────────
export const usersAPI = {
  list:       ()                    => api.get('/users/'),
  create:     (data)                => api.post('/users/', data),
  update:     (id, data)            => api.patch(`/users/${id}`, data),
  deactivate: (id)                  => api.delete(`/users/${id}`),
}

// ── Customers ─────────────────────────────────────
export const customersAPI = {
  list:   (search = '') => api.get('/customers/', { params: { search } }),
  create: (data)        => api.post('/customers/', data),
  update: (id, data)    => api.patch(`/customers/${id}`, data),
}

// ── Transactions ──────────────────────────────────
export const transactionsAPI = {
  list: (params = {}) => api.get('/transactions/', { params }),
  create: (data)      => api.post('/transactions/', data),
  update: (id, data)  => api.patch(`/transactions/${id}`, data),
  delete: (id)        => api.delete(`/transactions/${id}`),
}

// ── Reports ───────────────────────────────────────
export const reportsAPI = {
  summary:      (params = {}) => api.get('/reports/summary', { params }),
  byCategory:   (params = {}) => api.get('/reports/expenses/by-category', { params }),
  byWorker:     (params = {}) => api.get('/reports/expenses/by-worker', { params }),
  dailyCash:    ()             => api.get('/reports/daily-cash'),
  openDay:      (data)         => api.post('/reports/daily-cash', data),
  closeDay:     (date, data)   => api.patch(`/reports/daily-cash/${date}/close`, data),
}
