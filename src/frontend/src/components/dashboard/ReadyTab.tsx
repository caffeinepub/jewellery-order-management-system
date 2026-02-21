import { useState } from 'react';
import { useGetAllOrders } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import OrderTable from './OrderTable';

export default function ReadyTab() {
  const { data: allOrders = [], isLoading } = useGetAllOrders();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter orders on the frontend since backend doesn't filter by status
  const orders = allOrders.filter((order) => order.status === OrderStatus.Ready);

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
