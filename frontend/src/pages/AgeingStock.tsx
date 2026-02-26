import { useState, useMemo } from 'react';
import { Clock, CheckCircle2, ChevronDown, ChevronRight, Loader2, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllOrders, useMarkOrdersAsReady } from '@/hooks/useQueries';
import { OrderStatus, OrderType } from '@/backend';
import type { Order } from '@/backend';
import SuppliedQtyDialog from '@/components/dashboard/SuppliedQtyDialog';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert backend Time (nanoseconds bigint) to epoch milliseconds */
function nanoToMs(nano: bigint): number {
  return Number(nano / BigInt(1_000_000));
}

/** Compute age in whole days from a timestamp (ms) to today */
function daysAgo(epochMs: number): number {
  const diff = Date.now() - epochMs;
  if (diff < 0) return 0; // future date — treat as 0 days
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

type AgeBand = 'green' | 'yellow' | 'red' | 'none';

function getAgeBand(days: number | null): AgeBand {
  if (days === null) return 'none';
  if (days <= 7) return 'green';
  if (days <= 15) return 'yellow';
  return 'red';
}

const ageBandClasses: Record<AgeBand, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  none: 'bg-muted text-muted-foreground border-border',
};

const ageBandRowClasses: Record<AgeBand, string> = {
  green: 'border-l-4 border-l-emerald-400',
  yellow: 'border-l-4 border-l-amber-400',
  red: 'border-l-4 border-l-red-400',
  none: 'border-l-4 border-l-muted',
};

interface EnrichedOrder extends Order {
  ageMs: number | null;
  ageDays: number | null;
  ageBand: AgeBand;
}

interface DesignGroup {
  designCode: string;
  genericName: string | undefined;
  karigarName: string | undefined;
  orders: EnrichedOrder[];
  totalQty: number;
  totalWeight: number;
}

/** Safely extract orderDate as epoch ms, returning null for missing/invalid values */
function safeOrderDateMs(order: Order): number | null {
  try {
    const od = order.orderDate;
    // undefined or null → no date
    if (od == null) return null;
    const ms = nanoToMs(od);
    // Guard against NaN or unreasonable values (before year 2000 or after year 2100)
    if (isNaN(ms) || ms < 946684800000 || ms > 4102444800000) return null;
    return ms;
  } catch {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AgeingStock() {
  const { data: allOrders = [], isLoading } = useGetAllOrders();
  const markReadyMutation = useMarkOrdersAsReady();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [rbOrdersForDialog, setRbOrdersForDialog] = useState<Order[]>([]);

  // ── Derive pending orders enriched with age data ──────────────────────────
  const groups = useMemo<DesignGroup[]>(() => {
    const pending = allOrders.filter(o => o.status === OrderStatus.Pending);

    // Enrich with age — all date operations are guarded
    const enriched: EnrichedOrder[] = pending.map(o => {
      const ageMs = safeOrderDateMs(o);
      const ageDays = ageMs !== null ? daysAgo(ageMs) : null;
      return { ...o, ageMs, ageDays, ageBand: getAgeBand(ageDays) };
    });

    // Group by design code
    const groupMap = new Map<string, EnrichedOrder[]>();
    for (const order of enriched) {
      const key = order.design || 'UNKNOWN';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(order);
    }

    // Sort within each group: oldest first (null dates go to bottom)
    const result: DesignGroup[] = [];
    for (const [designCode, orders] of groupMap.entries()) {
      orders.sort((a, b) => {
        if (a.ageMs === null && b.ageMs === null) return 0;
        if (a.ageMs === null) return 1;  // nulls to bottom
        if (b.ageMs === null) return -1;
        return a.ageMs - b.ageMs; // oldest (smallest ms = furthest in past) first
      });

      const totalQty = orders.reduce((s, o) => s + Number(o.quantity), 0);
      const totalWeight = orders.reduce((s, o) => s + o.weight * Number(o.quantity), 0);
      const sample = orders[0];

      result.push({
        designCode,
        genericName: sample?.genericName ?? undefined,
        karigarName: sample?.karigarName ?? undefined,
        orders,
        totalQty,
        totalWeight,
      });
    }

    // Sort groups by oldest order date across the group (oldest group first, no-date groups last)
    result.sort((a, b) => {
      const aOldest = a.orders.find(o => o.ageMs !== null)?.ageMs ?? null;
      const bOldest = b.orders.find(o => o.ageMs !== null)?.ageMs ?? null;
      if (aOldest === null && bOldest === null) return a.designCode.localeCompare(b.designCode);
      if (aOldest === null) return 1;
      if (bOldest === null) return -1;
      return aOldest - bOldest; // oldest (smallest ms) first
    });

    return result;
  }, [allOrders]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleOrder = (orderId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleGroup = (designCode: string, orders: EnrichedOrder[]) => {
    const allSelected = orders.every(o => selectedIds.has(o.orderId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        orders.forEach(o => next.delete(o.orderId));
      } else {
        orders.forEach(o => next.add(o.orderId));
      }
      return next;
    });
  };

  const toggleExpanded = (designCode: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(designCode)) next.delete(designCode);
      else next.add(designCode);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = groups.flatMap(g => g.orders.map(o => o.orderId));
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Mark Ready handler ────────────────────────────────────────────────────
  const handleMarkReady = async () => {
    if (selectedIds.size === 0) return;

    const selectedOrders = groups
      .flatMap(g => g.orders)
      .filter(o => selectedIds.has(o.orderId));

    const rbOrders = selectedOrders.filter(o => o.orderType === OrderType.RB);
    const nonRbOrders = selectedOrders.filter(o => o.orderType !== OrderType.RB);

    // Process non-RB orders immediately
    if (nonRbOrders.length > 0) {
      try {
        await markReadyMutation.mutateAsync(nonRbOrders.map(o => o.orderId));
        toast.success(`${nonRbOrders.length} order${nonRbOrders.length > 1 ? 's' : ''} marked as Ready`);
        setSelectedIds(prev => {
          const next = new Set(prev);
          nonRbOrders.forEach(o => next.delete(o.orderId));
          return next;
        });
      } catch {
        // error toast handled by mutation
      }
    }

    // Route RB orders through SuppliedQtyDialog
    if (rbOrders.length > 0) {
      setRbOrdersForDialog(rbOrders);
    }
  };

  const handleDialogClose = () => {
    setRbOrdersForDialog([]);
    setSelectedIds(new Set());
  };

  // ── Derived counts (only orders with valid dates count toward age bands) ──
  const allPendingOrders = groups.flatMap(g => g.orders);
  const totalPending = allPendingOrders.length;
  const ordersWithDate = allPendingOrders.filter(o => o.ageDays !== null);
  const ordersWithoutDate = allPendingOrders.filter(o => o.ageDays === null);
  const freshCount = ordersWithDate.filter(o => o.ageBand === 'green').length;
  const ageingCount = ordersWithDate.filter(o => o.ageBand === 'yellow').length;
  const overdueCount = ordersWithDate.filter(o => o.ageBand === 'red').length;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-7 w-7 text-gold" />
            Ageing Stock
          </h1>
          <p className="text-muted-foreground mt-1">
            Pending orders grouped by Design Code, sorted oldest-first (FIFO)
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={markReadyMutation.isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleMarkReady}
              disabled={markReadyMutation.isPending}
              className="bg-gold hover:bg-gold-hover text-gold-foreground"
            >
              {markReadyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Ready ({selectedIds.size})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">Total Pending</p>
            <p className="text-3xl font-bold mt-1">{totalPending}</p>
            <p className="text-xs text-muted-foreground mt-1">{groups.length} design groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">🟢 Fresh (0–7 days)</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{freshCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">🟡 Ageing (8–15 days)</p>
            <p className="text-3xl font-bold mt-1 text-amber-600">{ageingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">🔴 Overdue (16+ days)</p>
            <p className="text-3xl font-bold mt-1 text-red-600">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* No-date notice */}
      {ordersWithoutDate.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <CalendarX className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{ordersWithoutDate.length}</strong> order{ordersWithoutDate.length > 1 ? 's' : ''} have no order date and are excluded from age-band counts.
            Upload orders with an <em>Order Date</em> column to enable ageing tracking.
          </span>
        </div>
      )}

      {/* Select all / clear */}
      {totalPending > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2">
            Select All
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
              Clear Selection
            </Button>
          )}
          <span className="text-muted-foreground ml-auto">
            {selectedIds.size} of {totalPending} selected
          </span>
        </div>
      )}

      {/* Empty state */}
      {totalPending === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Pending Orders</h3>
            <p className="text-muted-foreground mt-1">All orders have been processed. Great work!</p>
          </CardContent>
        </Card>
      )}

      {/* Design groups */}
      <div className="space-y-3">
        {groups.map(group => {
          const isExpanded = expandedGroups.has(group.designCode);
          const allGroupSelected = group.orders.every(o => selectedIds.has(o.orderId));
          const someGroupSelected = group.orders.some(o => selectedIds.has(o.orderId));
          // Oldest order's age band drives the group indicator
          const groupBand = group.orders[0]?.ageBand ?? 'none';

          return (
            <Card key={group.designCode} className={`overflow-hidden ${ageBandRowClasses[groupBand]}`}>
              {/* Group header */}
              <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleExpanded(group.designCode)}>
                <div className="flex items-center gap-3">
                  {/* Group checkbox */}
                  <div onClick={e => { e.stopPropagation(); toggleGroup(group.designCode, group.orders); }}>
                    <Checkbox
                      checked={allGroupSelected}
                      data-state={someGroupSelected && !allGroupSelected ? 'indeterminate' : undefined}
                      className="mt-0.5"
                    />
                  </div>

                  {/* Expand icon */}
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  }

                  {/* Design info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{group.designCode}</span>
                      {group.genericName && (
                        <span className="text-xs text-muted-foreground truncate">{group.genericName}</span>
                      )}
                      {group.karigarName && (
                        <Badge variant="outline" className="text-xs h-5">{group.karigarName}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                    <span>{group.orders.length} order{group.orders.length > 1 ? 's' : ''}</span>
                    <span>Qty: {group.totalQty}</span>
                    <span>Wt: {group.totalWeight.toFixed(2)}g</span>
                  </div>
                </div>
              </CardHeader>

              {/* Order rows */}
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {group.orders.map((order, idx) => {
                      const isSelected = selectedIds.has(order.orderId);
                      const band = order.ageBand;

                      return (
                        <div
                          key={order.orderId}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-muted/60' : ''}`}
                        >
                          {/* FIFO rank */}
                          <span className="text-xs text-muted-foreground w-5 text-center flex-shrink-0">
                            {idx + 1}
                          </span>

                          {/* Row checkbox */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOrder(order.orderId)}
                          />

                          {/* Order details */}
                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-xs text-muted-foreground block">Order No</span>
                              <span className="font-medium truncate">{order.orderNo}</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Product</span>
                              <span className="truncate">{order.product || '—'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Wt / Size / Qty</span>
                              <span>{order.weight}g / {order.size || '—'} / {String(order.quantity)}</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Type</span>
                              <Badge variant="outline" className="text-xs h-5">{order.orderType}</Badge>
                            </div>
                          </div>

                          {/* Age badge */}
                          <div className="flex-shrink-0">
                            {order.ageDays !== null ? (
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ageBandClasses[band]}`}>
                                {order.ageDays === 0 ? 'Today' : `${order.ageDays}d ago`}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ageBandClasses['none']}`}>
                                No date
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* RB SuppliedQtyDialog */}
      {rbOrdersForDialog.length > 0 && (
        <SuppliedQtyDialog
          orders={rbOrdersForDialog}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}
