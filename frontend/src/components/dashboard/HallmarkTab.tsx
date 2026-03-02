import { useState, useMemo } from 'react';
import { Order, OrderStatus } from '@/backend';
import { useGetAllOrders, useBatchUpdateOrderStatus } from '@/hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, Loader2, FileSpreadsheet, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { AgeingBadge } from '@/utils/ageingBadge';
import DesignImageModal from './DesignImageModal';
import { exportToExcel, exportToPDF, exportToJPEG } from '@/utils/exportUtils';

interface HallmarkTabProps {
  orders?: Order[];
  isError?: boolean;
  searchQuery?: string;
}

export function HallmarkTab({ orders: propOrders, isError: propIsError, searchQuery = '' }: HallmarkTabProps) {
  const { data: fetchedOrders = [], isLoading, isError: fetchError } = useGetAllOrders();
  const batchUpdateMutation = useBatchUpdateOrderStatus();

  const allOrders = propOrders ?? fetchedOrders;
  const isError = propIsError ?? fetchError;

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [karigarFilter, setKarigarFilter] = useState<string>('all');
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const hallmarkOrders = useMemo(() => {
    return allOrders.filter((o) => o.status === OrderStatus.Hallmark);
  }, [allOrders]);

  const search = localSearch || searchQuery;

  const filtered = useMemo(() => {
    return hallmarkOrders.filter((o) => {
      const matchSearch =
        !search ||
        o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        o.design.toLowerCase().includes(search.toLowerCase()) ||
        (o.genericName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.karigarName ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType = orderTypeFilter === 'all' || o.orderType === orderTypeFilter;
      const matchKarigar = karigarFilter === 'all' || o.karigarName === karigarFilter;
      return matchSearch && matchType && matchKarigar;
    });
  }, [hallmarkOrders, search, orderTypeFilter, karigarFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filtered) {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filtered]);

  const uniqueKarigars = useMemo(() => {
    return Array.from(new Set(hallmarkOrders.map((o) => o.karigarName).filter(Boolean))) as string[];
  }, [hallmarkOrders]);

  const toggleGroup = (design: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(design)) next.delete(design);
      else next.add(design);
      return next;
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleGroupSelection = (orders: Order[]) => {
    const ids = orders.map((o) => o.orderId);
    const allSelected = ids.every((id) => selectedOrders.has(id));
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleMarkReturned = async () => {
    const ids = Array.from(selectedOrders);
    if (ids.length === 0) return;
    try {
      await batchUpdateMutation.mutateAsync({ orderIds: ids, newStatus: OrderStatus.ReturnFromHallmark });
      toast.success(`${ids.length} order(s) marked as Returned from Hallmark`);
      setSelectedOrders(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? (err as Error).message : 'Failed to update orders';
      toast.error(message);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(filtered, 'hallmark-orders');
    toast.success('Excel export started');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(filtered, 'hallmark-orders');
      toast.success('PDF export started');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPEG = async () => {
    setIsExporting(true);
    try {
      await exportToJPEG(filtered, 'hallmark-orders');
      toast.success('JPEG export started');
    } catch {
      toast.error('JPEG export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  if (isLoading && !propOrders) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search orders…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-48"
        />
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="RB">RB</SelectItem>
            <SelectItem value="SO">SO</SelectItem>
            <SelectItem value="CO">CO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={karigarFilter} onValueChange={setKarigarFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Karigars</SelectItem>
            {uniqueKarigars.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filtered.length === 0 || isExporting}
            className="gap-1"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={filtered.length === 0 || isExporting}
            className="gap-1"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJPEG}
            disabled={filtered.length === 0 || isExporting}
            className="gap-1"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
            JPEG
          </Button>

          {selectedOrders.size > 0 && (
            <Button
              size="sm"
              onClick={handleMarkReturned}
              disabled={batchUpdateMutation.isPending}
              className="gap-1"
            >
              {batchUpdateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Mark {selectedOrders.size} as Returned
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-white/60">
        {filtered.length} order(s) across {grouped.size} design(s)
      </div>

      {/* Grouped rows */}
      {grouped.size === 0 ? (
        <div className="text-center py-12 text-white/50">No hallmark orders found.</div>
      ) : (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([design, orders]) => {
            const isExpanded = expandedGroups.has(design);
            const groupIds = orders.map((o) => o.orderId);
            const allGroupSelected = groupIds.every((id) => selectedOrders.has(id));
            const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
            const totalQty = orders.reduce((s, o) => s + Number(o.quantity), 0);
            const karigarName = orders[0]?.karigarName || "";
            const genericName = orders[0]?.genericName || "";

            return (
              <div key={design} className="rounded-lg border border-white/10 bg-zinc-900 overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleGroup(design)}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={allGroupSelected}
                      onCheckedChange={() => toggleGroupSelection(orders)}
                    />
                  </div>
                  <button className="text-white/50" onClick={e => { e.stopPropagation(); toggleGroup(design); }}>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {/* Design code — clickable for image */}
                  <button
                    className="font-bold text-orange-400 text-sm hover:text-orange-300 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(design);
                    }}
                  >
                    {design}
                  </button>
                  {genericName && (
                    <span className="text-xs text-white/60">{genericName}</span>
                  )}
                  {karigarName && (
                    <span className="text-xs border border-white/20 rounded-full px-2 py-0.5 font-semibold text-white/90 bg-white/10">
                      {karigarName}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs text-white/60">
                    <span>{orders.length} orders</span>
                    <span>{totalQty} qty</span>
                    <span>{totalWeight.toFixed(2)}g</span>
                  </div>
                </div>

                {/* Expanded order rows */}
                {isExpanded && (
                  <div className="border-t border-white/10 divide-y divide-white/5">
                    {orders.map((order) => (
                      <div key={order.orderId} className="flex items-center gap-2 px-3 py-3 bg-zinc-950/50">
                        <Checkbox
                          checked={selectedOrders.has(order.orderId)}
                          onCheckedChange={() => toggleOrderSelection(order.orderId)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                              {order.orderType}
                            </Badge>
                            <span className="font-semibold text-sm text-white">{order.orderNo}</span>
                            {order.genericName && (
                              <span className="text-xs text-white/50">{order.genericName}</span>
                            )}
                          </div>
                          <div className="text-xs text-white/50 mt-0.5">
                            Qty: {Number(order.quantity)} &nbsp; Wt: {order.weight.toFixed(3)}g
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {order.orderDate && <AgeingBadge orderDate={order.orderDate} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {imageModalDesign && (
        <DesignImageModal
          designCode={imageModalDesign}
          open={!!imageModalDesign}
          onClose={() => setImageModalDesign(null)}
        />
      )}
    </div>
  );
}

export default HallmarkTab;
