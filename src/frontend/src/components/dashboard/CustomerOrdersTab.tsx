import OrderTable from "./OrderTable";
import { useGetOrdersByType } from "@/hooks/useQueries";
import { OrderType } from "@/backend";

export default function CustomerOrdersTab() {
  const { data: orders = [], isLoading } = useGetOrdersByType(OrderType.CO);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return <OrderTable orders={orders} />;
}
