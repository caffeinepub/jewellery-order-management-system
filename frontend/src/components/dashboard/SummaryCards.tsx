import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGetTotalOrdersSummary,
  useGetReadyOrdersSummary,
  useGetHallmarkOrdersSummary,
  useGetAllOrders,
} from '@/hooks/useQueries';
import { Package, Weight, Hash, Users } from 'lucide-react';
import { OrderType, OrderStatus } from '@/backend';
import { useMemo } from 'react';

type ActiveTab = "total" | "ready" | "hallmark" | "customer" | "karigars";

interface SummaryCardsProps {
  activeTab?: ActiveTab;
}

export default function SummaryCards({ activeTab }: SummaryCardsProps) {
  // Fetch backend-derived summaries for the three main tabs
  const { data: totalSummary, isLoading: isLoadingTotal } = useGetTotalOrdersSummary();
  const { data: readySummary, isLoading: isLoadingReady } = useGetReadyOrdersSummary();
  const { data: hallmarkSummary, isLoading: isLoadingHallmark } = useGetHallmarkOrdersSummary();

  // For customer and karigars tabs we still need the raw orders list
  const { data: orders = [], isLoading: isLoadingOrders } = useGetAllOrders();

  // Compute customer/karigar tab metrics from live order data using weightPerUnit × qty
  const customerTabMetrics = useMemo(() => {
    const filtered = orders.filter(
      (order) =>
        order?.orderType === OrderType.CO &&
        order?.status === OrderStatus.Pending
    );
    return {
      totalOrders: filtered.length,
      totalWeight: filtered.reduce(
        (sum, o) => sum + (o?.weightPerUnit ?? 0) * Number(o?.quantity ?? 0),
        0
      ),
      totalQuantity: filtered.reduce((sum, o) => sum + Number(o?.quantity ?? 0), 0),
      totalCO: filtered.length,
    };
  }, [orders]);

  const karigarsTabMetrics = useMemo(() => {
    const filtered = orders.filter(
      (order) =>
        order?.status === OrderStatus.Pending ||
        order?.status === OrderStatus.ReturnFromHallmark
    );
    return {
      totalOrders: filtered.length,
      totalWeight: filtered.reduce(
        (sum, o) => sum + (o?.weightPerUnit ?? 0) * Number(o?.quantity ?? 0),
        0
      ),
      totalQuantity: filtered.reduce((sum, o) => sum + Number(o?.quantity ?? 0), 0),
      totalCO: filtered.filter((o) => o?.orderType === OrderType.CO).length,
    };
  }, [orders]);

  // Select the correct summary based on active tab
  const summary = useMemo(() => {
    switch (activeTab) {
      case "total":
        return totalSummary ?? { totalOrders: 0, totalWeight: 0, totalQuantity: 0, totalCO: 0 };
      case "ready":
        return readySummary ?? { totalOrders: 0, totalWeight: 0, totalQuantity: 0, totalCO: 0 };
      case "hallmark":
        return hallmarkSummary ?? { totalOrders: 0, totalWeight: 0, totalQuantity: 0, totalCO: 0 };
      case "customer":
        return customerTabMetrics;
      case "karigars":
        return karigarsTabMetrics;
      default:
        return totalSummary ?? { totalOrders: 0, totalWeight: 0, totalQuantity: 0, totalCO: 0 };
    }
  }, [activeTab, totalSummary, readySummary, hallmarkSummary, customerTabMetrics, karigarsTabMetrics]);

  const isLoading =
    isLoadingTotal ||
    isLoadingReady ||
    isLoadingHallmark ||
    (activeTab === "customer" || activeTab === "karigars" ? isLoadingOrders : false);

  const cards = [
    {
      title: 'Total Orders',
      value: summary.totalOrders,
      icon: Package,
    },
    {
      title: 'Total Weight',
      value: `${summary.totalWeight.toFixed(2)}g`,
      icon: Weight,
    },
    {
      title: 'Total Quantity',
      value: summary.totalQuantity,
      icon: Hash,
    },
    {
      title: 'Customer Orders',
      value: summary.totalCO,
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
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
