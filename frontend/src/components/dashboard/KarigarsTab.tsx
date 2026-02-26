import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Order, OrderStatus } from "../../backend";
import { useGetMasterDesigns } from "@/hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuantityAsNumber } from "@/utils/orderNormalizer";

interface KarigarsTabProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function KarigarsTab({ orders, isLoading }: KarigarsTabProps) {
  const navigate = useNavigate();
  const { data: masterDesignsRaw } = useGetMasterDesigns();

  // Build a Map from the array of [designCode, genericName, karigarName] tuples
  const masterDesigns = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    if (masterDesignsRaw) {
      for (const [designCode, genericName, karigarName] of masterDesignsRaw) {
        map.set(designCode.trim().toUpperCase(), { genericName, karigarName });
      }
    }
    return map;
  }, [masterDesignsRaw]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === OrderStatus.Pending);
  }, [orders]);

  const enrichedOrders = useMemo(() => {
    return pendingOrders.map((order) => {
      const normalizedDesign = order.design?.trim().toUpperCase();
      const mapping = masterDesigns.get(normalizedDesign);
      return {
        ...order,
        genericName: order.genericName ?? mapping?.genericName,
        karigarName: order.karigarName ?? mapping?.karigarName,
      };
    });
  }, [pendingOrders, masterDesigns]);

  // Group by karigar
  const karigarGroups = useMemo(() => {
    const groups = new Map<string, typeof enrichedOrders>();
    for (const order of enrichedOrders) {
      const key = order.karigarName ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(order);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [enrichedOrders]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (karigarGroups.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg font-medium">No pending orders</p>
        <p className="text-sm">All orders have been processed</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {karigarGroups.map(([karigarName, karigarOrders]) => {
        const totalQty = karigarOrders.reduce(
          (sum, o) => sum + getQuantityAsNumber(o.quantity),
          0
        );
        const uniqueDesigns = new Set(karigarOrders.map((o) => o.design)).size;

        return (
          <Card
            key={karigarName}
            className="cursor-pointer hover:border-gold transition-colors"
            onClick={() => navigate({ to: "/karigar/$name", params: { name: karigarName } })}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="truncate">{karigarName}</span>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {karigarOrders.length} orders
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Qty:</span>{" "}
                  <span className="font-medium text-gold">{totalQty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Designs:</span>{" "}
                  <span className="font-medium">{uniqueDesigns}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { KarigarsTab };
