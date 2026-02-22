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
import { Download, FileSpreadsheet, FileImage } from "lucide-react";
import { Order, OrderType } from "@/backend";
import DesignImageModal from "./DesignImageModal";
import { SuppliedQtyDialog } from "./SuppliedQtyDialog";
import { exportToExcel, exportToPDF, exportToJPEG } from "@/utils/exportUtils";
import { useUpdateOrdersStatusToReady, useUpdateOrderStatusToReadyWithQty } from "@/hooks/useQueries";
import { toast } from "sonner";

interface OrderTableProps {
  orders: Order[];
  showStatusActions?: boolean;
  showExport?: boolean;
  exportFilename?: string;
}

export function OrderTable({
  orders,
  showStatusActions = false,
  showExport = true,
  exportFilename = "orders",
}: OrderTableProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [rbOrderForQty, setRbOrderForQty] = useState<Order | null>(null);
  
  const updateOrdersStatusToReady = useUpdateOrdersStatusToReady();
  const updateOrderStatusToReadyWithQty = useUpdateOrderStatusToReadyWithQty();

  const handleRowClick = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDesignClick = (e: React.MouseEvent, designCode: string) => {
    e.stopPropagation();
    setSelectedDesign(designCode);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.orderId)));
    }
  };

  const handleMarkReady = async () => {
    const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.orderId));
    const rbOrders = selectedOrdersList.filter((o) => o.orderType === OrderType.RB);
    const coOrders = selectedOrdersList.filter((o) => o.orderType === OrderType.CO);

    if (coOrders.length > 0) {
      try {
        await updateOrdersStatusToReady.mutateAsync(coOrders.map((o) => o.orderId));
        toast.success(`${coOrders.length} CO order(s) marked as Ready`);
      } catch (error) {
        toast.error('Failed to update CO orders');
        console.error(error);
      }
    }

    if (rbOrders.length > 0) {
      setRbOrderForQty(rbOrders[0]);
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleQtySubmit = async (suppliedQty: number) => {
    if (!rbOrderForQty) return;

    try {
      await updateOrderStatusToReadyWithQty.mutateAsync({
        orderId: rbOrderForQty.orderId,
        suppliedQty: BigInt(suppliedQty),
      });

      toast.success(`Order ${rbOrderForQty.orderNo} marked as Ready with supplied qty: ${suppliedQty}`);
      
      const remainingRbOrders = orders.filter(
        (o) => selectedOrders.has(o.orderId) && o.orderType === OrderType.RB && o.orderId !== rbOrderForQty.orderId
      );

      if (remainingRbOrders.length > 0) {
        setRbOrderForQty(remainingRbOrders[0]);
      } else {
        setRbOrderForQty(null);
        setSelectedOrders(new Set());
      }
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    }
  };

  const handleQtyCancel = () => {
    setRbOrderForQty(null);
    setSelectedOrders(new Set());
  };

  const groupedOrders: { design: string; orders: Order[] }[] = [];
  const designMap = new Map<string, Order[]>();

  orders.forEach((order) => {
    if (!designMap.has(order.design)) {
      designMap.set(order.design, []);
    }
    designMap.get(order.design)!.push(order);
  });

  designMap.forEach((orders, design) => {
    groupedOrders.push({ design, orders });
  });

  return (
    <div className="space-y-4">
      {selectedOrders.size > 0 && showStatusActions && (
        <div className="flex items-center gap-2 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-sm font-medium">
            {selectedOrders.size} order(s) selected
          </span>
          <Button
            onClick={handleMarkReady}
            size="sm"
            className="ml-auto bg-accent hover:bg-accent/90"
            disabled={updateOrdersStatusToReady.isPending || updateOrderStatusToReadyWithQty.isPending}
          >
            Mark as Ready
          </Button>
        </div>
      )}

      {showExport && orders.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(orders, exportFilename)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(orders, exportFilename)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToJPEG(orders, exportFilename)}
          >
            <FileImage className="h-4 w-4 mr-2" />
            Export JPEG
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showStatusActions && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={
                      orders.length > 0 && selectedOrders.size === orders.length
                    }
                    onChange={handleSelectAll}
                    className="cursor-pointer"
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
            {groupedOrders.map((group, groupIndex) => (
              <>
                {groupIndex > 0 && (
                  <TableRow key={`separator-${group.design}`}>
                    <TableCell
                      colSpan={showStatusActions ? 11 : 10}
                      className="h-2 bg-muted/30 p-0"
                    />
                  </TableRow>
                )}
                {group.orders.map((order) => (
                  <TableRow
                    key={order.orderId}
                    className={`cursor-pointer transition-colors ${
                      selectedOrders.has(order.orderId)
                        ? "bg-accent/20 hover:bg-accent/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleRowClick(order.orderId)}
                  >
                    {showStatusActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.orderId)}
                          onChange={() => handleRowClick(order.orderId)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell
                      className="font-medium text-accent cursor-pointer hover:underline"
                      onClick={(e) => handleDesignClick(e, order.design)}
                    >
                      {order.design}
                    </TableCell>
                    <TableCell>{order.genericName || "-"}</TableCell>
                    <TableCell>{order.karigarName || "-"}</TableCell>
                    <TableCell>{order.weight.toFixed(2)}</TableCell>
                    <TableCell>{order.size.toFixed(2)}</TableCell>
                    <TableCell>{Number(order.quantity)}</TableCell>
                    <TableCell>{order.remarks || "-"}</TableCell>
                    <TableCell>{order.orderNo}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.orderType === "RB"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.orderType}
                      </span>
                    </TableCell>
                    <TableCell>{order.product}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showStatusActions ? 11 : 10}
                  className="text-center text-muted-foreground py-8"
                >
                  No orders found
                </TableCell>
              </TableRow>
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

      {rbOrderForQty && (
        <SuppliedQtyDialog
          order={rbOrderForQty}
          onSubmit={handleQtySubmit}
          onCancel={handleQtyCancel}
        />
      )}
    </div>
  );
}

export default OrderTable;
