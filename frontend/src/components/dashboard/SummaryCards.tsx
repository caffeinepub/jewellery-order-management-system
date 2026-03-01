import { Package, Weight, Hash, ShoppingBag, CheckCircle, Gem, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Order, OrderStatus, OrderType } from "@/backend";

interface SummaryCardsProps {
  orders: Order[];
  isLoading?: boolean;
  isError?: boolean;
  activeTab?: string;
}

/**
 * Returns a set of orderIds that have a Ready entry.
 * When the backend's Map.add appends (rather than overwrites), a partial supply
 * leaves both a Ready entry AND a Pending entry for the same orderId.
 * After a full supply, a new Ready entry is added but the old Pending entry may
 * persist as a ghost. We use this set to exclude ghost Pending rows from totals.
 */
function getReadyOrderIds(orders: Order[]): Set<string> {
  return new Set(
    orders
      .filter((o) => o.status === OrderStatus.Ready)
      .map((o) => o.orderId)
  );
}

function computeMetrics(orders: Order[], activeTab: string) {
  if (activeTab === "ready") {
    // Ready tab: each row is independent (no consolidation by orderNo)
    const readyOrders = orders.filter((o) => o.status === OrderStatus.Ready);
    const totalOrders = readyOrders.length;
    const totalWeight = readyOrders.reduce(
      (s, o) => s + o.weight * Number(o.quantity),
      0
    );
    const totalQuantity = readyOrders.reduce((s, o) => s + Number(o.quantity), 0);
    const coReadyOrders = readyOrders.filter((o) => o.orderType === OrderType.CO);
    const distinctCOOrderNos = new Set(coReadyOrders.map((o) => o.orderNo));
    return {
      totalOrders,
      totalWeight,
      totalQuantity,
      coOrders: distinctCOOrderNos.size,
      label: "Ready rows",
      weightLabel: "Ready weight",
      qtyLabel: "Ready items",
      coLabel: "CO ready",
    };
  }

  if (activeTab === "hallmark") {
    const hallmarkOrders = orders.filter((o) => o.status === OrderStatus.Hallmark);
    const distinctOrderNos = new Set(hallmarkOrders.map((o) => o.orderNo));
    const totalWeight = hallmarkOrders.reduce((s, o) => s + o.weight * Number(o.quantity), 0);
    const totalQuantity = hallmarkOrders.reduce((s, o) => s + Number(o.quantity), 0);
    const coHallmarkOrders = hallmarkOrders.filter((o) => o.orderType === OrderType.CO);
    const distinctCOOrderNos = new Set(coHallmarkOrders.map((o) => o.orderNo));
    return {
      totalOrders: distinctOrderNos.size,
      totalWeight,
      totalQuantity,
      coOrders: distinctCOOrderNos.size,
      label: "Hallmark orders",
      weightLabel: "Hallmark weight",
      qtyLabel: "Hallmark items",
      coLabel: "CO hallmark",
    };
  }

  if (activeTab === "customer") {
    const coPendingOrders = orders.filter(
      (o) =>
        o.orderType === OrderType.CO &&
        o.status === OrderStatus.Pending
    );
    const distinctOrderNos = new Set(coPendingOrders.map((o) => o.orderNo));
    const totalWeight = coPendingOrders.reduce((s, o) => s + o.weight * Number(o.quantity), 0);
    const totalQuantity = coPendingOrders.reduce((s, o) => s + Number(o.quantity), 0);
    return {
      totalOrders: distinctOrderNos.size,
      totalWeight,
      totalQuantity,
      coOrders: distinctOrderNos.size,
      label: "CO pending orders",
      weightLabel: "CO pending weight",
      qtyLabel: "CO pending items",
      coLabel: "CO orders",
    };
  }

  if (activeTab === "karigars") {
    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.Pending
    );
    const distinctOrderNos = new Set(pendingOrders.map((o) => o.orderNo));
    const totalWeight = pendingOrders.reduce((s, o) => s + o.weight * Number(o.quantity), 0);
    const totalQuantity = pendingOrders.reduce((s, o) => s + Number(o.quantity), 0);
    const distinctKarigars = new Set(
      pendingOrders.filter((o) => o.karigarName).map((o) => o.karigarName as string)
    );
    return {
      totalOrders: distinctOrderNos.size,
      totalWeight,
      totalQuantity,
      coOrders: distinctKarigars.size,
      label: "Pending orders",
      weightLabel: "Pending weight",
      qtyLabel: "Pending items",
      coLabel: "Active karigars",
    };
  }

  // Default: "total" tab — all pending orders, excluding ghost Pending entries.
  // A ghost Pending entry is one whose orderId also has a Ready entry, which happens
  // when the backend's Map.add appends rather than overwrites during supply operations.
  const readyOrderIds = getReadyOrderIds(orders);
  const pendingOrders = orders.filter(
    (o) => o.status === OrderStatus.Pending && !readyOrderIds.has(o.orderId)
  );
  const distinctPendingOrderNos = new Set(pendingOrders.map((o) => o.orderNo));
  const totalWeight = pendingOrders.reduce((s, o) => s + o.weight * Number(o.quantity), 0);
  const totalQuantity = pendingOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const pendingCOOrders = pendingOrders.filter((o) => o.orderType === OrderType.CO);
  const distinctCOOrderNos = new Set(pendingCOOrders.map((o) => o.orderNo));
  return {
    totalOrders: distinctPendingOrderNos.size,
    totalWeight,
    totalQuantity,
    coOrders: distinctCOOrderNos.size,
    label: "Pending orders",
    weightLabel: "Pending weight",
    qtyLabel: "Pending items",
    coLabel: "CO pending",
  };
}

function getTabIcon(activeTab: string) {
  switch (activeTab) {
    case "ready":
      return CheckCircle;
    case "hallmark":
      return Gem;
    case "karigars":
      return Users;
    default:
      return Package;
  }
}

export default function SummaryCards({ orders, isLoading, isError, activeTab = "total" }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-destructive/30">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">Error loading data</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = computeMetrics(orders, activeTab);
  const OrdersIcon = getTabIcon(activeTab);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <OrdersIcon className="h-4 w-4 text-gold" />
            Total Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metrics.totalOrders}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.label}</p>
        </CardContent>
      </Card>

      <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Weight className="h-4 w-4 text-gold" />
            Total Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metrics.totalWeight.toFixed(2)}g
          </div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.weightLabel}</p>
        </CardContent>
      </Card>

      <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Hash className="h-4 w-4 text-gold" />
            Total Quantity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{metrics.totalQuantity}</div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.qtyLabel}</p>
        </CardContent>
      </Card>

      <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gold" />
            {activeTab === "karigars" ? "Active Karigars" : "Customer Orders"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metrics.coOrders}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.coLabel}</p>
        </CardContent>
      </Card>
    </div>
  );
}
