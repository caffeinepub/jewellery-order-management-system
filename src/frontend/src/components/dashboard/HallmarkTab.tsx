import { useState } from 'react';
import { useGetHallmarkOrders, useBulkUpdateOrderStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import OrderTable from './OrderTable';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function HallmarkTab() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'hallmark' | 'return'>('all');
  const { data: orders = [], isLoading } = useGetHallmarkOrders();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bulkUpdate = useBulkUpdateOrderStatus();

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'hallmark') return order.status === OrderStatus.Hallmark;
    if (statusFilter === 'return') return order.status === OrderStatus.ReturnFromHallmark;
    return true;
  });

  const handleStatusChange = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select orders to update');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        orderIds: selectedIds,
        newStatus: OrderStatus.ReturnFromHallmark,
      });
      setSelectedIds([]);
      toast.success(`${selectedIds.length} order(s) marked as Return from Hallmark`);
    } catch (error) {
      toast.error('Failed to update orders');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="hallmark">Hallmark</SelectItem>
            <SelectItem value="return">Return from Hallmark</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border flex-1">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} order(s) selected
            </span>
            <Button onClick={handleStatusChange} disabled={bulkUpdate.isPending} size="sm">
              Return from Hallmark
            </Button>
          </div>
        )}
      </div>

      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
