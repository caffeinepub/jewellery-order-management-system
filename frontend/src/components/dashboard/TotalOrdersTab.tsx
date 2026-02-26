import { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import { OrderTable } from "./OrderTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetMasterDesigns } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";
import OverdueFilterControl, {
  OverdueSortDirection,
  OverdueFilterThreshold,
} from "./OverdueFilterControl";
import { computeAgeingTiers } from "@/utils/ageingUtils";

interface TotalOrdersTabProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function TotalOrdersTab({ orders, isLoading }: TotalOrdersTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [karigarFilter, setKarigarFilter] = useState<string>("all");
  const [overdueSort, setOverdueSort] = useState<OverdueSortDirection>(null);
  const [overdueFilterThreshold, setOverdueFilterThreshold] = useState<OverdueFilterThreshold>(null);

  const { data: masterDesignsRaw } = useGetMasterDesigns();

  // Build a Map from the array of [designCode, genericName, karigarName] tuples
  const masterDesigns = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    if (masterDesignsRaw) {
      for (const [designCode, genericName, karigarName] of masterDesignsRaw) {
        map.set(designCode.trim().toUpperCase(), { genericName, karigarName });
      }
    }
    return map;
  }, [masterDesignsRaw]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === OrderStatus.Pending);
  }, [orders]);

  const enrichedOrders = useMemo(() => {
    return pendingOrders.map((order) => {
      const normalizedDesign = order.design?.trim().toUpperCase();
      const mapping = masterDesigns.get(normalizedDesign);
      return {
        ...order,
        genericName: order.genericName ?? mapping?.genericName,
        karigarName: order.karigarName ?? mapping?.karigarName,
      };
    });
  }, [pendingOrders, masterDesigns]);

  const karigars = useMemo(() => {
    const set = new Set<string>();
    enrichedOrders.forEach((o) => {
      if (o.karigarName) set.add(o.karigarName);
    });
    return Array.from(set).sort();
  }, [enrichedOrders]);

  const filteredOrders = useMemo(() => {
    let result = enrichedOrders;

    if (typeFilter !== "all") {
      result = result.filter((o) => o.orderType === typeFilter);
    }

    if (karigarFilter !== "all") {
      result = result.filter((o) => o.karigarName === karigarFilter);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(s) ||
          o.design.toLowerCase().includes(s) ||
          (o.genericName ?? "").toLowerCase().includes(s) ||
          (o.karigarName ?? "").toLowerCase().includes(s)
      );
    }

    if (overdueFilterThreshold !== null) {
      const now = Date.now();
      result = result.filter((o) => {
        const createdMs = Number(o.createdAt) / 1_000_000;
        const ageDays = (now - createdMs) / (1000 * 60 * 60 * 24);
        return ageDays >= overdueFilterThreshold;
      });
    }

    if (overdueSort === "mostOverdueFirst") {
      result = [...result].sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    } else if (overdueSort === "mostRecentFirst") {
      result = [...result].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    }

    return result;
  }, [enrichedOrders, typeFilter, karigarFilter, search, overdueSort, overdueFilterThreshold]);

  // computeAgeingTiers returns Map<string, AgeingTier> where AgeingTier can be null.
  // OrderTable expects AgeingTier[] where tier is non-null, so filter out null entries.
  const ageingTiers = useMemo(() => {
    const tiersMap = computeAgeingTiers(filteredOrders);
    const result: Array<{ orderId: string; tier: "oldest" | "middle" | "newest" }> = [];
    tiersMap.forEach((tier, orderId) => {
      if (tier !== null) {
        result.push({ orderId, tier });
      }
    });
    return result;
  }, [filteredOrders]);

  const handleOverdueClear = () => {
    setOverdueSort(null);
    setOverdueFilterThreshold(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={OrderType.CO}>CO</SelectItem>
            <SelectItem value={OrderType.RB}>RB</SelectItem>
            <SelectItem value={OrderType.SO}>SO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={karigarFilter} onValueChange={setKarigarFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Karigars</SelectItem>
            {karigars.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <OverdueFilterControl
          sortDirection={overdueSort}
          filterThreshold={overdueFilterThreshold}
          onSortChange={setOverdueSort}
          onFilterChange={setOverdueFilterThreshold}
          onClear={handleOverdueClear}
        />
      </div>

      <OrderTable
        orders={filteredOrders}
        showCheckboxes
        showMarkReady
        showDelete
        showExport
        ageingTiers={ageingTiers}
      />
    </div>
  );
}

export { TotalOrdersTab };
