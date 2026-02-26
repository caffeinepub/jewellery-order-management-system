import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useGetOrdersByKarigar, useMarkOrdersAsReady } from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import OrderTable from "@/components/dashboard/OrderTable";
import { exportKarigarToPDF, exportToJPEG, exportToExcel } from "@/utils/exportUtils";
import { toast } from "sonner";
import { OrderStatus, OrderType, Order } from "@/backend";
import { useState, useMemo } from "react";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useGetOrdersByKarigar(name);
  const { actor } = useActor();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRBOrdersForSupply, setSelectedRBOrdersForSupply] = useState<Order[]>([]);
  const markOrdersAsReadyMutation = useMarkOrdersAsReady();

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.Pending);

  const todayOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime() * 1_000_000;
    return pendingOrders.filter((order) => Number(order.createdAt) >= todayTimestamp);
  }, [pendingOrders]);

  // Use weightPerUnit × qty for correct total weight calculation
  const totalWeight = pendingOrders.reduce((sum, o) => sum + o.weightPerUnit * Number(o.quantity), 0);
  const totalQuantity = pendingOrders.reduce((sum, o) => sum + Number(o.quantity), 0);

  const handleExport = async (
    format: "pdf" | "jpeg" | "excel",
    type: "daily" | "total"
  ) => {
    if (!actor && (format === "pdf" || format === "jpeg")) {
      toast.error("Actor not initialized");
      return;
    }

    const ordersToExport = type === "daily" ? todayOrders : pendingOrders;

    if (ordersToExport.length === 0) {
      toast.error(`No ${type} orders to export`);
      return;
    }

    setIsExporting(true);
    try {
      if (format === "pdf") {
        await exportKarigarToPDF(ordersToExport, name, actor);
        toast.success("PDF downloaded successfully. Check your Downloads folder.");
      } else if (format === "jpeg") {
        await exportToJPEG(ordersToExport, actor);
        toast.success("JPEG opened in new tab. You can save it from there.");
      } else if (format === "excel") {
        exportToExcel(ordersToExport);
        toast.success("Excel file downloaded successfully");
      }
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkAsReady = async (selectedOrders: Order[]) => {
    const rbPendingOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.RB && order.status === OrderStatus.Pending
    );
    const nonRbOrders = selectedOrders.filter(
      (order) => order.orderType !== OrderType.RB
    );

    if (nonRbOrders.length > 0) {
      try {
        const nonRbOrderIds = nonRbOrders.map((o) => o.orderId);
        await markOrdersAsReadyMutation.mutateAsync(nonRbOrderIds);
        toast.success(`${nonRbOrders.length} order(s) marked as Ready`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update orders";
        toast.error(message);
      }
    }

    if (rbPendingOrders.length > 0) {
      setSelectedRBOrdersForSupply(rbPendingOrders);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{name}</h1>
            <p className="text-muted-foreground mt-1">
              {pendingOrders.length} pending orders • {totalQuantity} pieces •{" "}
              {totalWeight.toFixed(3)}g total weight
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting || todayOrders.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Daily Orders
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Daily Orders ({todayOrders.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("excel", "daily")}>
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf", "daily")}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("jpeg", "daily")}>
                Export to JPEG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting || pendingOrders.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Total Orders
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Total Orders ({pendingOrders.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("excel", "total")}>
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf", "total")}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("jpeg", "total")}>
                Export to JPEG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <OrderTable
        orders={pendingOrders}
        enableBulkActions={true}
        onMarkAsReady={handleMarkAsReady}
      />

      {selectedRBOrdersForSupply.length > 0 && (
        <SuppliedQtyDialog
          orders={selectedRBOrdersForSupply}
          onClose={() => setSelectedRBOrdersForSupply([])}
        />
      )}
    </div>
  );
}
