import { useState, useMemo } from "react";
import { useGetAllOrders, useGetMasterDesigns, useBatchUpdateOrderStatus } from "@/hooks/useQueries";
import { OrderType, OrderStatus } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToExcel } from "@/utils/exportUtils";

export default function HallmarkTab() {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | "ALL">("ALL");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: masterDesigns } = useGetMasterDesigns();
  const batchUpdateOrderStatusMutation = useBatchUpdateOrderStatus();

  const enrichedOrders = useMemo(() => {
    if (!masterDesigns) return orders;
    
    return orders.map((order) => {
      const normalizedDesign = order.design.toUpperCase().trim();
      const mapping = masterDesigns.get(normalizedDesign);
      
      return {
        ...order,
        genericName: mapping?.genericName || order.genericName,
        karigarName: mapping?.karigarName || order.karigarName,
      };
    });
  }, [orders, masterDesigns]);

  const filteredOrders = useMemo(() => {
    // Filter for Hallmark status orders only
    let result = enrichedOrders.filter((order) => order.status === OrderStatus.Hallmark);

    // Filter by order type
    if (selectedOrderType !== "ALL") {
      result = result.filter((order) => order.orderType === selectedOrderType);
    }

    // Filter by karigar
    if (selectedKarigar !== "ALL") {
      result = result.filter((order) => order.karigarName === selectedKarigar);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((order) => Number(order.createdAt) / 1000000 >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // Add 1 day to include end date
      result = result.filter((order) => Number(order.createdAt) / 1000000 < end);
    }

    // Filter by search text (order number, design code, or generic name)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(search) ||
          order.design.toLowerCase().includes(search) ||
          (order.genericName && order.genericName.toLowerCase().includes(search))
      );
    }

    return result;
  }, [enrichedOrders, searchText, selectedOrderType, selectedKarigar, startDate, endDate]);

  // Get unique karigars for filter dropdown
  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    enrichedOrders
      .filter((order) => order.status === OrderStatus.Hallmark)
      .forEach((order) => {
        if (order.karigarName) {
          karigars.add(order.karigarName);
        }
      });
    return Array.from(karigars).sort();
  }, [enrichedOrders]);

  const handleRowClick = (orderId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredOrders.map((o) => o.orderId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleMarkAsReturned = () => {
    if (selectedRows.size === 0) {
      toast.error("Please select at least one order");
      return;
    }
    setShowReturnDialog(true);
  };

  const confirmMarkAsReturned = async () => {
    try {
      const orderIds = Array.from(selectedRows);
      await batchUpdateOrderStatusMutation.mutateAsync({
        orderIds,
        newStatus: OrderStatus.ReturnFromHallmark,
      });
      toast.success(`${orderIds.length} order(s) marked as Returned`);
      setSelectedRows(new Set());
      setShowReturnDialog(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update orders";
      toast.error(errorMessage);
      console.error("Error updating orders:", error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportToExcel(filteredOrders);
      toast.success("Exported to Excel successfully");
    } catch (error) {
      toast.error("Failed to export to Excel");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const allSelected = filteredOrders.length > 0 && selectedRows.size === filteredOrders.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < filteredOrders.length;

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order Number, Design Code, or Generic Name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedOrderType === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType("ALL")}
          >
            All
          </Button>
          <Button
            variant={selectedOrderType === OrderType.CO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.CO)}
          >
            CO
          </Button>
          <Button
            variant={selectedOrderType === OrderType.RB ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.RB)}
          >
            RB
          </Button>
          <Button
            variant={selectedOrderType === OrderType.SO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.SO)}
          >
            SO
          </Button>
        </div>
        <select
          value={selectedKarigar}
          onChange={(e) => setSelectedKarigar(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="ALL">All Karigars</option>
          {uniqueKarigars.map((karigar) => (
            <option key={karigar} value={karigar}>
              {karigar}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Bulk selection controls and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
            className={someSelected ? "data-[state=checked]:bg-gold" : ""}
          />
          <span className="text-sm text-muted-foreground">
            {selectedRows.size > 0 ? `${selectedRows.size} order(s) selected` : "Select orders"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            size="sm"
            variant="outline"
            disabled={isExporting || filteredOrders.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
          {selectedRows.size > 0 && (
            <Button
              onClick={handleMarkAsReturned}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={batchUpdateOrderStatusMutation.isPending}
            >
              {batchUpdateOrderStatusMutation.isPending ? "Updating..." : "Mark as Returned"}
            </Button>
          )}
        </div>
      </div>

      {/* Custom table with row selection */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium">Order No</th>
                <th className="p-3 text-left text-sm font-medium">Generic Name</th>
                <th className="p-3 text-left text-sm font-medium">Karigar</th>
                <th className="p-3 text-left text-sm font-medium">Design</th>
                <th className="p-3 text-left text-sm font-medium">Wt/Unit (g)</th>
                <th className="p-3 text-left text-sm font-medium">Total Wt (g)</th>
                <th className="p-3 text-left text-sm font-medium">Size</th>
                <th className="p-3 text-left text-sm font-medium">Qty</th>
                <th className="p-3 text-left text-sm font-medium">Type</th>
                <th className="p-3 text-left text-sm font-medium">Remarks</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedRows.has(order.orderId) ? "bg-muted" : ""
                    }`}
                    onClick={() => handleRowClick(order.orderId)}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedRows.has(order.orderId)}
                        onCheckedChange={() => handleRowClick(order.orderId)}
                        aria-label={`Select order ${order.orderNo}`}
                      />
                    </td>
                    <td className="p-3 text-sm">{order.orderNo}</td>
                    <td className="p-3 text-sm">{order.genericName || "-"}</td>
                    <td className="p-3 text-sm">{order.karigarName || "-"}</td>
                    <td className="p-3 text-sm">{order.design}</td>
                    <td className="p-3 text-sm">{order.weightPerUnit.toFixed(3)}</td>
                    <td className="p-3 text-sm font-medium">
                      {(order.weightPerUnit * Number(order.quantity)).toFixed(3)}
                    </td>
                    <td className="p-3 text-sm">{order.size}</td>
                    <td className="p-3 text-sm">{order.quantity.toString()}</td>
                    <td className="p-3 text-sm">{order.orderType}</td>
                    <td className="p-3 text-sm">{order.remarks || "-"}</td>
                    <td className="p-3 text-sm">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Orders as Returned?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedRows.size} order(s) from Hallmark back to Total Orders tab with "Returned" status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchUpdateOrderStatusMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsReturned}
              disabled={batchUpdateOrderStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {batchUpdateOrderStatusMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
