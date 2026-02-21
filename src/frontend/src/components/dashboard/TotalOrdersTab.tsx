import { useState } from 'react';
import { useGetOrdersByStatus, useBulkUpdateOrderStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import OrderTable from './OrderTable';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TotalOrdersTab() {
  const { data: orders = [], isLoading } = useGetOrdersByStatus(OrderStatus.Pending);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bulkUpdate = useBulkUpdateOrderStatus();

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (selectedIds.length === 0) {
      toast.error('Please select orders to update');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        orderIds: selectedIds,
        newStatus,
      });
      setSelectedIds([]);
      toast.success(`${selectedIds.length} order(s) moved to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update orders');
    }
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} order(s) selected
          </span>
          <Button
            onClick={() => handleStatusChange(OrderStatus.Ready)}
            disabled={bulkUpdate.isPending}
            size="sm"
          >
            Change Status to Ready
          </Button>
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
