/**
 * API Configuration for NocoBase integration
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000',
  endpoints: {
    auth: {
      signIn: '/api/auth:signIn',
      signOut: '/api/auth:signOut',
      check: '/api/auth:check',
    },
    collections: {
      inventory: '/api/collections/inventory',
    },
  },
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

export const getAuthHeaders = (token?: string) => ({
  ...API_CONFIG.headers,
  ...(token && { Authorization: `Bearer ${token}` }),
});

export const buildUrl = (endpoint: string) => {
  const base = API_CONFIG.baseURL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${base}${path}`;
};
