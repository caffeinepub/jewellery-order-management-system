import { Order, OrderStatus, OrderType } from "../../backend";
import { getQuantityAsNumber } from "../../utils/orderNormalizer";

interface SummaryCardsProps {
  orders: Order[];
  activeTab: string;
  isLoading?: boolean;
  isError?: boolean;
}

function StatCard({
  label,
  value,
  isLoading,
  isError,
}: {
  label: string;
  value: string | number;
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {label}
      </span>
      {isError ? (
        <span className="text-2xl font-bold text-muted-foreground">—</span>
      ) : isLoading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      ) : (
        <span className="text-2xl font-bold text-foreground">{value}</span>
      )}
    </div>
  );
}

export function SummaryCards({
  orders,
  activeTab,
  isLoading,
  isError,
}: SummaryCardsProps) {
  const getFilteredOrders = () => {
    if (isError) return [];
    switch (activeTab) {
      case "total":
        return orders.filter((o) => o.status === OrderStatus.Pending);
      case "ready":
        return orders.filter((o) => o.status === OrderStatus.Ready);
      case "hallmark":
        return orders.filter(
          (o) =>
            o.status === OrderStatus.Hallmark ||
            o.status === OrderStatus.ReturnFromHallmark
        );
      case "customer":
        return orders.filter(
          (o) =>
            o.orderType === OrderType.CO && o.status === OrderStatus.Pending
        );
      default:
        return orders.filter((o) => o.status === OrderStatus.Pending);
    }
  };

  const filtered = getFilteredOrders();

  const totalOrders = isError ? 0 : filtered.length;
  const totalQty = isError
    ? 0
    : filtered.reduce((sum, o) => sum + getQuantityAsNumber(o.quantity), 0);
  const uniqueDesigns = isError
    ? 0
    : new Set(filtered.map((o) => o.design)).size;
  const uniqueKarigars = isError
    ? 0
    : new Set(filtered.map((o) => o.karigarName).filter(Boolean)).size;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <StatCard
        label="Orders"
        value={totalOrders}
        isLoading={isLoading}
        isError={isError}
      />
      <StatCard
        label="Total Qty"
        value={totalQty}
        isLoading={isLoading}
        isError={isError}
      />
      <StatCard
        label="Designs"
        value={uniqueDesigns}
        isLoading={isLoading}
        isError={isError}
      />
      <StatCard
        label="Karigars"
        value={uniqueKarigars}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}
