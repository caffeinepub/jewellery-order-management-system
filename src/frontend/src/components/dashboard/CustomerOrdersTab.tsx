import { useState } from 'react';
import { useGetOrdersByType } from '@/hooks/useQueries';
import { OrderType } from '@/backend';
import OrderTable from './OrderTable';

export default function CustomerOrdersTab() {
  const { data: orders = [], isLoading } = useGetOrdersByType(OrderType.CO);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} order(s) selected
          </span>
        </div>
      )}
      <OrderTable
        orders={orders}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
