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
import { Download, AlertCircle } from "lucide-react";
import { Order } from "@/backend";
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
}

export default function OrderTable({ orders, showDateFilter = false, enableBulkActions = false }: OrderTableProps) {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
    setShowConfirmDialog(true);
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

    try {
      if (format === "excel") {
        exportToExcel(orders);
      } else if (format === "pdf") {
        await exportToPDF(orders, actor);
      } else if (format === "jpeg") {
        await exportToJPEG(orders);
      }
      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export to ${format.toUpperCase()}`);
      console.error(error);
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
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
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
              <TableHead>Order No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar Name</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={enableBulkActions ? 11 : 10}
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
                      <TableCell colSpan={enableBulkActions ? 11 : 10} className="h-2 p-0" />
                    </TableRow>
                  )}
                  {designOrders.map((order) => {
                    const isSelected = selectedRows.has(order.orderId);
                    const isUnmapped = !order.genericName || !order.karigarName;
                    
                    return (
                      <TableRow
                        key={order.orderId}
                        className={`${
                          isSelected ? "bg-blue-50 dark:bg-blue-950/20" : ""
                        } ${
                          isUnmapped ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                        } ${
                          enableBulkActions ? "cursor-pointer" : ""
                        }`}
                        onClick={() => handleRowClick(order.orderId)}
                      >
                        {enableBulkActions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleRowClick(order.orderId)}
                              aria-label={`Select order ${order.orderNo}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>{order.orderNo}</TableCell>
                        <TableCell>{order.orderType}</TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => handleDesignClick(order.design, e)}
                            className="text-primary hover:underline font-medium"
                          >
                            {order.design}
                          </button>
                        </TableCell>
                        <TableCell>
                          {order.genericName || (
                            <span className="text-muted-foreground italic text-sm"></span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.karigarName || (
                            <span className="text-muted-foreground italic text-sm"></span>
                          )}
                        </TableCell>
                        <TableCell>{order.weight}</TableCell>
                        <TableCell>{order.size}</TableCell>
                        <TableCell>{Number(order.quantity)}</TableCell>
                        <TableCell>{order.remarks}</TableCell>
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
              This action cannot be undone.
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
