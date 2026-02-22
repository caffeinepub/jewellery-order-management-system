import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useGetOrdersByKarigar } from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import OrderTable from "@/components/dashboard/OrderTable";
import { exportKarigarToPDF } from "@/utils/exportUtils";
import { toast } from "sonner";
import { OrderStatus } from "@/backend";
import { useState, useMemo } from "react";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useGetOrdersByKarigar(name);
  const { actor } = useActor();
  const [isExporting, setIsExporting] = useState(false);

  // Filter to show only Pending status orders
  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === OrderStatus.Pending);
  }, [orders]);

  const totalWeight = pendingOrders.reduce((sum, o) => sum + o.weight, 0);
  const totalQuantity = pendingOrders.reduce(
    (sum, o) => sum + Number(o.quantity),
    0
  );

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportKarigarToPDF(pendingOrders, name, actor);
      toast.success("PDF opened successfully");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <p className="text-muted-foreground">Karigar Details</p>
          </div>
        </div>
        <Button onClick={handleExportPDF} variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Pending Orders
          </div>
          <div className="text-2xl font-bold">{pendingOrders.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Total Weight
          </div>
          <div className="text-2xl font-bold">{totalWeight.toFixed(3)} g</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Total Quantity
          </div>
          <div className="text-2xl font-bold">{totalQuantity}</div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Orders</h2>
        <OrderTable orders={pendingOrders} enableBulkActions={true} />
      </div>
    </div>
  );
}
