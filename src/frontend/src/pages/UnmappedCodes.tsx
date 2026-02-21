import { useState } from 'react';
import { useGetUnmappedOrders, useUpdateUnmappedOrder } from '@/hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function UnmappedCodes() {
  const { data: orders = [], isLoading } = useGetUnmappedOrders();
  const updateOrder = useUpdateUnmappedOrder();
  const [editingData, setEditingData] = useState<Record<string, { genericName: string; karigarName: string }>>({});

  const handleInputChange = (orderId: string, field: 'genericName' | 'karigarName', value: string) => {
    setEditingData((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (orderId: string) => {
    const data = editingData[orderId];
    if (!data?.genericName || !data?.karigarName) {
      toast.error('Please fill in both Generic Name and Karigar Name');
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId,
        genericName: data.genericName,
        karigarName: data.karigarName,
      });
      toast.success('Order mapped successfully');
      setEditingData((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  return (
    <div className="container px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Unmapped Codes</h1>
        <p className="text-muted-foreground mt-1">
          Assign Generic Name and Karigar to orders without matching design mappings
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Unmapped Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading unmapped orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No unmapped orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                All orders have been successfully mapped!
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No</TableHead>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar Name</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="font-medium">{order.orderNo}</TableCell>
                      <TableCell>{order.design}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Enter generic name"
                          value={editingData[order.orderId]?.genericName || ''}
                          onChange={(e) =>
                            handleInputChange(order.orderId, 'genericName', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Enter karigar name"
                          value={editingData[order.orderId]?.karigarName || ''}
                          onChange={(e) =>
                            handleInputChange(order.orderId, 'karigarName', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleSave(order.orderId)}
                          disabled={updateOrder.isPending}
                          size="sm"
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
