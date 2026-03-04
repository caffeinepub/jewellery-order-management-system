import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Package, RotateCcw, Stamp } from "lucide-react";
import { useMemo } from "react";
import { type Order, OrderStatus, OrderType } from "../../backend";
import { useGetAllOrders } from "../../hooks/useQueries";

interface SummaryCardsProps {
  activeTab?: string;
}

// Dynamic weight: always unit_weight × qty
function dynamicWeight(order: Order): number {
  return order.weight * Number(order.quantity);
}

// Count unique order numbers (not row count)
function uniqueOrderCount(orders: Order[]): number {
  return new Set(orders.map((o) => o.orderNo)).size;
}

export function SummaryCards({ activeTab = "total" }: SummaryCardsProps) {
  const { data: allOrders = [], isLoading } = useGetAllOrders();

  const stats = useMemo(() => {
    // Filter out zero-qty rows
    const validOrders = allOrders.filter((o) => Number(o.quantity) > 0);

    const pending = validOrders.filter((o) => o.status === OrderStatus.Pending);
    const ready = validOrders.filter((o) => o.status === OrderStatus.Ready);
    const hallmark = validOrders.filter(
      (o) => o.status === OrderStatus.Hallmark,
    );
    const returnFromHallmark = validOrders.filter(
      (o) => o.status === OrderStatus.ReturnFromHallmark,
    );

    const calcStats = (orders: Order[]) => ({
      // Unique order numbers only — splits do NOT increase count
      count: uniqueOrderCount(orders),
      qty: orders.reduce((s, o) => s + Number(o.quantity), 0),
      // Dynamic weight: unit_weight × qty at render time
      weight: orders.reduce((s, o) => s + dynamicWeight(o), 0),
    });

    return {
      pending: calcStats(pending),
      ready: calcStats(ready),
      hallmark: calcStats(hallmark),
      returnFromHallmark: calcStats(returnFromHallmark),
    };
  }, [allOrders]);

  const cards = [
    {
      key: "total",
      label: "Total Orders",
      icon: Package,
      stats: stats.pending,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      key: "ready",
      label: "Ready",
      icon: CheckCircle,
      stats: stats.ready,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      key: "hallmark",
      label: "Hallmark",
      icon: Stamp,
      stats: stats.hallmark,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      key: "return",
      label: "Return",
      icon: RotateCcw,
      stats: stats.returnFromHallmark,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="border-border">
            <CardContent className="px-3 pb-3 pt-3">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-10 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeTab === card.key;
        return (
          <Card
            key={card.key}
            className={`border-border transition-all ${
              isActive ? "ring-1 ring-primary" : ""
            }`}
          >
            <CardContent className="px-3 pb-3 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${card.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {card.label}
                </span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-foreground">
                {card.stats.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                <span>{card.stats.qty} qty</span>
                <span>·</span>
                <span>{card.stats.weight.toFixed(1)}g</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default SummaryCards;
