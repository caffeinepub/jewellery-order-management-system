import { useMemo, useState } from "react";
import { useGetOrdersWithMappings, useSaveDesignMapping, useReassignDesign } from '@/hooks/useQueries';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGetUniqueKarigarsFromDesignMappings } from "@/hooks/useQueries";
import { Check, X, Edit2 } from "lucide-react";

interface UnmappedGroup {
  designCode: string;
  genericName: string | null;
  karigarName: string | null;
  missingFields: string[];
  count: number;
}

export default function UnmappedCodes() {
  const { data: orders = [], isLoading } = useGetOrdersWithMappings();
  const { data: karigars = [] } = useGetUniqueKarigarsFromDesignMappings();
  const saveDesignMappingMutation = useSaveDesignMapping();
  const reassignDesignMutation = useReassignDesign();

  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editGenericName, setEditGenericName] = useState("");
  const [editKarigarName, setEditKarigarName] = useState("");

  const unmappedGroups = useMemo(() => {
    const groups = new Map<string, UnmappedGroup>();

    orders.forEach((order) => {
      const missingFields: string[] = [];
      if (!order.genericName) missingFields.push("Generic Name");
      if (!order.karigarName) missingFields.push("Karigar");

      if (missingFields.length > 0) {
        const existing = groups.get(order.design);
        if (existing) {
          existing.count++;
        } else {
          groups.set(order.design, {
            designCode: order.design,
            genericName: order.genericName || null,
            karigarName: order.karigarName || null,
            missingFields,
            count: 1,
          });
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.designCode.localeCompare(b.designCode)
    );
  }, [orders]);

  const handleEdit = (designCode: string, genericName: string | null, karigarName: string | null) => {
    setEditingRow(designCode);
    setEditGenericName(genericName || "");
    setEditKarigarName(karigarName || "");
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditGenericName("");
    setEditKarigarName("");
  };

  const handleSave = async (designCode: string) => {
    if (!editGenericName.trim() || !editKarigarName.trim()) {
      toast.error("Both Generic Name and Karigar must be provided");
      return;
    }

    try {
      const group = unmappedGroups.find((g) => g.designCode === designCode);
      
      if (group?.genericName && group?.karigarName) {
        // If both fields already exist, use reassignDesign
        await reassignDesignMutation.mutateAsync({
          designCode,
          newKarigar: editKarigarName.trim(),
        });
      } else {
        // Otherwise, use saveDesignMapping
        await saveDesignMappingMutation.mutateAsync({
          designCode,
          genericName: editGenericName.trim(),
          karigarName: editKarigarName.trim(),
        });
      }

      toast.success(`Design ${designCode} updated successfully`);
      setEditingRow(null);
      setEditGenericName("");
      setEditKarigarName("");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update design mapping";
      toast.error(errorMessage);
      console.error("Error updating design mapping:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading unmapped orders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Unmapped Design Codes</h1>
        <p className="text-muted-foreground mt-2">
          Design codes with missing generic names or karigar assignments
        </p>
      </div>

      {unmappedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              All design codes are properly mapped!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Unmapped Designs</CardTitle>
            <CardDescription>
              {unmappedGroups.length} design code{unmappedGroups.length !== 1 ? "s" : ""} need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar</TableHead>
                    <TableHead>Missing Fields</TableHead>
                    <TableHead>Order Count</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedGroups.map((group) => (
                    <TableRow key={group.designCode} className="bg-amber-50/50 dark:bg-amber-950/10">
                      <TableCell className="font-medium">{group.designCode}</TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <Input
                            value={editGenericName}
                            onChange={(e) => setEditGenericName(e.target.value)}
                            placeholder="Enter generic name"
                            className="h-8"
                          />
                        ) : (
                          group.genericName || <span className="text-muted-foreground italic text-sm"></span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <Select value={editKarigarName} onValueChange={setEditKarigarName}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select karigar" />
                            </SelectTrigger>
                            <SelectContent>
                              {karigars.map((karigar) => (
                                <SelectItem key={karigar} value={karigar}>
                                  {karigar}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          group.karigarName || <span className="text-muted-foreground italic text-sm"></span>
                        )}
                      </TableCell>
                      <TableCell className="text-amber-700 dark:text-amber-300 text-sm">
                        {group.missingFields.join(', ')}
                      </TableCell>
                      <TableCell>{group.count}</TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(group.designCode)}
                              disabled={
                                saveDesignMappingMutation.isPending ||
                                reassignDesignMutation.isPending
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              disabled={
                                saveDesignMappingMutation.isPending ||
                                reassignDesignMutation.isPending
                              }
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleEdit(group.designCode, group.genericName, group.karigarName)
                            }
                            className="h-8"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
