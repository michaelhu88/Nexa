/**
 * Inventory types for NocoBase collections
 */

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  price?: number;
  sku?: string;
  status?: 'active' | 'inactive' | 'out_of_stock';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow for additional NocoBase fields
}

export interface InventoryResponse {
  data: InventoryItem[];
  meta?: {
    count: number;
    page?: number;
    pageSize?: number;
    totalPage?: number;
  };
}
