import { OrderStatus } from "@/backend";
import { useGetAllDesignMappings, useGetAllOrders } from "@/hooks/useQueries";
import {
  buildDesignMappingsMap,
  resolveKarigar,
} from "@/utils/karigarResolver";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, User } from "lucide-react";
import { useMemo } from "react";

export default function KarigarsTab() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  // Use the full DesignMapping data (not just the 3-tuple) for accurate karigar resolution
  const { data: rawMappings = [] } = useGetAllDesignMappings();
  const navigate = useNavigate();

  // Build a normalized Map<designCode, DesignMapping> for O(1) lookups
  const designMappingsMap = useMemo(
    () => buildDesignMappingsMap(rawMappings),
    [rawMappings],
  );

  const karigarGroups = useMemo(() => {
    // Only pending orders with qty > 0
    const pendingOrders = orders.filter(
      (order) =>
        order.status === OrderStatus.Pending && Number(order.quantity) > 0,
    );

    const groups: Record<string, typeof pendingOrders> = {};

    for (const order of pendingOrders) {
      // SINGLE SOURCE OF TRUTH: always resolve karigar from master design mappings
      // Never use order.karigarName for grouping
      const karigar = resolveKarigar(order.design, designMappingsMap);
      if (!groups[karigar]) {
        groups[karigar] = [];
      }
      groups[karigar].push(order);
    }

    return Object.entries(groups)
      .map(([name, groupOrders]) => ({
        name,
        orders: groupOrders,
        totalOrders: groupOrders.length,
        totalQty: groupOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
        // Dynamic weight: unit_weight × qty
        totalWeight: groupOrders.reduce(
          (sum, o) => sum + o.weight * Number(o.quantity),
          0,
        ),
        uniqueDesigns: new Set(
          groupOrders.map((o) => o.design.toUpperCase().trim()),
        ).size,
      }))
      .sort((a, b) => {
        // Put 'Unassigned' at the end
        if (a.name === "Unassigned") return 1;
        if (b.name === "Unassigned") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [orders, designMappingsMap]);

  const handleKarigarClick = (karigarName: string) => {
    navigate({ to: `/karigar/${encodeURIComponent(karigarName)}` });
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        style={{ backgroundColor: "#000000", minHeight: "400px" }}
      >
        <div style={{ color: "#6b7280" }}>Loading karigars...</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 p-3"
      style={{ backgroundColor: "#000000", minHeight: "400px" }}
    >
      {karigarGroups.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div style={{ color: "#6b7280" }}>No pending orders found</div>
        </div>
      )}

      {karigarGroups.map((karigar) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: karigar card with complex children
        <div
          key={karigar.name}
          className="rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
          }}
          onClick={() => handleKarigarClick(karigar.name)}
        >
          {/* Card Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            {/* Orange person icon */}
            <div className="shrink-0">
              <User
                size={22}
                style={{
                  color: karigar.name === "Unassigned" ? "#6b7280" : "#f97316",
                }}
                strokeWidth={2}
              />
            </div>

            {/* Name + designs count */}
            <div className="flex-1 min-w-0">
              <div
                className="text-base font-bold tracking-wide uppercase leading-tight"
                style={{
                  color: karigar.name === "Unassigned" ? "#9ca3af" : "#ffffff",
                }}
              >
                {karigar.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                {karigar.uniqueDesigns}{" "}
                {karigar.uniqueDesigns === 1 ? "design" : "designs"}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight
              size={18}
              style={{ color: "#4b5563" }}
              strokeWidth={2}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              backgroundColor: "#1f1f1f",
              marginLeft: "16px",
              marginRight: "16px",
            }}
          />

          {/* Stats Row */}
          <div className="grid grid-cols-3 px-4 py-4 gap-2">
            {/* Orders */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{
                  color: karigar.name === "Unassigned" ? "#9ca3af" : "#f97316",
                }}
              >
                {karigar.totalOrders}
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: "#6b7280" }}
              >
                Orders
              </div>
            </div>

            {/* Qty */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{
                  color: karigar.name === "Unassigned" ? "#9ca3af" : "#f97316",
                }}
              >
                {karigar.totalQty}
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: "#6b7280" }}
              >
                Qty
              </div>
            </div>

            {/* Weight */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{
                  color: karigar.name === "Unassigned" ? "#9ca3af" : "#f97316",
                }}
              >
                {karigar.totalWeight.toFixed(1)}g
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: "#6b7280" }}
              >
                Weight
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
