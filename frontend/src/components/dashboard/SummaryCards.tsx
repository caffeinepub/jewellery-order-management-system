import { useGetAllOrders } from "@/hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Weight, Hash, ShoppingBag } from "lucide-react";
import { OrderStatus, OrderType } from "@/backend";

type TabKey = "total" | "ready" | "hallmark" | "customer" | "karigars";

interface SummaryCardsProps {
  activeTab: TabKey;
}

export default function SummaryCards({ activeTab }: SummaryCardsProps) {
  const { data: orders = [], isLoading } = useGetAllOrders();

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.Pending);
  const readyOrders = orders.filter((o) => o.status === OrderStatus.Ready);
  const hallmarkOrders = orders.filter((o) => o.status === OrderStatus.Hallmark);
  const coOrders = orders.filter(
    (o) => o.orderType === OrderType.CO && o.status === OrderStatus.Pending
  );

  // Exclude ghost pending entries (Pending rows whose orderId also has a Ready entry)
  const readyOrderIds = new Set(readyOrders.map((o) => o.orderId));
  const truePendingOrders = pendingOrders.filter((o) => !readyOrderIds.has(o.orderId));

  const getMetrics = () => {
    switch (activeTab) {
      case "total":
        return {
          orderCount: truePendingOrders.length,
          totalWeight: truePendingOrders.reduce((sum, o) => sum + o.weight, 0),
          totalQty: truePendingOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
          coCount: coOrders.length,
          orderLabel: "Pending orders",
          weightLabel: "Pending weight",
          qtyLabel: "Pending items",
          coLabel: "CO pending",
        };
      case "ready":
        return {
          orderCount: readyOrders.length,
          totalWeight: readyOrders.reduce((sum, o) => sum + o.weight, 0),
          totalQty: readyOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
          coCount: readyOrders.filter((o) => o.orderType === OrderType.CO).length,
          orderLabel: "Ready orders",
          weightLabel: "Ready weight",
          qtyLabel: "Ready items",
          coLabel: "CO ready",
        };
      case "hallmark":
        return {
          orderCount: hallmarkOrders.length,
          totalWeight: hallmarkOrders.reduce((sum, o) => sum + o.weight, 0),
          totalQty: hallmarkOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
          coCount: hallmarkOrders.filter((o) => o.orderType === OrderType.CO).length,
          orderLabel: "At hallmark",
          weightLabel: "Hallmark weight",
          qtyLabel: "Hallmark items",
          coLabel: "CO at hallmark",
        };
      case "customer":
        return {
          orderCount: coOrders.length,
          totalWeight: coOrders.reduce((sum, o) => sum + o.weight, 0),
          totalQty: coOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
          coCount: coOrders.length,
          orderLabel: "CO pending",
          weightLabel: "CO weight",
          qtyLabel: "CO items",
          coLabel: "CO pending",
        };
      case "karigars":
        return {
          orderCount: truePendingOrders.length,
          totalWeight: truePendingOrders.reduce((sum, o) => sum + o.weight, 0),
          totalQty: truePendingOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
          coCount: coOrders.length,
          orderLabel: "Pending orders",
          weightLabel: "Pending weight",
          qtyLabel: "Pending items",
          coLabel: "CO pending",
        };
      default:
        return {
          orderCount: 0,
          totalWeight: 0,
          totalQty: 0,
          coCount: 0,
          orderLabel: "Orders",
          weightLabel: "Weight",
          qtyLabel: "Items",
          coLabel: "CO",
        };
    }
  };

  const metrics = getMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 md:p-5">
              <div className="h-3 bg-muted rounded w-2/3 mb-2" />
              <div className="h-6 bg-muted rounded w-1/3 mb-1" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-5">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 md:h-4 md:w-4 text-gold" />
            Total Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-5 md:pb-4">
          <div className="text-xl md:text-3xl font-bold text-foreground">
            {metrics.orderCount}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{metrics.orderLabel}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-5">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Weight className="h-3.5 w-3.5 md:h-4 md:w-4 text-gold" />
            Total Weight
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-5 md:pb-4">
          <div className="text-xl md:text-3xl font-bold text-foreground">
            {metrics.totalWeight.toFixed(2)}g
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{metrics.weightLabel}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-5">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 md:h-4 md:w-4 text-gold" />
            Total Quantity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-5 md:pb-4">
          <div className="text-xl md:text-3xl font-bold text-foreground">
            {metrics.totalQty}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{metrics.qtyLabel}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-5">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 md:h-4 md:w-4 text-gold" />
            Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-5 md:pb-4">
          <div className="text-xl md:text-3xl font-bold text-foreground">
            {metrics.coCount}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{metrics.coLabel}</p>
        </CardContent>
      </Card>
    </div>
  );
}
