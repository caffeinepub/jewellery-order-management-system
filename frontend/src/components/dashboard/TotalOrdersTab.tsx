import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  CheckSquare,
  Square,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Order, OrderStatus, OrderType } from '../../backend';
import {
  useGetAllOrders,
  useMarkOrdersAsReady,
  useDeleteOrder,
} from '../../hooks/useQueries';
import SuppliedQtyDialog from './SuppliedQtyDialog';
import DesignImageModal from './DesignImageModal';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatOrderDate(ts: bigint | undefined | null): string {
  if (!ts) return 'No date';
  const ms = Number(ts) / 1_000_000;
  if (!ms || ms <= 0) return 'No date';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function calcOverdueDays(ts: bigint | undefined | null): number | null {
  if (!ts) return null;
  const ms = Number(ts) / 1_000_000;
  if (!ms || ms <= 0) return null;
  const now = Date.now();
  const diff = now - ms;
  if (diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getOrderTypeLabel(type: OrderType): string {
  switch (type) {
    case OrderType.RB: return 'RB';
    case OrderType.CO: return 'CO';
    default: return 'SO';
  }
}

function getOverdueBadge(days: number | null) {
  if (days === null) return null;
  if (days === 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
        0d
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
        {days}d
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      {days}d
    </span>
  );
}

/* ─── types ───────────────────────────────────────────────────────────────── */

interface DesignGroup {
  designCode: string;
  genericName: string;
  karigarName: string;
  orders: Order[];
}

/* ─── component ───────────────────────────────────────────────────────────── */

export default function TotalOrdersTab() {
  const { data: allOrders = [], isLoading, isError } = useGetAllOrders();
  const markReadyMutation = useMarkOrdersAsReady();
  const deleteOrderMutation = useDeleteOrder();

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [karigarFilter, setKarigarFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplyDialogOrders, setSupplyDialogOrders] = useState<Order[]>([]);
  // Non-RB orders waiting to be marked ready after the RB dialog closes
  const [pendingNonRbIds, setPendingNonRbIds] = useState<string[]>([]);
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);
  const [pendingGroupMarkReady, setPendingGroupMarkReady] = useState<string | null>(null);

  /* filtered orders: Pending + ReturnFromHallmark */
  const visibleOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.status === OrderStatus.Pending ||
        o.status === OrderStatus.ReturnFromHallmark
    );
  }, [allOrders]);

  /* karigar list for filter */
  const karigarList = useMemo(() => {
    const set = new Set<string>();
    visibleOrders.forEach((o) => {
      if (o.karigarName) set.add(o.karigarName);
    });
    return Array.from(set).sort();
  }, [visibleOrders]);

  /* search + filter */
  const filteredOrders = useMemo(() => {
    let orders = visibleOrders;
    if (typeFilter !== 'all') {
      orders = orders.filter((o) => getOrderTypeLabel(o.orderType) === typeFilter);
    }
    if (karigarFilter !== 'all') {
      orders = orders.filter((o) => o.karigarName === karigarFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(q) ||
          o.design.toLowerCase().includes(q) ||
          (o.genericName ?? '').toLowerCase().includes(q) ||
          (o.karigarName ?? '').toLowerCase().includes(q)
      );
    }
    return orders;
  }, [visibleOrders, typeFilter, karigarFilter, searchText]);

  /* group by design code */
  const designGroups = useMemo((): DesignGroup[] => {
    const map = new Map<string, DesignGroup>();
    for (const order of filteredOrders) {
      const key = order.design;
      if (!map.has(key)) {
        map.set(key, {
          designCode: order.design,
          genericName: order.genericName ?? '',
          karigarName: order.karigarName ?? '',
          orders: [],
        });
      }
      map.get(key)!.orders.push(order);
    }

    for (const group of map.values()) {
      group.orders.sort((a, b) => {
        const daysA = calcOverdueDays(a.orderDate);
        const daysB = calcOverdueDays(b.orderDate);
        if (daysA === null && daysB === null) return 0;
        if (daysA === null) return 1;
        if (daysB === null) return -1;
        return daysB - daysA;
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.designCode.localeCompare(b.designCode)
    );
  }, [filteredOrders]);

  /* selection helpers */
  const allVisibleIds = useMemo(
    () => new Set(filteredOrders.map((o) => o.orderId)),
    [filteredOrders]
  );

  const isSelectAll = allVisibleIds.size > 0 && selectedIds.size === allVisibleIds.size;

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === allVisibleIds.size && allVisibleIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [selectedIds.size, allVisibleIds]);

  const toggleSelectGroup = useCallback(
    (group: DesignGroup) => {
      const groupIds = new Set(group.orders.map((o) => o.orderId));
      const allSelected = group.orders.every((o) => selectedIds.has(o.orderId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          groupIds.forEach((id) => next.delete(id));
        } else {
          groupIds.forEach((id) => next.add(id));
        }
        return next;
      });
    },
    [selectedIds]
  );

  const toggleSelectOrder = useCallback((orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  /* expand/collapse */
  const toggleGroup = useCallback((designCode: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(designCode)) next.delete(designCode);
      else next.add(designCode);
      return next;
    });
  }, []);

  /* shared mark-ready logic */
  async function executeMarkReady(orderIds: string[]) {
    // Use allOrders (not just filteredOrders) to find the full order objects
    const selectedOrders = allOrders.filter((o) => orderIds.includes(o.orderId));
    const rbOrders = selectedOrders.filter((o) => o.orderType === OrderType.RB);
    const nonRbOrders = selectedOrders.filter((o) => o.orderType !== OrderType.RB);

    // Process non-RB orders immediately
    if (nonRbOrders.length > 0) {
      try {
        await markReadyMutation.mutateAsync(nonRbOrders.map((o) => o.orderId));
        toast.success(`${nonRbOrders.length} order(s) marked as Ready`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          nonRbOrders.forEach((o) => next.delete(o.orderId));
          return next;
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to mark non-RB orders: ${msg}`);
      }
    }

    // Open supply dialog for RB orders (one at a time)
    if (rbOrders.length > 0) {
      // Store any remaining non-RB ids that weren't processed (shouldn't happen, but safety)
      setPendingNonRbIds([]);
      setSupplyDialogOrders(rbOrders);
    }
  }

  /* top-level mark ready (all selected) */
  async function handleMarkReady() {
    if (selectedIds.size === 0) {
      toast.error('No orders selected');
      return;
    }
    await executeMarkReady(Array.from(selectedIds));
  }

  /* per-group mark ready */
  async function handleGroupMarkReady(group: DesignGroup, e: React.MouseEvent) {
    e.stopPropagation();
    const groupSelectedIds = group.orders
      .map((o) => o.orderId)
      .filter((id) => selectedIds.has(id));

    if (groupSelectedIds.length === 0) {
      toast.error('No orders selected in this group');
      return;
    }

    setPendingGroupMarkReady(group.designCode);
    try {
      await executeMarkReady(groupSelectedIds);
    } finally {
      setPendingGroupMarkReady(null);
    }
  }

  async function handleDelete(orderId: string) {
    try {
      await deleteOrderMutation.mutateAsync(orderId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      toast.success('Order deleted');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed: ${msg}`);
    }
  }

  function handleSupplyDialogClose() {
    setSupplyDialogOrders([]);
    setPendingNonRbIds([]);
    setSelectedIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load orders. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Supply dialog for RB orders */}
      {supplyDialogOrders.length > 0 && (
        <SuppliedQtyDialog
          orders={supplyDialogOrders}
          onClose={handleSupplyDialogClose}
        />
      )}

      {/* Design image modal */}
      {imageModalDesign && (
        <DesignImageModal
          designCode={imageModalDesign}
          open={!!imageModalDesign}
          onClose={() => setImageModalDesign(null)}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order no, generic name, design code…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SO">SO</SelectItem>
              <SelectItem value="RB">RB</SelectItem>
              <SelectItem value="CO">CO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={karigarFilter} onValueChange={setKarigarFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Karigar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karigars</SelectItem>
              {karigarList.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="text-xs"
          >
            {isSelectAll ? (
              <CheckSquare className="mr-1 h-4 w-4" />
            ) : (
              <Square className="mr-1 h-4 w-4" />
            )}
            {isSelectAll ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          )}
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleMarkReady}
              disabled={markReadyMutation.isPending}
              className={isSelectAll ? 'bg-primary text-primary-foreground font-semibold' : ''}
            >
              {markReadyMutation.isPending && pendingGroupMarkReady === null && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark Ready {isSelectAll ? '(All)' : `(${selectedIds.size})`}
            </Button>
          )}
        </div>
      </div>

      {/* Groups */}
      {designGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No pending orders found
        </div>
      ) : (
        <div className="space-y-2">
          {designGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.designCode);
            const groupSelected = group.orders.every((o) => selectedIds.has(o.orderId));
            const groupPartial =
              !groupSelected && group.orders.some((o) => selectedIds.has(o.orderId));
            const groupSelectedCount = group.orders.filter((o) => selectedIds.has(o.orderId)).length;
            const totalQty = group.orders.reduce(
              (sum, o) => sum + Number(o.quantity),
              0
            );
            const totalWeight = group.orders.reduce(
              (sum, o) => sum + o.weight * Number(o.quantity),
              0
            );
            const isGroupMarkReadyPending = pendingGroupMarkReady === group.designCode;

            return (
              <div key={group.designCode} className="border rounded-lg overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(group.designCode)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={groupSelected}
                      data-state={groupPartial ? 'indeterminate' : undefined}
                      onCheckedChange={() => toggleSelectGroup(group)}
                      aria-label={`Select group ${group.designCode}`}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="font-semibold text-sm hover:underline font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageModalDesign(group.designCode);
                        }}
                      >
                        {group.designCode}
                      </button>
                      {group.genericName && (
                        <span className="text-xs text-muted-foreground">
                          {group.genericName}
                        </span>
                      )}
                      {group.karigarName && (
                        <Badge variant="secondary" className="text-xs">
                          {group.karigarName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{group.orders.length} order{group.orders.length !== 1 ? 's' : ''}</span>
                      <span>{totalQty} qty</span>
                      <span>{totalWeight.toFixed(2)}g</span>
                    </div>
                    {groupSelectedCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={isGroupMarkReadyPending || markReadyMutation.isPending}
                        onClick={(e) => handleGroupMarkReady(group, e)}
                      >
                        {isGroupMarkReadyPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCheck className="mr-1 h-3 w-3" />
                        )}
                        Mark Ready ({groupSelectedCount})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Group rows */}
                {isExpanded && (
                  <div className="divide-y">
                    {group.orders.map((order) => {
                      const isSelected = selectedIds.has(order.orderId);
                      const overdueDays = calcOverdueDays(order.orderDate);
                      const isRB = order.orderType === OrderType.RB;

                      return (
                        <div
                          key={order.orderId}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-muted/20'
                          }`}
                          onClick={() => toggleSelectOrder(order.orderId)}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectOrder(order.orderId)}
                              aria-label={`Select order ${order.orderNo}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium font-mono truncate">
                                {order.orderNo}
                              </span>
                              {isRB && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-4 border-amber-400 text-amber-600 dark:text-amber-400"
                                >
                                  RB
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.product || '—'}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Qty:</span>
                              <span className="font-medium">{Number(order.quantity)}</span>
                              <span className="text-muted-foreground">Wt:</span>
                              <span className="font-medium">
                                {(order.weight * Number(order.quantity)).toFixed(2)}g
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {formatOrderDate(order.orderDate)}
                              </span>
                              {getOverdueBadge(overdueDays)}
                            </div>
                          </div>
                          <div
                            className="flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deleteOrderMutation.isPending}
                              onClick={() => handleDelete(order.orderId)}
                              aria-label="Delete order"
                            >
                              {deleteOrderMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <span className="text-xs">✕</span>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
