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
import { Download, Trash2 } from "lucide-react";
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

interface OrderTableProps {
  orders: Order[];
  showDateFilter?: boolean;
  enableBulkActions?: boolean;
  onMarkAsReady?: (selectedOrders: Order[]) => void;
  onDelete?: (orderId: string) => void;
  enableExport?: boolean;
}

export default function OrderTable({ 
  orders, 
  showDateFilter = false, 
  enableBulkActions = false,
  onMarkAsReady,
  onDelete,
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

    // If there are RB orders, handle them via the supply dialog
    if (rbOrders.length > 0 && onMarkAsReady) {
      onMarkAsReady(rbOrders);
      // Clear selection after handling
      setSelectedRows(new Set());
    } else if (soCoOrders.length > 0) {
      // For SO/CO orders, show confirmation dialog
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
      
      // Invalidate all order-related queries to refresh data across all tabs
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      await queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      
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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? "data-[state=checked]:bg-gold" : ""}
                  />
                </TableHead>
              )}
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Weight (g)</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Status</TableHead>
              {onDelete && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={onDelete ? 11 : 10}
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
                    onClick={() => handleRowClick(order.orderId)}
                    className={`cursor-pointer ${
                      selectedRows.has(order.orderId) ? "bg-red-100 dark:bg-red-950/30" : ""
                    }`}
                  >
                    {enableBulkActions && (
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(order.orderId)}
                          onCheckedChange={() => handleRowClick(order.orderId)}
                          aria-label={`Select order ${order.orderNo}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>{order.genericName || "-"}</TableCell>
                    <TableCell>{order.karigarName || "-"}</TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <button
                          onClick={(e) => handleDesignClick(design, e)}
                          className="text-gold hover:text-gold-hover underline font-medium"
                        >
                          {design}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">↳</span>
                      )}
                    </TableCell>
                    <TableCell>{order.weight.toFixed(3)}</TableCell>
                    <TableCell>{order.size}</TableCell>
                    <TableCell>{Number(order.quantity)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-muted">
                        {order.orderType}
                      </span>
                    </TableCell>
                    <TableCell>{order.remarks || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          order.status === OrderStatus.Ready
                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                            : order.status === OrderStatus.Pending
                            ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            : order.status === OrderStatus.Hallmark
                            ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                            : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {order.status === OrderStatus.ReturnFromHallmark ? "Returned" : order.status}
                      </span>
                    </TableCell>
                    {onDelete && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(order.orderId);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <AlertDialogTitle>Mark Orders as Ready?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedRows.size} order(s) as Ready? This action will update the order status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsReady}
              disabled={isUpdating}
              className="bg-gold hover:bg-gold-hover"
            >
              {isUpdating ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
