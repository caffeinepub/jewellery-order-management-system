import { useState } from 'react';
import { useGetOrders, useUpdateUnmappedOrder } from '@/hooks/useQueries';
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
  const { data: allOrders = [], isLoading } = useGetOrders();
  const updateMutation = useUpdateUnmappedOrder();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    genericName: string;
    karigarName: string;
  }>({ genericName: '', karigarName: '' });

  // Filter unmapped orders and group by design code
  const unmappedOrders = allOrders.filter(
    (order) => !order.genericName || !order.karigarName
  );

  const groupedOrders = unmappedOrders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = {
        designCode: order.design,
        genericName: order.genericName || '',
        karigarName: order.karigarName || '',
        count: 0,
        missingFields: [] as string[],
      };
    }
    acc[order.design].count++;
    
    // Track which fields are missing
    const missing: string[] = [];
    if (!order.genericName) missing.push('Generic Name');
    if (!order.karigarName) missing.push('Karigar Name');
    acc[order.design].missingFields = missing;
    
    return acc;
  }, {} as Record<string, { designCode: string; genericName: string; karigarName: string; count: number; missingFields: string[] }>);

  const handleEdit = (designCode: string, genericName: string, karigarName: string) => {
    setEditingRow(designCode);
    setEditValues({ genericName, karigarName });
  };

  const handleSave = async (designCode: string) => {
    if (!editValues.genericName.trim() || !editValues.karigarName.trim()) {
      toast.error('Both Generic Name and Karigar Name are required');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        designCode,
        genericName: editValues.genericName.trim(),
        karigarName: editValues.karigarName.trim(),
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
          Design codes from orders that are missing generic name or karigar assignment
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar Name</TableHead>
              <TableHead>Missing Fields</TableHead>
              <TableHead>Order Count</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(groupedOrders).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  All design codes are mapped!
                </TableCell>
              </TableRow>
            ) : (
              Object.values(groupedOrders).map((group) => (
                <TableRow key={group.designCode} className="bg-amber-50/50 dark:bg-amber-950/10">
                  <TableCell className="font-medium">{group.designCode}</TableCell>
                  <TableCell>
                    {editingRow === group.designCode ? (
                      <Input
                        value={editValues.genericName}
                        onChange={(e) =>
                          setEditValues({ ...editValues, genericName: e.target.value })
                        }
                        placeholder="Enter generic name"
                        className="h-8"
                      />
                    ) : (
                      group.genericName || <span className="text-muted-foreground italic text-sm"></span>
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
                        className="h-8"
                      />
                    ) : (
                      group.karigarName || <span className="text-muted-foreground italic text-sm"></span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-amber-700 dark:text-amber-400 text-sm">
                      {group.missingFields.join(', ')}
                    </span>
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
                          className="h-8 w-8"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={updateMutation.isPending}
                          className="h-8 w-8"
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
