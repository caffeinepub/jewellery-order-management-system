import { useState } from "react";
import { useGetReadyOrdersByDateRange, useUpdateDesignGroupStatus } from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Printer, Search } from "lucide-react";
import { Order } from "@/backend";
import { normalizeOrders } from "@/utils/orderNormalizer";
import { getQuantityAsNumber } from "@/utils/orderNormalizer";
import { toast } from "sonner";

export function TagPrinting() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fetchedOrders, setFetchedOrders] = useState<Order[]>([]);
  const [selectedDesignGroups, setSelectedDesignGroups] = useState<string[]>([]);

  const getReadyOrdersMutation = useGetReadyOrdersByDateRange();
  const updateDesignGroupMutation = useUpdateDesignGroupStatus();

  const handleFetchOrders = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);

      const orders = await getReadyOrdersMutation.mutateAsync({
        startDate: start,
        endDate: end,
      });
      const normalized = normalizeOrders(orders);
      setFetchedOrders(normalized);
      setSelectedDesignGroups([]);
      if (normalized.length === 0) {
        toast.info("No ready orders found in the selected date range");
      } else {
        toast.success(`Found ${normalized.length} ready orders`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch orders");
    }
  };

  // Group orders by design code
  const designGroups = Array.from(
    fetchedOrders.reduce((map, order) => {
      const key = order.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
      return map;
    }, new Map<string, Order[]>()).entries()
  );

  const toggleDesignGroup = (designCode: string) => {
    setSelectedDesignGroups((prev) =>
      prev.includes(designCode)
        ? prev.filter((d) => d !== designCode)
        : [...prev, designCode]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDesignGroups.length === designGroups.length) {
      setSelectedDesignGroups([]);
    } else {
      setSelectedDesignGroups(designGroups.map(([code]) => code));
    }
  };

  const handleMarkAsHallmark = async () => {
    if (selectedDesignGroups.length === 0) {
      toast.error("Please select at least one design group");
      return;
    }
    // Get all order IDs for selected design groups
    const orderIds = fetchedOrders
      .filter((o) => selectedDesignGroups.includes(o.design))
      .map((o) => o.orderId);

    try {
      await updateDesignGroupMutation.mutateAsync(orderIds);
      toast.success(`${selectedDesignGroups.length} design group(s) marked as Hallmark`);
      setFetchedOrders((prev) =>
        prev.filter((o) => !selectedDesignGroups.includes(o.design))
      );
      setSelectedDesignGroups([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold font-playfair text-foreground">
        Tag Printing
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={handleFetchOrders}
              disabled={getReadyOrdersMutation.isPending}
              className="bg-gold hover:bg-gold-hover text-white"
            >
              {getReadyOrdersMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                  Fetching...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Fetch Orders
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {designGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedDesignGroups.length === designGroups.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                Select All ({designGroups.length} design groups)
              </span>
            </div>
            {selectedDesignGroups.length > 0 && (
              <Button
                size="sm"
                onClick={handleMarkAsHallmark}
                disabled={updateDesignGroupMutation.isPending}
                className="bg-gold hover:bg-gold-hover text-white"
              >
                {updateDesignGroupMutation.isPending ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                    Updating...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Printer className="h-3 w-3" />
                    Mark as Hallmark ({selectedDesignGroups.length})
                  </span>
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {designGroups.map(([designCode, groupOrders]) => {
              const totalQty = groupOrders.reduce(
                (sum, o) => sum + getQuantityAsNumber(o.quantity),
                0
              );
              const isSelected = selectedDesignGroups.includes(designCode);

              return (
                <Card
                  key={designCode}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "border-gold bg-gold/5" : "hover:border-gold/50"
                  }`}
                  onClick={() => toggleDesignGroup(designCode)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDesignGroup(designCode)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="font-medium text-sm">{designCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {groupOrders[0]?.genericName ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {groupOrders.length} orders
                        </Badge>
                        <p className="text-xs text-gold font-medium mt-1">
                          Qty: {totalQty}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {fetchedOrders.length === 0 && !getReadyOrdersMutation.isPending && (
        <div className="text-center text-muted-foreground py-12">
          <Printer className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No orders loaded</p>
          <p className="text-sm">Select a date range and fetch orders to begin</p>
        </div>
      )}
    </div>
  );
}
