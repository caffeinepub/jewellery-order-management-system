import { useState } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, CheckCircle, Download, Image } from "lucide-react";
import { useMarkOrdersAsReady, useBatchDeleteOrders } from "../../hooks/useQueries";
import { exportOrdersToExcel } from "../../utils/exportUtils";
import { DesignImageModal } from "./DesignImageModal";
import { SuppliedQtyDialog } from "./SuppliedQtyDialog";
import { getQuantityAsNumber } from "../../utils/orderNormalizer";
import { getAgeingClass } from "../../utils/ageingUtils";

interface AgeingTier {
  orderId: string;
  tier: "oldest" | "middle" | "newest";
}

interface OrderTableProps {
  orders: Order[];
  showCheckboxes?: boolean;
  showMarkReady?: boolean;
  showDelete?: boolean;
  showExport?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  externalSelectedIds?: string[];
  readOnly?: boolean;
  ageingTiers?: AgeingTier[];
}

function getStatusBadgeVariant(
  status: OrderStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case OrderStatus.Ready:
      return "default";
    case OrderStatus.Hallmark:
      return "secondary";
    case OrderStatus.ReturnFromHallmark:
      return "outline";
    case OrderStatus.Pending:
    default:
      return "secondary";
  }
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Ready:
      return "Ready";
    case OrderStatus.Hallmark:
      return "Hallmark";
    case OrderStatus.ReturnFromHallmark:
      return "Return";
    case OrderStatus.Pending:
    default:
      return "Pending";
  }
}

export function OrderTable({
  orders,
  showCheckboxes = false,
  showMarkReady = false,
  showDelete = false,
  showExport = false,
  onSelectionChange,
  externalSelectedIds,
  readOnly = false,
  ageingTiers = [],
}: OrderTableProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [showSupplyDialog, setShowSupplyDialog] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);

  const markReadyMutation = useMarkOrdersAsReady();
  const deleteMutation = useBatchDeleteOrders();

  const selectedIds = externalSelectedIds ?? internalSelectedIds;

  const setSelectedIds = (ids: string[]) => {
    if (externalSelectedIds === undefined) {
      setInternalSelectedIds(ids);
    }
    onSelectionChange?.(ids);
  };

  const toggleSelect = (orderId: string) => {
    const newIds = selectedIds.includes(orderId)
      ? selectedIds.filter((id) => id !== orderId)
      : [...selectedIds, orderId];
    setSelectedIds(newIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.orderId));
    }
  };

  const handleMarkReady = async () => {
    if (selectedIds.length === 0) return;

    const selectedOrders = orders.filter((o) => selectedIds.includes(o.orderId));
    const rbOrders = selectedOrders.filter((o) => o.orderType === OrderType.RB);

    if (rbOrders.length > 0) {
      setSupplyOrders(rbOrders);
      setShowSupplyDialog(true);
    } else {
      await markReadyMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteMutation.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const handleExport = () => {
    exportOrdersToExcel(orders, "orders");
  };

  const getAgeingTierForOrder = (orderId: string) => {
    return ageingTiers.find((t) => t.orderId === orderId)?.tier;
  };

  return (
    <div className="space-y-2">
      {(showMarkReady || showDelete || showExport) && (
        <div className="flex items-center gap-2 flex-wrap">
          {showMarkReady && selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={handleMarkReady}
              disabled={markReadyMutation.isPending}
              className="bg-gold hover:bg-gold-hover text-white"
            >
              {markReadyMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                  Marking...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Mark Ready ({selectedIds.length})
                </span>
              )}
            </Button>
          )}
          {showDelete && selectedIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete ({selectedIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Orders</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.length} order(s)? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {showExport && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      orders.length > 0 && selectedIds.length === orders.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Order No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-10">Img</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showCheckboxes ? 12 : 11}
                  className="text-center text-muted-foreground py-8"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const tier = getAgeingTierForOrder(order.orderId);
                const ageingClass = tier ? getAgeingClass(tier) : "";
                const qty = getQuantityAsNumber(order.quantity);

                return (
                  <TableRow
                    key={order.orderId}
                    className={`${
                      selectedIds.includes(order.orderId)
                        ? "bg-muted/50"
                        : ""
                    } ${ageingClass}`}
                  >
                    {showCheckboxes && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(order.orderId)}
                          onCheckedChange={() => toggleSelect(order.orderId)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-sm">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {order.orderType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{order.design}</TableCell>
                    <TableCell className="text-sm">{order.product}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {qty}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {order.weight?.toFixed(2) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {order.size > 0 ? order.size : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.karigarName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(order.status)}
                        className="text-xs"
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                      {order.remarks || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setSelectedDesign(order.design)}
                      >
                        <Image className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDesign && (
        <DesignImageModal
          open={!!selectedDesign}
          designCode={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}

      {showSupplyDialog && supplyOrders.length > 0 && (
        <SuppliedQtyDialog
          orders={supplyOrders}
          onClose={() => {
            setShowSupplyDialog(false);
            setSupplyOrders([]);
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
}
