import { useMemo, useState } from "react";
import {
  useGetOrdersWithMappings,
  useUpdateDesignMapping,
  useReassignDesign,
  useGetUniqueKarigarsFromDesignMappings,
} from '@/hooks/useQueries';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  const updateDesignMappingMutation = useUpdateDesignMapping();
  const reassignDesignMutation = useReassignDesign();

  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editGenericName, setEditGenericName] = useState("");
  const [editKarigarName, setEditKarigarName] = useState("");

  const unmappedGroups = useMemo((): UnmappedGroup[] => {
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

  const handleEdit = (
    designCode: string,
    genericName: string | null,
    karigarName: string | null
  ) => {
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
        // Both fields already exist — reassign karigar
        await reassignDesignMutation.mutateAsync({
          designCode,
          newKarigar: editKarigarName.trim(),
        });
      } else {
        // Use updateDesignMapping to set both fields
        await updateDesignMappingMutation.mutateAsync({
          designCode,
          newGenericName: editGenericName.trim(),
          newKarigarName: editKarigarName.trim(),
        });
      }

      toast.success(`Design ${designCode} updated successfully`);
      setEditingRow(null);
      setEditGenericName("");
      setEditKarigarName("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update design mapping";
      toast.error(message);
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
              {unmappedGroups.length} design code{unmappedGroups.length !== 1 ? "s" : ""} need
              attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar</TableHead>
                    <TableHead>Missing Fields</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedGroups.map((group) => (
                    <TableRow key={group.designCode}>
                      <TableCell className="font-mono font-medium">
                        {group.designCode}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <Input
                            value={editGenericName}
                            onChange={(e) => setEditGenericName(e.target.value)}
                            placeholder="Generic Name"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className={!group.genericName ? "text-destructive italic" : ""}>
                            {group.genericName || "Missing"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <Select
                            value={editKarigarName}
                            onValueChange={setEditKarigarName}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select karigar" />
                            </SelectTrigger>
                            <SelectContent>
                              {karigars.map((k) => (
                                <SelectItem key={k} value={k}>
                                  {k}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={!group.karigarName ? "text-destructive italic" : ""}>
                            {group.karigarName || "Missing"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-destructive">
                          {group.missingFields.join(", ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{group.count}</TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600"
                              onClick={() => handleSave(group.designCode)}
                              disabled={
                                updateDesignMappingMutation.isPending ||
                                reassignDesignMutation.isPending
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={handleCancel}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              handleEdit(
                                group.designCode,
                                group.genericName,
                                group.karigarName
                              )
                            }
                          >
                            <Edit2 className="h-4 w-4" />
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
