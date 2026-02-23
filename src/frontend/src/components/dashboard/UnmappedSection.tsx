import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { useGetUnmappedOrders } from '@/hooks/useQueries';

export default function UnmappedSection() {
  const { data: unmappedOrders = [], isLoading } = useGetUnmappedOrders();
  const navigate = useNavigate();

  // Group unmapped orders by design code
  const unmappedDesignCodes = useMemo(() => {
    const grouped = unmappedOrders.reduce((acc, order) => {
      if (!acc[order.design]) {
        acc[order.design] = {
          designCode: order.design,
          count: 0,
          missingGenericName: !order.genericName,
          missingKarigarName: !order.karigarName,
        };
      }
      acc[order.design].count++;
      return acc;
    }, {} as Record<string, { designCode: string; count: number; missingGenericName: boolean; missingKarigarName: boolean }>);

    return Object.values(grouped);
  }, [unmappedOrders]);

  if (isLoading) {
    return null;
  }

  if (unmappedDesignCodes.length === 0) {
    return null;
  }

  const totalOrders = unmappedDesignCodes.reduce((sum, item) => sum + item.count, 0);

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">Unmapped Design Codes</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <p className="text-sm">
            {totalOrders} order(s) with {unmappedDesignCodes.length} design code(s) are missing mapping
            information.
          </p>

          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {unmappedDesignCodes.slice(0, 5).map((item) => (
              <div key={item.designCode} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-medium">{item.designCode}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.count} order(s) • Missing:{' '}
                    {item.missingGenericName && item.missingKarigarName
                      ? 'Generic Name & Karigar Name'
                      : item.missingGenericName
                      ? 'Generic Name'
                      : 'Karigar Name'}
                  </div>
                </div>
              </div>
            ))}
            {unmappedDesignCodes.length > 5 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                ... and {unmappedDesignCodes.length - 5} more design codes
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/unmapped-codes' })}
              className="bg-background"
            >
              View All Unmapped
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate({ to: '/master-designs' })}
            >
              Update Master Designs
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
