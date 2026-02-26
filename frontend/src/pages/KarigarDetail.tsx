import { useMemo, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useGetAllOrders, useMarkOrdersAsReady } from "@/hooks/useQueries";
import { OrderTable } from "@/components/dashboard/OrderTable";
import {
  exportKarigarOrdersToPDF,
  exportKarigarOrdersToJPEG,
  exportKarigarOrdersToExcel,
} from "@/utils/exportUtils";
import { SuppliedQtyDialog } from "@/components/dashboard/SuppliedQtyDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Image, Download } from "lucide-react";
import { Order, OrderStatus, OrderType } from "@/backend";
import { normalizeOrders } from "@/utils/orderNormalizer";
import { computeAgeingTiers } from "@/utils/ageingUtils";
import OverdueFilterControl, {
  OverdueSortDirection,
  OverdueFilterThreshold,
} from "@/components/dashboard/OverdueFilterControl";
import { toast } from "sonner";

export function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();

  const { data: rawOrders, isLoading } = useGetAllOrders();
  const markReadyMutation = useMarkOrdersAsReady();

  const [showSupplyDialog, setShowSupplyDialog] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [overdueSort, setOverdueSort] = useState<OverdueSortDirection>(null);
  const [overdueFilterThreshold, setOverdueFilterThreshold] = useState<OverdueFilterThreshold>(null);

  const orders = rawOrders ? normalizeOrders(rawOrders) : [];

  const karigarOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === OrderStatus.Pending &&
        (o.karigarName === name || (!o.karigarName && name === "Unassigned"))
    );
  }, [orders, name]);

  const filteredOrders = useMemo(() => {
    let result = karigarOrders;

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
  }, [karigarOrders, overdueSort, overdueFilterThreshold]);

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

  const handleMarkReady = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const selectedOrders = filteredOrders.filter((o) => selectedIds.includes(o.orderId));
    const rbOrders = selectedOrders.filter((o) => o.orderType === OrderType.RB);
    if (rbOrders.length > 0) {
      setSupplyOrders(rbOrders);
      setShowSupplyDialog(true);
    } else {
      try {
        await markReadyMutation.mutateAsync(selectedIds);
        toast.success(`${selectedIds.length} order(s) marked as ready`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark orders as ready");
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportKarigarOrdersToPDF(name, filteredOrders);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  const handleExportJPEG = async () => {
    try {
      await exportKarigarOrdersToJPEG(name, filteredOrders);
      toast.success("JPEG exported successfully");
    } catch {
      toast.error("Failed to export JPEG");
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportKarigarOrdersToExcel(name, filteredOrders);
      toast.success("Excel exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  const handleOverdueClear = () => {
    setOverdueSort(null);
    setOverdueFilterThreshold(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-bold font-playfair text-foreground flex-1">
          {name} — Pending Orders ({filteredOrders.length})
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <OverdueFilterControl
            sortDirection={overdueSort}
            filterThreshold={overdueFilterThreshold}
            onSortChange={setOverdueSort}
            onFilterChange={setOverdueFilterThreshold}
            onClear={handleOverdueClear}
          />
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileText className="h-3 w-3 mr-1" />
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportJPEG}>
            <Image className="h-3 w-3 mr-1" />
            JPEG
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <Download className="h-3 w-3 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <OrderTable
        orders={filteredOrders}
        showCheckboxes
        showMarkReady
        showDelete
        showExport
        ageingTiers={ageingTiers}
      />

      {showSupplyDialog && supplyOrders.length > 0 && (
        <SuppliedQtyDialog
          orders={supplyOrders}
          onClose={() => {
            setShowSupplyDialog(false);
            setSupplyOrders([]);
          }}
        />
      )}
    </div>
  );
}
