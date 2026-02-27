// ============================================
// Agent 7 of 10 — API Client
// Task Management App
// ============================================
// Provides fetch wrappers for communicating with
// the backend API (built by Agents 3 & 4).
// ============================================

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

// --- Auth API ---

export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => request('/auth/me'),

  logout: () => {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new Event('auth:logout'));
  },
};

// --- Tasks API ---

export const tasksApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.search) params.set('search', filters.search);
    if (filters.sort) params.set('sort', filters.sort);
    const query = params.toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },

  getById: (id) => request(`/tasks/${id}`),

  create: (task) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  update: (id, updates) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id) =>
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  toggleComplete: (id, completed) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: completed ? 'completed' : 'todo' }),
    }),
};

// --- Projects / Lists API ---

export const projectsApi = {
  getAll: () => request('/projects'),

  getById: (id) => request(`/projects/${id}`),

  create: (project) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  update: (id, updates) =>
    request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id) =>
    request(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

export default request;
