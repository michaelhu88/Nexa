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
   * Fetch all zip uploads from NocoBase
   */
  async getZipUploads(): Promise<any> {
    return makeRequest(API_CONFIG.endpoints.collections.zipUploads);
  },

  /**
   * Fetch the base-template zip from NocoBase
   */
  async getBaseTemplate(): Promise<any> {
    const response = await makeRequest(API_CONFIG.endpoints.templates.allTemplates);

    if (!response.data || response.data.length === 0) {
      throw new ApiError('No zip uploads found', 404, 'NO_UPLOADS_FOUND');
    }

    // Find base-template by title
    const baseTemplate = response.data.find((item: any) => item.title === 'base-template');

    if (!baseTemplate) {
      throw new ApiError('Base template not found', 404, 'TEMPLATE_NOT_FOUND');
    }

    return baseTemplate;
  },

  /**
   * Download a zip file from NocoBase by direct URL
   * Uses Vite proxy for /storage paths to avoid CORS issues in development
   */
  async downloadZipByUrl(url: string): Promise<ArrayBuffer> {
    const token = authStore.get().token;

    /*
     * For storage URLs, use the proxy path directly to avoid CORS
     * This transforms '/storage/uploads/file.zip' to be served via Vite proxy
     */
    const fetchUrl = url.startsWith('/storage') ? url : buildUrl(url);

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(token || undefined),
      },
    });

    if (response.status === 401 || response.status === 403) {
      await logout();
      throw new ApiError('Authentication required', response.status, 'AUTH_ERROR');
    }

    if (!response.ok) {
      throw new ApiError(`Failed to download zip file: ${response.statusText}`, response.status);
    }

    return response.arrayBuffer();
  },

  /**
   * Get base template zip file as ArrayBuffer for processing
   */
  async getBaseTemplateZip(): Promise<ArrayBuffer> {
    try {
      const template = await this.getBaseTemplate();

      if (!template.url) {
        throw new ApiError('Base template file URL not found', 404, 'TEMPLATE_FILE_NOT_FOUND');
      }

      // Use the direct URL from NocoBase (e.g., "/storage/uploads/base-template-auth4x.zip")
      return this.downloadZipByUrl(template.url);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError('Failed to fetch base template', 500, 'TEMPLATE_FETCH_ERROR');
    }
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
