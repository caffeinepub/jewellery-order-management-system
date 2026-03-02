import { useState, useMemo } from "react";
import { User, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useGetAllOrders, useGetAllMasterDesignMappings } from "@/hooks/useQueries";

export default function KarigarsTab() {
  const navigate = useNavigate();
  const { data: allOrders = [], isLoading: ordersLoading } = useGetAllOrders();
  const { data: masterDesigns = [], isLoading: mappingsLoading } = useGetAllMasterDesignMappings();

  // Build design mapping lookup from master designs (source of truth for karigar names)
  const designMappingMap = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    for (const [code, mapping] of masterDesigns) {
      map.set(code, { genericName: mapping.genericName, karigarName: mapping.karigarName });
    }
    return map;
  }, [masterDesigns]);

  // Enrich orders with latest karigar/generic from master designs
  const enrichedOrders = useMemo(() => {
    return allOrders
      .filter((o) => o.status === "Pending")
      .map((order) => {
        const mapping = designMappingMap.get(order.design);
        if (mapping) {
          return { ...order, karigarName: mapping.karigarName, genericName: mapping.genericName };
        }
        return order;
      });
  }, [allOrders, designMappingMap]);

  // Group by karigar name
  const karigarGroups = useMemo(() => {
    const groups = new Map<
      string,
      { karigarName: string; designCodes: Set<string>; totalOrders: number; totalQty: number; totalWeight: number }
    >();

    for (const order of enrichedOrders) {
      const kn = order.karigarName || "Unassigned";
      if (!groups.has(kn)) {
        groups.set(kn, {
          karigarName: kn,
          designCodes: new Set(),
          totalOrders: 0,
          totalQty: 0,
          totalWeight: 0,
        });
      }
      const g = groups.get(kn)!;
      g.designCodes.add(order.design);
      g.totalOrders += 1;
      g.totalQty += Number(order.quantity);
      g.totalWeight += order.weight;
    }

    return Array.from(groups.values()).sort((a, b) => a.karigarName.localeCompare(b.karigarName));
  }, [enrichedOrders]);

  const isLoading = ordersLoading || mappingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (karigarGroups.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No karigar assignments found. Upload a master design file to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {karigarGroups.map((group) => (
        <div
          key={group.karigarName}
          className="bg-[#141414] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => navigate({ to: "/karigar/$name", params: { name: group.karigarName } })}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white uppercase tracking-wide text-sm">
                {group.karigarName}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {group.designCodes.size} design{group.designCodes.size !== 1 ? "s" : ""}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{group.totalOrders}</div>
              <div className="text-xs text-gray-400">Orders</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{group.totalQty}</div>
              <div className="text-xs text-gray-400">Qty</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{group.totalWeight.toFixed(2)}g</div>
              <div className="text-xs text-gray-400">Weight</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
