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
    // Return empty array if orders is undefined or null
    if (!orders || !Array.isArray(orders)) {
      return [];
    }

    // Filter based on active tab
    let result = orders;
    
    switch (activeTab) {
      case "total":
        // Total orders tab: Pending and ReturnFromHallmark orders
        result = orders.filter(
          (order) =>
            order?.status === OrderStatus.Pending ||
            order?.status === OrderStatus.ReturnFromHallmark
        );
        break;

      case "ready":
        // Ready tab: orders with Ready status
        result = orders.filter((order) => order?.status === OrderStatus.Ready);
        
        // Deduplicate orders by orderId - keep only the first occurrence
        // This matches the deduplication logic in ReadyTab.tsx
        const seenOrderIds = new Set<string>();
        result = result.filter((order) => {
          if (seenOrderIds.has(order.orderId)) {
            return false;
          }
          seenOrderIds.add(order.orderId);
          return true;
        });
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
  // Total weight = sum of (weight × quantity) for all rows
  const totalOrders = filteredOrders?.length ?? 0;
  const totalWeight = filteredOrders?.reduce((sum, order) => sum + ((order?.weight ?? 0) * Number(order?.quantity ?? 0)), 0) ?? 0;
  const totalQuantity = filteredOrders?.reduce((sum, order) => sum + Number(order?.quantity ?? 0), 0) ?? 0;
  const customerOrders = filteredOrders?.filter((order) => order?.orderType === OrderType.CO)?.length ?? 0;

  const cards = [
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: Package,
    },
    {
      title: 'Total Weight',
      value: `${totalWeight.toFixed(2)}g`,
      icon: Weight,
    },
    {
      title: 'Total Quantity',
      value: totalQuantity,
      icon: Hash,
    },
    {
      title: 'Customer Orders',
      value: customerOrders,
      icon: Users,
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
              <div className="text-2xl font-semibold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
