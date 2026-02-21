import OrderTable from "./OrderTable";
import { useGetOrders } from "@/hooks/useQueries";
import { OrderStatus } from "@/backend";

export default function TotalOrdersTab() {
  const { data: orders = [], isLoading } = useGetOrders();

  const filteredOrders = orders.filter(
    (order) =>
      order.status === OrderStatus.Pending ||
      order.status === OrderStatus.ReturnFromHallmark
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return <OrderTable orders={filteredOrders} enableBulkActions={true} />;
}
