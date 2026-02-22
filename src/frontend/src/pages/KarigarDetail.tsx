import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useGetOrdersByKarigar } from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import OrderTable from "@/components/dashboard/OrderTable";
import { exportKarigarToPDF, exportToJPEG } from "@/utils/exportUtils";
import { toast } from "sonner";
import { OrderStatus, OrderType, Order } from "@/backend";
import { useState } from "react";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useGetOrdersByKarigar(name);
  const { actor } = useActor();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrdersForSupply, setSelectedOrdersForSupply] = useState<Order[]>([]);

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.Pending);
  const totalWeight = pendingOrders.reduce((sum, o) => sum + o.weight, 0);
  const totalQuantity = pendingOrders.reduce(
    (sum, o) => sum + Number(o.quantity),
    0
  );

  const handleExport = async (format: "pdf" | "jpeg") => {
    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    setIsExporting(true);
    try {
      if (format === "pdf") {
        await exportKarigarToPDF(pendingOrders, name, actor);
        toast.success("PDF opened successfully");
      } else if (format === "jpeg") {
        await exportToJPEG(pendingOrders, actor);
        toast.success("JPEG opened successfully");
      }
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkAsReady = (selectedOrders: Order[]) => {
    // Check if any selected orders are RB type with Pending status
    const rbPendingOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.RB && order.status === OrderStatus.Pending
    );

    if (rbPendingOrders.length > 0) {
      // Show dialog for RB orders
      setSelectedOrdersForSupply(rbPendingOrders);
    }
  };

  const handleCloseDialog = () => {
    setSelectedOrdersForSupply([]);
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("jpeg")}>
              Export to JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <OrderTable 
          orders={pendingOrders} 
          enableBulkActions={true}
          onMarkAsReady={handleMarkAsReady}
        />
      </div>

      {selectedOrdersForSupply.length > 0 && (
        <SuppliedQtyDialog
          orders={selectedOrdersForSupply}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}
