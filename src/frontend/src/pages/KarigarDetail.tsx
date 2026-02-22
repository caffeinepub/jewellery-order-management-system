import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetOrders } from '@/hooks/useQueries';
import { OrderTable } from '@/components/dashboard/OrderTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download } from 'lucide-react';
import { OrderStatus } from '@/backend';
import { exportKarigarToPDF } from '@/utils/exportUtils';
import { useActor } from '@/hooks/useActor';
import { toast } from 'sonner';

export default function KarigarDetail() {
  const { name } = useParams({ from: '/karigar/$name' });
  const navigate = useNavigate();
  const { data: orders = [] } = useGetOrders();
  const { actor } = useActor();

  const karigarOrders = orders.filter(
    (order) =>
      order.karigarName === name &&
      (order.status === OrderStatus.Pending || order.status === OrderStatus.ReturnFromHallmark)
  );

  const handleExportPDF = async () => {
    if (!actor) return;
    
    try {
      const getDesignImage = async (designCode: string): Promise<string | null> => {
        try {
          const blob = await actor.getDesignImage(designCode);
          if (blob) {
            return blob.getDirectURL();
          }
        } catch (error) {
          console.error(`Failed to get image for ${designCode}:`, error);
        }
        return null;
      };

      await exportKarigarToPDF(name, karigarOrders, getDesignImage);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  const totalQuantity = karigarOrders.reduce((sum, order) => sum + Number(order.quantity), 0);
  const uniqueDesigns = new Set(karigarOrders.map((o) => o.design)).size;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">{name}</h1>
        </div>
        <Button onClick={handleExportPDF} disabled={karigarOrders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{karigarOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unique Designs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueDesigns}</p>
          </CardContent>
        </Card>
      </div>

      <OrderTable orders={karigarOrders} showStatusActions={true} showExport={false} />
    </div>
  );
}
