import { useMemo } from 'react';
import { useGetAllOrders, useGetMasterDesigns } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { useNavigate } from '@tanstack/react-router';
import { User, ChevronRight } from 'lucide-react';

export default function KarigarsTab() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: masterDesignsRaw = [] } = useGetMasterDesigns();
  const navigate = useNavigate();

  // Build a Map from the raw [designCode, genericName, karigarName][] tuples
  const masterDesignsMap = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    masterDesignsRaw.forEach(([designCode, genericName, karigarName]) => {
      map.set(designCode.toUpperCase().trim(), { genericName, karigarName });
    });
    return map;
  }, [masterDesignsRaw]);

  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const normalizedDesign = order.design.toUpperCase().trim();
      const mapping = masterDesignsMap.get(normalizedDesign);
      return {
        ...order,
        genericName: mapping?.genericName || order.genericName,
        karigarName: mapping?.karigarName || order.karigarName,
      };
    });
  }, [orders, masterDesignsMap]);

  const karigarGroups = useMemo(() => {
    const pendingOrders = enrichedOrders.filter((order) => order.status === OrderStatus.Pending);

    const groups: Record<string, typeof pendingOrders> = {};

    pendingOrders.forEach((order) => {
      const karigar = order.karigarName || 'Unmapped';
      if (!groups[karigar]) {
        groups[karigar] = [];
      }
      groups[karigar].push(order);
    });

    return Object.entries(groups)
      .map(([name, groupOrders]) => ({
        name,
        orders: groupOrders,
        totalOrders: groupOrders.length,
        totalQty: groupOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
        totalWeight: groupOrders.reduce((sum, o) => sum + o.weight, 0),
        uniqueDesigns: new Set(groupOrders.map((o) => o.design.toUpperCase().trim())).size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enrichedOrders]);

  const handleKarigarClick = (karigarName: string) => {
    navigate({ to: `/karigar/${encodeURIComponent(karigarName)}` });
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        style={{ backgroundColor: '#000000', minHeight: '400px' }}
      >
        <div style={{ color: '#6b7280' }}>Loading karigars...</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 p-3"
      style={{ backgroundColor: '#000000', minHeight: '400px' }}
    >
      {karigarGroups.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div style={{ color: '#6b7280' }}>No pending orders found</div>
        </div>
      )}

      {karigarGroups.map((karigar) => (
        <div
          key={karigar.name}
          className="rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
          style={{
            backgroundColor: '#141414',
            border: '1px solid #2a2a2a',
          }}
          onClick={() => handleKarigarClick(karigar.name)}
        >
          {/* Card Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            {/* Orange person icon */}
            <div className="shrink-0">
              <User
                size={22}
                style={{ color: '#f97316' }}
                strokeWidth={2}
              />
            </div>

            {/* Name + designs count */}
            <div className="flex-1 min-w-0">
              <div
                className="text-base font-bold tracking-wide uppercase leading-tight"
                style={{ color: '#ffffff' }}
              >
                {karigar.name}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: '#6b7280' }}
              >
                {karigar.uniqueDesigns} {karigar.uniqueDesigns === 1 ? 'design' : 'designs'}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight
              size={18}
              style={{ color: '#4b5563' }}
              strokeWidth={2}
            />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: '#1f1f1f', marginLeft: '16px', marginRight: '16px' }} />

          {/* Stats Row */}
          <div className="grid grid-cols-3 px-4 py-4 gap-2">
            {/* Orders */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{ color: '#f97316' }}
              >
                {karigar.totalOrders}
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: '#6b7280' }}
              >
                Orders
              </div>
            </div>

            {/* Qty */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{ color: '#f97316' }}
              >
                {karigar.totalQty}
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: '#6b7280' }}
              >
                Qty
              </div>
            </div>

            {/* Weight */}
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-bold leading-none"
                style={{ color: '#f97316' }}
              >
                {karigar.totalWeight.toFixed(1)}g
              </div>
              <div
                className="text-xs mt-1.5 font-medium"
                style={{ color: '#6b7280' }}
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
