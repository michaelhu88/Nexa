import { Badge } from '~/components/ui/Badge';
import { classNames } from '~/utils/classNames';
import type { InventoryItem } from '~/types/inventory';

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading?: boolean;
}

export function InventoryTable({ items, isLoading }: InventoryTableProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const formatPrice = (price?: number) => {
    if (typeof price === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
    }

    return 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'N/A';
    }

    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-nexa-elements-background-depth-2 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-nexa-elements-background-depth-2 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor p-12 text-center">
        <div className="i-ph:package-duotone text-4xl text-nexa-elements-textSecondary mb-4" />
        <h3 className="text-lg font-medium text-nexa-elements-textPrimary mb-2">No inventory items found</h3>
        <p className="text-nexa-elements-textSecondary">
          Your inventory appears to be empty or there was an issue loading the data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-nexa-elements-background rounded-lg border border-nexa-elements-borderColor overflow-hidden">
      <div className="px-6 py-4 border-b border-nexa-elements-borderColor">
        <h2 className="text-lg font-medium text-nexa-elements-textPrimary">Inventory Items ({items.length})</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-nexa-elements-background-depth-1">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nexa-elements-textSecondary uppercase tracking-wider">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nexa-elements-borderColor">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-nexa-elements-background-depth-1 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-nexa-elements-textPrimary">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-nexa-elements-textSecondary mt-1 max-w-xs truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-nexa-elements-textPrimary font-mono">{item.sku || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-nexa-elements-textPrimary">{item.category || 'Uncategorized'}</td>
                <td className="px-6 py-4">
                  <span
                    className={classNames(
                      'text-sm font-medium',
                      item.quantity === 0
                        ? 'text-red-600 dark:text-red-400'
                        : item.quantity < 10
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-nexa-elements-textPrimary',
                    )}
                  >
                    {item.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-nexa-elements-textPrimary font-mono">
                  {formatPrice(item.price)}
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(item.status)}>{item.status || 'unknown'}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-nexa-elements-textSecondary">{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
