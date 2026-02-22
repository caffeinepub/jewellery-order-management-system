import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import { Order, OrderType, OrderStatus } from "@/backend";
import DesignImageModal from "./DesignImageModal";
import { exportToExcel, exportToPDF, exportToJPEG } from "@/utils/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useUpdateOrdersStatusToReady } from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import { toast } from "sonner";

interface OrderTableProps {
  orders: Order[];
  showDateFilter?: boolean;
  enableBulkActions?: boolean;
  onMarkAsReady?: (selectedOrders: Order[]) => void;
}

export default function OrderTable({ 
  orders, 
  showDateFilter = false, 
  enableBulkActions = false,
  onMarkAsReady 
}: OrderTableProps) {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const updateStatusMutation = useUpdateOrdersStatusToReady();
  const { actor } = useActor();

  const handleDesignClick = (design: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDesign(design);
  };

  const handleRowClick = (orderId: string) => {
    if (!enableBulkActions) return;
    
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
      setSelectedRows(new Set(orders.map((o) => o.orderId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleMarkAsReady = () => {
    const selectedOrders = orders.filter((o) => selectedRows.has(o.orderId));
    
    // Check if any selected orders are RB type with Pending status
    const rbPendingOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.RB && order.status === OrderStatus.Pending
    );

    if (rbPendingOrders.length > 0 && onMarkAsReady) {
      // Pass RB orders to parent for supply dialog
      onMarkAsReady(rbPendingOrders);
      // Clear selection after handling
      setSelectedRows(new Set());
    } else {
      // For non-RB orders, show confirmation dialog
      setShowConfirmDialog(true);
    }
  };

  const confirmMarkAsReady = async () => {
    try {
      await updateStatusMutation.mutateAsync(Array.from(selectedRows));
      toast.success(`${selectedRows.size} order(s) marked as Ready`);
      setSelectedRows(new Set());
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error("Failed to update orders");
      console.error(error);
    }
  };

  const handleExport = async (format: "excel" | "pdf" | "jpeg") => {
    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    setIsExporting(true);
    try {
      if (format === "excel") {
        exportToExcel(orders);
        toast.success(`Exported to ${format.toUpperCase()}`);
      } else if (format === "pdf") {
        await exportToPDF(orders, actor);
        toast.success(`Exported to ${format.toUpperCase()}`);
      } else if (format === "jpeg") {
        await exportToJPEG(orders, actor);
        toast.success(`Exported to ${format.toUpperCase()}`);
      }
    } catch (error) {
      toast.error(`Failed to export to ${format.toUpperCase()}`);
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // Group orders by design code
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = [];
    }
    acc[order.design].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const allSelected = orders.length > 0 && selectedRows.size === orders.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < orders.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enableBulkActions && selectedRows.size > 0 && (
            <Button onClick={handleMarkAsReady} disabled={updateStatusMutation.isPending}>
              Mark {selectedRows.size} as Ready
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport("excel")}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("jpeg")}>
              Export to JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar Name</TableHead>
              <TableHead>Design Code</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead>Product</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={enableBulkActions ? 12 : 11}
                  className="text-center py-8 text-muted-foreground"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedOrders).map(([designCode, designOrders], groupIndex) => (
                <>
                  {groupIndex > 0 && (
                    <TableRow key={`separator-${designCode}`} className="bg-muted/30">
                      <TableCell colSpan={enableBulkActions ? 12 : 11} className="h-2 p-0" />
                    </TableRow>
                  )}
                  {designOrders.map((order) => {
                    const isSelected = selectedRows.has(order.orderId);
                    return (
                      <TableRow
                        key={order.orderId}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isSelected ? "bg-muted" : ""
                        }`}
                        onClick={() => handleRowClick(order.orderId)}
                      >
                        {enableBulkActions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleRowClick(order.orderId)}
                              aria-label={`Select order ${order.orderId}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>{order.genericName || "-"}</TableCell>
                        <TableCell>{order.karigarName || "-"}</TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => handleDesignClick(order.design, e)}
                            className="text-primary hover:underline"
                          >
                            {order.design}
                          </button>
                        </TableCell>
                        <TableCell>{order.weight.toFixed(3)}</TableCell>
                        <TableCell>{order.size.toFixed(2)}</TableCell>
                        <TableCell>{Number(order.quantity)}</TableCell>
                        <TableCell>{order.remarks || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              order.status === OrderStatus.Ready
                                ? "bg-green-100 text-green-700"
                                : order.status === OrderStatus.Pending
                                ? "bg-yellow-100 text-yellow-700"
                                : order.status === OrderStatus.Hallmark
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              order.orderType === OrderType.CO
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {order.orderType}
                          </span>
                        </TableCell>
                        <TableCell>{order.orderNo}</TableCell>
                        <TableCell>{order.product}</TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDesign && (
        <DesignImageModal
          designCode={selectedDesign}
          open={!!selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedRows.size} order(s) as Ready?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsReady}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
