import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { InventoryTable } from './InventoryTable';
import { apiClient } from '~/lib/api/client';
import type { InventoryItem } from '~/types/inventory';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getInventory();
      setItems(response.data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch inventory';
      setError(errorMessage);
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-nexa-elements-background-depth-1">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-nexa-elements-textPrimary">Inventory Management</h1>
            <p className="text-nexa-elements-textSecondary mt-1">Manage your inventory items from NocoBase</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={fetchInventory}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <div className={`i-ph:arrow-clockwise-duotone ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() =>
                window.open(`${import.meta.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000'}/admin`, '_blank')
              }
              variant="default"
              size="sm"
              className="flex items-center space-x-2"
            >
              <div className="i-ph:gear-duotone" />
              <span>NocoBase Admin</span>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
            <div className="flex">
              <div className="i-ph:warning-circle-duotone text-red-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading inventory</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={fetchInventory}
                    variant="outline"
                    size="sm"
                    className="text-red-800 border-red-300 hover:bg-red-100 dark:text-red-200 dark:border-red-700 dark:hover:bg-red-900"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <InventoryTable items={items} isLoading={isLoading} />

        {/* Stats */}
        {!isLoading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor p-4">
              <div className="flex items-center">
                <div className="i-ph:package-duotone text-2xl text-blue-600 dark:text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-nexa-elements-textSecondary">Total Items</p>
                  <p className="text-2xl font-bold text-nexa-elements-textPrimary">{items.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor p-4">
              <div className="flex items-center">
                <div className="i-ph:chart-line-up-duotone text-2xl text-green-600 dark:text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-nexa-elements-textSecondary">In Stock</p>
                  <p className="text-2xl font-bold text-nexa-elements-textPrimary">
                    {items.filter((item) => item.quantity > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor p-4">
              <div className="flex items-center">
                <div className="i-ph:warning-duotone text-2xl text-orange-600 dark:text-orange-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-nexa-elements-textSecondary">Low Stock</p>
                  <p className="text-2xl font-bold text-nexa-elements-textPrimary">
                    {items.filter((item) => item.quantity > 0 && item.quantity < 10).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
