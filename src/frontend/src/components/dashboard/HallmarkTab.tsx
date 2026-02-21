import OrderTable from "./OrderTable";
import { useGetHallmarkOrders } from "@/hooks/useQueries";

export default function HallmarkTab() {
  const { data: orders = [], isLoading } = useGetHallmarkOrders();

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return <OrderTable orders={orders} showDateFilter={true} />;
}
