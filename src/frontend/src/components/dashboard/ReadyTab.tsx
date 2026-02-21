import OrderTable from "./OrderTable";
import { useGetOrdersByStatus } from "@/hooks/useQueries";
import { OrderStatus } from "@/backend";

export default function ReadyTab() {
  const { data: orders = [], isLoading } = useGetOrdersByStatus(OrderStatus.Ready);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return <OrderTable orders={orders} showDateFilter={true} />;
}
