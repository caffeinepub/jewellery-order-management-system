import { useState } from 'react';
import { useGetUnmappedOrders, useUpdateUnmappedOrder } from '@/hooks/useQueries';
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
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function UnmappedCodes() {
  const { data: unmappedOrders = [], isLoading } = useGetUnmappedOrders();
  const updateMutation = useUpdateUnmappedOrder();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    genericName: string;
    karigarName: string;
  }>({ genericName: '', karigarName: '' });

  // Group by design code
  const groupedOrders = unmappedOrders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = {
        designCode: order.design,
        genericName: order.genericName || '',
        karigarName: order.karigarName || '',
        count: 0,
      };
    }
    acc[order.design].count++;
    return acc;
  }, {} as Record<string, { designCode: string; genericName: string; karigarName: string; count: number }>);

  const handleEdit = (designCode: string, genericName: string, karigarName: string) => {
    setEditingRow(designCode);
    setEditValues({ genericName, karigarName });
  };

  const handleSave = async (designCode: string) => {
    try {
      await updateMutation.mutateAsync({
        designCode,
        genericName: editValues.genericName,
        karigarName: editValues.karigarName,
      });
      toast.success('Mapping updated successfully');
      setEditingRow(null);
    } catch (error) {
      toast.error('Failed to update mapping');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({ genericName: '', karigarName: '' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unmapped Design Codes</h1>
        <p className="text-muted-foreground">
          Design codes that are missing generic name or karigar assignment
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar Name</TableHead>
              <TableHead>Order Count</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(groupedOrders).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  All design codes are mapped!
                </TableCell>
              </TableRow>
            ) : (
              Object.values(groupedOrders).map((group) => (
                <TableRow key={group.designCode}>
                  <TableCell className="font-medium">{group.designCode}</TableCell>
                  <TableCell>
                    {editingRow === group.designCode ? (
                      <Input
                        value={editValues.genericName}
                        onChange={(e) =>
                          setEditValues({ ...editValues, genericName: e.target.value })
                        }
                        placeholder="Enter generic name"
                      />
                    ) : (
                      group.genericName || <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === group.designCode ? (
                      <Input
                        value={editValues.karigarName}
                        onChange={(e) =>
                          setEditValues({ ...editValues, karigarName: e.target.value })
                        }
                        placeholder="Enter karigar name"
                      />
                    ) : (
                      group.karigarName || <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{group.count}</TableCell>
                  <TableCell>
                    {editingRow === group.designCode ? (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSave(group.designCode)}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleEdit(group.designCode, group.genericName, group.karigarName)
                        }
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
