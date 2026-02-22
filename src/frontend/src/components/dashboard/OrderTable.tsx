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

  // Group orders by design code
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = [];
    }
    acc[order.design].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const handleRowClick = (orderId: string, e: React.MouseEvent) => {
    // Don't toggle if clicking on checkbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDesignCodeClick = (designCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDesign(designCode);
  };

  const handleCheckboxChange = (orderId: string) => {
    setSelectedRows(prev => {
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
      setSelectedRows(new Set(orders.map(o => o.orderId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleBulkStatusChange = async () => {
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
    try {
      if (format === "excel") {
        await exportToExcel(orders);
      } else if (format === "pdf") {
        await exportToPDF(orders, actor);
      } else {
        await exportToJPEG(orders);
      }
      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export to ${format.toUpperCase()}`);
      console.error(error);
    }
  };

  const allSelected = orders.length > 0 && selectedRows.size === orders.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < orders.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enableBulkActions && selectedRows.size > 0 && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={updateStatusMutation.isPending}
              className="bg-gold hover:bg-gold-hover"
            >
              {updateStatusMutation.isPending ? "Updating..." : `Mark ${selectedRows.size} as Ready`}
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
              <TableHead>Design</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead>Wt</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Order No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedOrders).map(([design, designOrders], groupIndex) => (
              <>
                {designOrders.map((order, index) => {
                  const isSelected = selectedRows.has(order.orderId);
                  return (
                    <TableRow
                      key={order.orderId}
                      onClick={(e) => handleRowClick(order.orderId, e)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          : "hover:bg-muted/50"
                      } ${index === 0 && groupIndex > 0 ? "border-t-2 border-gold/30" : ""}`}
                    >
                      {enableBulkActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleCheckboxChange(order.orderId)}
                            aria-label={`Select order ${order.orderNo}`}
                          />
                        </TableCell>
                      )}
                      <TableCell 
                        className="font-medium text-gold hover:text-gold-hover cursor-pointer underline decoration-dotted"
                        onClick={(e) => handleDesignCodeClick(order.design, e)}
                      >
                        {order.design}
                      </TableCell>
                      <TableCell>{order.genericName || "-"}</TableCell>
                      <TableCell>{order.karigarName || "-"}</TableCell>
                      <TableCell>{order.weight.toFixed(3)}</TableCell>
                      <TableCell>{order.size.toFixed(2)}</TableCell>
                      <TableCell>{order.quantity.toString()}</TableCell>
                      <TableCell>{order.remarks || "-"}</TableCell>
                      <TableCell>{order.orderNo}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                          {order.orderType}
                        </span>
                      </TableCell>
                      <TableCell>{order.product}</TableCell>
                    </TableRow>
                  );
                })}
              </>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={enableBulkActions ? 11 : 10} className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DesignImageModal
        open={selectedDesign !== null}
        onClose={() => setSelectedDesign(null)}
        designCode={selectedDesign || ""}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedRows.size} selected order(s) as Ready?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusChange}
              disabled={updateStatusMutation.isPending}
              className="bg-gold hover:bg-gold-hover"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
