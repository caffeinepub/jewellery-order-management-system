import { Order, OrderStatus, OrderType } from "@/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Scale, Hash, Users } from "lucide-react";

interface SummaryCardsProps {
  orders: Order[];
  isLoading: boolean;
  isError: boolean;
  activeTab: string;
}

/**
 * Determines if an RB pending order is "partially supplied" —
 * i.e. a Ready fragment exists whose originalOrderId points to this order.
 * Such orders should NOT be counted in Total Orders (they are in-flight).
 */
function getPartiallySuppliedRBOrderIds(orders: Order[]): Set<string> {
  const partialIds = new Set<string>();
  for (const o of orders) {
    if (
      o.status === OrderStatus.Ready &&
      o.orderType === OrderType.RB &&
      o.originalOrderId
    ) {
      partialIds.add(o.originalOrderId);
    }
  }
  return partialIds;
}

export default function SummaryCards({
  orders,
  isLoading,
  isError,
  activeTab,
}: SummaryCardsProps) {
  // Compute the set of RB pending order IDs that have a Ready fragment
  const partiallySuppliedRBIds = getPartiallySuppliedRBOrderIds(orders);

  // For "total" tab: pending orders, excluding RB remainders that are partially supplied
  // For "ready" tab: ready orders
  const filteredOrders = orders.filter((o) => {
    if (activeTab === "total") {
      if (o.status !== OrderStatus.Pending) return false;
      // Exclude RB pending rows that are "in-flight" (have a Ready fragment)
      if (
        o.orderType === OrderType.RB &&
        partiallySuppliedRBIds.has(o.orderId)
      ) {
        return false;
      }
      return true;
    } else if (activeTab === "ready") {
      return o.status === OrderStatus.Ready;
    } else if (activeTab === "hallmark") {
      return o.status === OrderStatus.Hallmark;
    } else if (activeTab === "returnFromHallmark") {
      return o.status === OrderStatus.ReturnFromHallmark;
    }
    return o.status === OrderStatus.Pending;
  });

  // For "total" tab: consolidate RB pending rows by orderNo so each logical RB
  // order is counted once (handles the case where multiple pending fragments exist
  // for the same orderNo after a return-to-pending).
  const dedupedOrders = (() => {
    if (activeTab !== "total") return filteredOrders;

    const seen = new Map<string, Order>();
    const result: Order[] = [];

    for (const o of filteredOrders) {
      if (o.orderType === OrderType.RB) {
        const key = o.orderNo;
        if (!seen.has(key)) {
          seen.set(key, o);
          result.push(o);
        } else {
          // Accumulate qty/weight into the representative row (for metric totals)
          const rep = seen.get(key)!;
          // We mutate a copy stored in seen for metric accumulation
          seen.set(key, {
            ...rep,
            quantity: rep.quantity + o.quantity,
            weight: rep.weight + o.weight,
          });
          // Replace the last pushed entry
          const idx = result.findIndex(
            (r) => r.orderType === OrderType.RB && r.orderNo === key
          );
          if (idx !== -1) {
            result[idx] = seen.get(key)!;
          }
        }
      } else {
        result.push(o);
      }
    }

    return result;
  })();

  const totalOrders = dedupedOrders.length;
  const totalWeight = dedupedOrders.reduce((sum, o) => sum + o.weight, 0);
  const totalQty = dedupedOrders.reduce(
    (sum, o) => sum + Number(o.quantity),
    0
  );
  const customerOrders = dedupedOrders.filter(
    (o) => o.orderType === OrderType.CO
  ).length;

  // Count how many logical RB orders are "partially supplied" (pending remainder exists)
  // to show the "N RB Pending" indicator on the Total Orders card
  const rbPendingCount = (() => {
    if (activeTab !== "total") return 0;
    return partiallySuppliedRBIds.size;
  })();

  const cards = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: Package,
      suffix: rbPendingCount > 0 ? `${rbPendingCount} RB Pending` : undefined,
    },
    {
      title: "Total Weight",
      value: `${totalWeight.toFixed(2)} gm`,
      icon: Scale,
    },
    {
      title: "Total Qty",
      value: totalQty,
      icon: Hash,
    },
    {
      title: "Customer Orders",
      value: customerOrders,
      icon: Users,
    },
  ];

  if (isError) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">Failed to load</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {card.value}
                  </p>
                  {card.suffix && (
                    <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {card.suffix}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
