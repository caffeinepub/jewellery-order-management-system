import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Order, OrderStatus } from "../../backend";
import { useGetAllOrders, useGetAllMasterDesignMappings } from "../../hooks/useQueries";

interface KarigarsTabProps {
  orders?: Order[];
}

export default function KarigarsTab({ orders: propOrders }: KarigarsTabProps) {
  const { data: fetchedOrders, isLoading } = useGetAllOrders();
  const { data: designMappings } = useGetAllMasterDesignMappings();
  const navigate = useNavigate();

  const allOrders = propOrders ?? fetchedOrders ?? [];

  // Build karigar name map from live design mappings
  const karigarByDesign = useMemo(() => {
    const map = new Map<string, string>();
    if (designMappings) {
      for (const [code, mapping] of designMappings) {
        map.set(code, mapping.karigarName);
      }
    }
    return map;
  }, [designMappings]);

  const pendingOrders = useMemo(() =>
    allOrders.filter(o => o.status === OrderStatus.Pending),
    [allOrders]
  );

  // Group pending orders by karigar name (using live mapping first)
  const karigarGroups = useMemo(() => {
    const groups = new Map<string, {
      orders: Order[];
      designs: Set<string>;
      totalWeight: number;
      genericNames: Set<string>;
    }>();

    pendingOrders.forEach(order => {
      // Always prefer live mapping karigar name
      const karigarName = karigarByDesign.get(order.design) || order.karigarName || "Unassigned";
      if (!groups.has(karigarName)) {
        groups.set(karigarName, {
          orders: [],
          designs: new Set(),
          totalWeight: 0,
          genericNames: new Set(),
        });
      }
      const group = groups.get(karigarName)!;
      group.orders.push(order);
      group.designs.add(order.design);
      group.totalWeight += order.weight;
      if (order.genericName) group.genericNames.add(order.genericName);
    });

    return groups;
  }, [pendingOrders, karigarByDesign]);

  const handleKarigarClick = (karigarName: string) => {
    // Encode the karigar name for URL safety
    navigate({ to: "/karigar/$name", params: { name: encodeURIComponent(karigarName) } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (karigarGroups.size === 0) {
    return (
      <div className="text-center py-12 text-white/50">
        No active karigars with pending orders.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from(karigarGroups.entries()).map(([karigarName, data]) => {
        const designCodes = Array.from(data.designs);
        const previewCodes = designCodes.slice(0, 6);
        const remaining = designCodes.length - previewCodes.length;
        const genericNamesArr = Array.from(data.genericNames);

        return (
          <div
            key={karigarName}
            className="rounded-lg border border-white/10 bg-zinc-900 p-4 cursor-pointer hover:bg-zinc-800 transition-colors"
            onClick={() => handleKarigarClick(karigarName)}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: karigar name + design codes + generic names */}
              <div className="flex-1 min-w-0">
                {/* Karigar name pill */}
                <div className="mb-2">
                  <span className="inline-block bg-white/10 text-white text-sm font-semibold px-3 py-1 rounded-full border border-white/20">
                    {karigarName}
                  </span>
                </div>
                {/* Design codes */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {previewCodes.map(code => (
                    <span key={code} className="text-xs font-bold text-orange-400">{code}</span>
                  ))}
                  {remaining > 0 && (
                    <span className="text-xs text-white/50">+{remaining} more</span>
                  )}
                </div>
                {/* Generic names */}
                {genericNamesArr.length > 0 && (
                  <div className="text-xs text-white/50">
                    {genericNamesArr.slice(0, 3).join(", ")}
                    {genericNamesArr.length > 3 && ` +${genericNamesArr.length - 3} more`}
                  </div>
                )}
              </div>

              {/* Right: stats */}
              <div className="text-right flex-shrink-0 space-y-1">
                <div>
                  <div className="text-xs text-white/50">Orders</div>
                  <div className="text-lg font-bold text-orange-400">{data.orders.length}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Weight</div>
                  <div className="text-sm font-semibold text-white">{data.totalWeight.toFixed(2)}g</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Designs</div>
                  <div className="text-sm font-semibold text-white">{data.designs.size}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
