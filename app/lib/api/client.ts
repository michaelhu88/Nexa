import { API_CONFIG, getAuthHeaders, buildUrl } from '~/lib/config/api';
import { authStore, logout } from '~/lib/stores/auth';
import type { ApiErrorResponse } from '~/types/api';
import type { InventoryResponse } from '~/types/inventory';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStore.get().token;

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(token || undefined),
      ...options.headers,
    },
  };

  const response = await fetch(buildUrl(endpoint), config);

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    await logout();
    throw new ApiError('Authentication required', response.status, 'AUTH_ERROR');
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = 'An error occurred';

    try {
      const errorData: ApiErrorResponse = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  return data as T;
}

export const apiClient = {
  /**
   * Fetch inventory items from NocoBase
   */
  async getInventory(): Promise<InventoryResponse> {
    const response = await makeRequest<any>(API_CONFIG.endpoints.collections.inventory);
    return response as InventoryResponse;
  },

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return makeRequest<T>(endpoint, { method: 'GET' });
  },

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return makeRequest<T>(endpoint, { method: 'DELETE' });
  },
};
