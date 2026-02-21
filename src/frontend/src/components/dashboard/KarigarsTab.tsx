import { useState } from 'react';
import { useGetOrdersByStatus, useBulkUpdateOrderStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OrderTable from './OrderTable';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

export default function KarigarsTab() {
  const { data: orders = [], isLoading } = useGetOrdersByStatus(OrderStatus.Pending);
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bulkUpdate = useBulkUpdateOrderStatus();

  const karigarGroups = orders.reduce((acc, order) => {
    const karigar = order.karigarName || 'Unassigned';
    if (!acc[karigar]) {
      acc[karigar] = [];
    }
    acc[karigar].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  const handleStatusChange = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select orders to update');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        orderIds: selectedIds,
        newStatus: OrderStatus.Ready,
      });
      setSelectedIds([]);
      setSelectedKarigar(null);
      toast.success(`${selectedIds.length} order(s) moved to Ready`);
    } catch (error) {
      toast.error('Failed to update orders');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.entries(karigarGroups).map(([karigar, karigarOrders]) => (
          <Card
            key={karigar}
            className="cursor-pointer transition-all hover:shadow-md hover:border-gold/50 hover:scale-[1.02] border shadow-sm"
            onClick={() => setSelectedKarigar(karigar)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{karigar}</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gold">{karigarOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending orders</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedKarigar} onOpenChange={() => setSelectedKarigar(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Orders for {selectedKarigar}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gold/10 rounded-md border border-gold/30">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} order(s) selected
                </span>
                <Button onClick={handleStatusChange} disabled={bulkUpdate.isPending} size="sm">
                  Change Status to Ready
                </Button>
              </div>
            )}
            <OrderTable
              orders={selectedKarigar ? karigarGroups[selectedKarigar] || [] : []}
              isLoading={isLoading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
