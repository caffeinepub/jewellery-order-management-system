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
import { Download, Loader2, Trash2 } from "lucide-react";
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
import { useActor } from "@/hooks/useActor";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// All query keys that must be refreshed after a status-change operation
const INVALIDATE_KEYS = [
  ["orders"],
  ["readyOrders"],
  ["ordersWithMappings"],
  ["unmappedOrders"],
  ["totalOrdersSummary"],
  ["readyOrdersSummary"],
  ["hallmarkOrdersSummary"],
];

interface OrderTableProps {
  orders: Order[];
  showDateFilter?: boolean;
  enableBulkActions?: boolean;
  onMarkAsReady?: (selectedOrders: Order[]) => void;
  onDelete?: (orderId: string) => void;
  isDeleting?: boolean;
  enableExport?: boolean;
}

export default function OrderTable({ 
  orders, 
  showDateFilter = false, 
  enableBulkActions = false,
  onMarkAsReady,
  onDelete,
  isDeleting = false,
  enableExport = false
}: OrderTableProps) {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { actor } = useActor();
  const queryClient = useQueryClient();

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

    // Separate orders by type
    const rbOrders = selectedOrders.filter((order) => order.orderType === OrderType.RB);
    const soCoOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.SO || order.orderType === OrderType.CO
    );

    if (rbOrders.length > 0 && onMarkAsReady) {
      // Pass ALL selected orders to the parent handler so it can process
      // RB orders via supply dialog AND SO/CO orders via markOrdersAsReady
      onMarkAsReady(selectedOrders);
      setSelectedRows(new Set());
    } else if (soCoOrders.length > 0) {
      // Only SO/CO orders selected — show confirmation dialog
      setShowConfirmDialog(true);
    }
  };

  const confirmMarkAsReady = async () => {
    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    setIsUpdating(true);
    try {
      const selectedOrders = orders.filter((o) => selectedRows.has(o.orderId));
      const soCoOrders = selectedOrders.filter(
        (order) => order.orderType === OrderType.SO || order.orderType === OrderType.CO
      );
      
      const orderIds = soCoOrders.map(order => order.orderId);
      
      // Call the backend method to mark orders as ready
      await actor.markOrdersAsReady(orderIds);
      
      // Invalidate all order-related queries AND summary queries to refresh data across all tabs
      await Promise.all(
        INVALIDATE_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        )
      );
      
      toast.success(`${soCoOrders.length} order(s) marked as Ready`);
      setSelectedRows(new Set());
      setShowConfirmDialog(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update orders";
      toast.error(errorMessage);
      console.error("Error updating orders:", error);
    } finally {
      setIsUpdating(false);
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
        toast.success("Exported to Excel");
      } else if (format === "pdf") {
        await exportToPDF(orders, actor);
      } else if (format === "jpeg") {
        await exportToJPEG(orders, actor);
      }
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
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
      {(enableBulkActions || enableExport) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedRows.size > 0 && `${selectedRows.size} order(s) selected`}
          </div>
          <div className="flex gap-2">
            {enableBulkActions && selectedRows.size > 0 && (
              <Button
                onClick={handleMarkAsReady}
                size="sm"
                className="bg-gold hover:bg-gold-hover"
              >
                Mark as Ready
              </Button>
            )}
            {enableExport && (
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
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkActions && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Order No</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead className="text-right">Weight (g)</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total Wt (g)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Remarks</TableHead>
              {onDelete && <TableHead className="w-10"></TableHead>}
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
              Object.entries(groupedOrders).map(([design, designOrders]) =>
                designOrders.map((order, index) => (
                  <TableRow
                    key={order.orderId}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedRows.has(order.orderId) ? "bg-muted/50" : ""
                    } ${order.originalOrderId ? "border-l-2 border-l-gold/50" : ""}`}
                    onClick={() => handleRowClick(order.orderId)}
                  >
                    {enableBulkActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(order.orderId)}
                          onCheckedChange={() => handleRowClick(order.orderId)}
                          aria-label={`Select order ${order.orderNo}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {order.originalOrderId ? (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs">↳</span>
                          {order.orderNo}
                        </span>
                      ) : (
                        <button
                          className="text-gold hover:underline font-medium"
                          onClick={(e) => handleDesignClick(order.design, e)}
                        >
                          {order.orderNo}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <button
                          className="text-gold hover:underline"
                          onClick={(e) => handleDesignClick(design, e)}
                        >
                          {design}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs pl-2">—</span>
                      )}
                    </TableCell>
                    <TableCell>{order.genericName || "—"}</TableCell>
                    <TableCell>{order.karigarName || "—"}</TableCell>
                    <TableCell className="text-right">
                      {order.weightPerUnit.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{order.size}</TableCell>
                    <TableCell className="text-right">
                      {Number(order.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(order.weightPerUnit * Number(order.quantity)).toFixed(3)}
                    </TableCell>
                    <TableCell>{order.orderType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.remarks || "—"}
                    </TableCell>
                    {onDelete && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(order.orderId)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation dialog for SO/CO orders */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Orders as Ready?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedRows.size} selected order(s) as Ready.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsReady}
              disabled={isUpdating}
              className="bg-gold hover:bg-gold-hover"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Design image modal — pass open state based on whether a design is selected */}
      {selectedDesign && (
        <DesignImageModal
          designCode={selectedDesign}
          open={!!selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}
    </div>
  );
}
