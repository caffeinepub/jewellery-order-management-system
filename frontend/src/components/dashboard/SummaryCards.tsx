import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllOrders } from '@/hooks/useQueries';
import { Package, Weight, Hash, Users } from 'lucide-react';
import { OrderType, OrderStatus } from '@/backend';

type ActiveTab = "total" | "ready" | "hallmark" | "customer" | "karigars";

interface SummaryCardsProps {
  activeTab?: ActiveTab;
}

export default function SummaryCards({ activeTab }: SummaryCardsProps) {
  const { data: orders = [], isLoading } = useGetAllOrders();

  // Safely filter orders based on active tab using useMemo
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      return [];
    }

    let result = orders;
    
    switch (activeTab) {
      case "total":
        // Total orders tab: Pending and ReturnFromHallmark orders
        // For split RB orders, the pending remainder row is already included here
        result = orders.filter(
          (order) =>
            order?.status === OrderStatus.Pending ||
            order?.status === OrderStatus.ReturnFromHallmark
        );
        break;

      case "ready":
        // Ready tab: orders with Ready status
        result = orders.filter((order) => order?.status === OrderStatus.Ready);
        break;

      case "hallmark":
        // Hallmark tab: Hallmark orders only
        result = orders.filter(
          (order) => order?.status === OrderStatus.Hallmark
        );
        break;

      case "customer":
        // Customer orders tab: CO type orders with Pending status
        result = orders.filter(
          (order) =>
            order?.orderType === OrderType.CO &&
            order?.status === OrderStatus.Pending
        );
        break;

      case "karigars":
        // Karigars tab: show same as total orders (Pending and ReturnFromHallmark)
        result = orders.filter(
          (order) =>
            order?.status === OrderStatus.Pending ||
            order?.status === OrderStatus.ReturnFromHallmark
        );
        break;

      default:
        result = orders;
    }
    
    return result;
  }, [orders, activeTab]);

  // Calculate metrics with safe fallbacks using optional chaining
  // Total weight = sum of (weight × quantity) for all rows in the current tab
  const totalOrders = filteredOrders?.length ?? 0;
  const totalWeight = filteredOrders?.reduce(
    (sum, order) => sum + ((order?.weight ?? 0) * Number(order?.quantity ?? 0)),
    0
  ) ?? 0;
  const totalQuantity = filteredOrders?.reduce(
    (sum, order) => sum + Number(order?.quantity ?? 0),
    0
  ) ?? 0;
  const customerOrders = filteredOrders?.filter(
    (order) => order?.orderType === OrderType.CO
  )?.length ?? 0;

  // For Total Orders tab: compute pending qty for partial RB orders (those with originalOrderId)
  // These are the remaining-pending rows after a split; show their qty in brackets
  const partialRBPendingQty = useMemo(() => {
    if (activeTab !== "total" && activeTab !== "karigars") return 0;
    // A partial RB pending row is one that has originalOrderId set and is Pending
    // (originalOrderId is set on the ready split row, NOT on the pending remainder)
    // The pending remainder keeps the original orderId, so we detect it differently:
    // We look for RB Pending orders whose orderId appears as originalOrderId in any Ready order
    const readyOriginalIds = new Set(
      orders
        .filter((o) => o?.status === OrderStatus.Ready && o?.originalOrderId)
        .map((o) => o.originalOrderId!)
    );
    return filteredOrders
      .filter(
        (o) =>
          o?.orderType === OrderType.RB &&
          o?.status === OrderStatus.Pending &&
          readyOriginalIds.has(o.orderId)
      )
      .reduce((sum, o) => sum + Number(o?.quantity ?? 0), 0);
  }, [orders, filteredOrders, activeTab]);

  const cards = [
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: Package,
      // Show partial RB pending qty in brackets if any
      subtitle:
        partialRBPendingQty > 0
          ? `(${partialRBPendingQty} RB pending qty)`
          : undefined,
    },
    {
      title: 'Total Weight',
      value: `${totalWeight.toFixed(2)}g`,
      icon: Weight,
      subtitle: undefined,
    },
    {
      title: 'Total Quantity',
      value: totalQuantity,
      icon: Hash,
      subtitle: undefined,
    },
    {
      title: 'Customer Orders',
      value: customerOrders,
      icon: Users,
      subtitle: undefined,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-semibold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
