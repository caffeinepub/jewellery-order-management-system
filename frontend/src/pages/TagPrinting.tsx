import { useState, useMemo } from "react";
import { useGetReadyOrders, useGetReadyOrdersByDateRange, useUpdateDesignGroupStatus } from "@/hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Calendar } from "lucide-react";
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
import type { Order } from "@/backend";

export default function TagPrinting() {
  const { data: readyOrders = [], isLoading } = useGetReadyOrders();
  const getReadyOrdersByDateRangeMutation = useGetReadyOrdersByDateRange();
  const updateDesignGroupStatusMutation = useUpdateDesignGroupStatus();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedDesignCodes, setSelectedDesignCodes] = useState<Set<string>>(new Set());
  const [showHallmarkDialog, setShowHallmarkDialog] = useState(false);

  const ordersToDisplay = isFiltering ? filteredOrders : readyOrders;

  const sortedOrders = useMemo(() => {
    return [...ordersToDisplay].sort((a, b) => {
      const dateA = a.readyDate ? Number(a.readyDate) : Number(a.createdAt);
      const dateB = b.readyDate ? Number(b.readyDate) : Number(b.createdAt);
      return dateA - dateB;
    });
  }, [ordersToDisplay]);

  const groupedByDesign = useMemo(() => {
    const groups: Record<
      string,
      { orderNumbers: string[]; genericName: string | undefined; orderIds: string[] }
    > = {};

    sortedOrders.forEach((order) => {
      if (!groups[order.design]) {
        groups[order.design] = {
          orderNumbers: [],
          genericName: order.genericName,
          orderIds: [],
        };
      }
      groups[order.design].orderNumbers.push(order.orderNo);
      groups[order.design].orderIds.push(order.orderId);
    });

    return groups;
  }, [sortedOrders]);

  const handleCopyOrderNumbers = async (orderNumbers: string[]) => {
    try {
      await navigator.clipboard.writeText(orderNumbers.join(','));
      toast.success("Order numbers copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleApplyDateFilter = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const startTimestamp = BigInt(start.getTime() * 1_000_000);
    const endTimestamp = BigInt(end.getTime() * 1_000_000);

    try {
      const filtered = await getReadyOrdersByDateRangeMutation.mutateAsync({
        startDate: startTimestamp,
        endDate: endTimestamp,
      });
      setFilteredOrders(filtered);
      setIsFiltering(true);
      toast.success(`Showing orders from ${startDate} to ${endDate}`);
    } catch {
      // error handled by mutation onError
    }
  };

  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilteredOrders([]);
    setIsFiltering(false);
    toast.success("Date filter cleared");
  };

  const handleToggleDesignSelection = (designCode: string) => {
    setSelectedDesignCodes((prev) => {
      const next = new Set(prev);
      if (next.has(designCode)) {
        next.delete(designCode);
      } else {
        next.add(designCode);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDesignCodes(new Set(Object.keys(groupedByDesign)));
    } else {
      setSelectedDesignCodes(new Set());
    }
  };

  const handleMoveToHallmark = () => {
    if (selectedDesignCodes.size === 0) {
      toast.error("Please select at least one design group");
      return;
    }
    setShowHallmarkDialog(true);
  };

  const confirmMoveToHallmark = async () => {
    try {
      const orderIds: string[] = [];
      selectedDesignCodes.forEach((designCode) => {
        const group = groupedByDesign[designCode];
        if (group) {
          orderIds.push(...group.orderIds);
        }
      });

      await updateDesignGroupStatusMutation.mutateAsync(orderIds);
      toast.success(`${selectedDesignCodes.size} design group(s) moved to Hallmark`);
      setSelectedDesignCodes(new Set());
      setShowHallmarkDialog(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update design groups";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading ready orders...</div>
        </div>
      </div>
    );
  }

  const designCodes = Object.keys(groupedByDesign).sort();
  const allSelected = designCodes.length > 0 && selectedDesignCodes.size === designCodes.length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tag Printing</h1>
        <p className="text-muted-foreground mt-2">
          Ready orders grouped by design code (sorted by ready date)
        </p>
      </div>

      {/* Date Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter by Ready Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium whitespace-nowrap">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium whitespace-nowrap">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleApplyDateFilter}
                disabled={!startDate || !endDate || getReadyOrdersByDateRangeMutation.isPending}
                className="bg-gold hover:bg-gold-hover"
              >
                {getReadyOrdersByDateRangeMutation.isPending ? "Filtering..." : "Apply Filter"}
              </Button>
              {isFiltering && (
                <Button onClick={handleClearDateFilter} variant="outline">
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
          {isFiltering && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {sortedOrders.length} order(s) from {startDate} to {endDate}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bulk Selection Controls */}
      {designCodes.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all design groups"
            />
            <span className="text-sm font-medium">
              {selectedDesignCodes.size > 0
                ? `${selectedDesignCodes.size} design group(s) selected`
                : "Select design groups"}
            </span>
          </div>
          {selectedDesignCodes.size > 0 && (
            <Button
              onClick={handleMoveToHallmark}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={updateDesignGroupStatusMutation.isPending}
            >
              {updateDesignGroupStatusMutation.isPending ? "Moving..." : "Move to Hallmark"}
            </Button>
          )}
        </div>
      )}

      {designCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {isFiltering
                ? "No orders found for the selected date range"
                : "No ready orders found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {designCodes.map((designCode) => {
            const { orderNumbers, genericName } = groupedByDesign[designCode];
            const isSelected = selectedDesignCodes.has(designCode);

            return (
              <Card
                key={designCode}
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/20" : ""
                }`}
                onClick={() => handleToggleDesignSelection(designCode)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleDesignSelection(designCode)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select design ${designCode}`}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gold">
                        {designCode}
                      </CardTitle>
                      {genericName && (
                        <p className="text-sm text-muted-foreground mt-1">{genericName}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {orderNumbers.length} order{orderNumbers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Order Numbers:</p>
                    <div className="bg-muted rounded-md p-3 max-h-32 overflow-y-auto">
                      <p className="text-sm font-mono break-all">
                        {orderNumbers.join(', ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyOrderNumbers(orderNumbers);
                    }}
                    className="w-full bg-gold hover:bg-gold-hover"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy for MPN
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={showHallmarkDialog} onOpenChange={setShowHallmarkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Hallmark?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move {selectedDesignCodes.size} design group(s) to Hallmark
              status? All orders in these design groups will be moved from the Ready tab to the
              Hallmark tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateDesignGroupStatusMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMoveToHallmark}
              disabled={updateDesignGroupStatusMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateDesignGroupStatusMutation.isPending ? "Moving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
