import { useMemo } from 'react';
import { useGetAllOrders } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export default function KarigarsTab() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  const navigate = useNavigate();

  const karigarGroups = useMemo(() => {
    const pendingOrders = orders.filter((order) => order.status === OrderStatus.Pending);
    
    const groups: Record<string, any[]> = {};
    
    pendingOrders.forEach((order) => {
      const karigar = order.karigarName || 'Unmapped';
      if (!groups[karigar]) {
        groups[karigar] = [];
      }
      groups[karigar].push(order);
    });

    return Object.entries(groups)
      .map(([name, orders]) => ({
        name,
        orders,
        totalOrders: orders.length,
        totalWeight: orders.reduce((sum, o) => sum + o.weight, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const handleKarigarClick = (karigarName: string) => {
    navigate({ to: `/karigar/${encodeURIComponent(karigarName)}` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading karigars...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {karigarGroups.map((karigar) => (
          <Card
            key={karigar.name}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => handleKarigarClick(karigar.name)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">{karigar.name}</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Orders:</span>
                  <span className="font-medium">{karigar.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Weight:</span>
                  <span className="font-medium">{karigar.totalWeight.toFixed(2)}g</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Package className="mr-2 h-4 w-4" />
                View Orders
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {karigarGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No pending orders assigned to karigars
        </div>
      )}
    </div>
  );
}
