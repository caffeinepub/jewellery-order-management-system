import { useMemo } from "react";
import { Order } from "../../backend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface UnmappedGroup {
  designCode: string;
  orderCount: number;
  orderNos: string[];
}

interface UnmappedSectionProps {
  orders: Order[];
}

export function UnmappedSection({ orders }: UnmappedSectionProps) {
  const unmappedGroups = useMemo(() => {
    const groups = orders
      .filter((o) => !o.genericName && !o.karigarName)
      .reduce<Record<string, UnmappedGroup>>((acc, order) => {
        const key = order.design;
        if (!acc[key]) {
          acc[key] = { designCode: key, orderCount: 0, orderNos: [] };
        }
        acc[key].orderCount += 1;
        if (!acc[key].orderNos.includes(order.orderNo)) {
          acc[key].orderNos.push(order.orderNo);
        }
        return acc;
      }, {});
    return Object.values(groups);
  }, [orders]);

  if (unmappedGroups.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Unmapped Design Codes ({unmappedGroups.length})</AlertTitle>
      <AlertDescription>
        <p className="mb-2 text-sm">
          The following design codes have no karigar/generic name mapping:
        </p>
        <div className="flex flex-wrap gap-2">
          {unmappedGroups.map((group) => (
            <span
              key={group.designCode}
              className="inline-flex items-center gap-1 bg-destructive/10 text-destructive rounded px-2 py-0.5 text-xs font-medium"
            >
              {group.designCode}
              <span className="opacity-70">({group.orderCount})</span>
            </span>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
