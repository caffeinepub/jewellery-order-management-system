import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetOrdersWithMappings,
  useGetUniqueKarigarsFromDesignMappings,
  useReassignDesign,
  useUpdateDesignMapping,
} from "@/hooks/useQueries";
import { Check, Edit2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

    for (const order of orders) {
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
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.designCode.localeCompare(b.designCode),
    );
  }, [orders]);

  const handleEdit = (
    designCode: string,
    genericName: string | null,
    karigarName: string | null,
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
        // movedBy is optional in useReassignDesign (defaults to "user")
        await reassignDesignMutation.mutateAsync({
          designCode,
          newKarigar: editKarigarName.trim(),
          movedBy: "user",
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
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update design mapping";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-6">
        <p className="text-muted-foreground">Loading unmapped orders...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Unmapped Design Codes
        </h1>
        <p className="text-muted-foreground mt-2">
          Orders with missing Generic Name or Karigar assignments
        </p>
      </div>

      {unmappedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              All design codes are mapped. No action required.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Unmapped Designs ({unmappedGroups.length})</CardTitle>
            <CardDescription>
              Click Edit to assign Generic Name and Karigar for each design code
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
                    <TableHead>Missing</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
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
                            className="h-8 text-sm w-40"
                            placeholder="Generic name"
                          />
                        ) : (
                          <span
                            className={
                              group.genericName
                                ? ""
                                : "text-muted-foreground italic"
                            }
                          >
                            {group.genericName || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <Select
                            value={editKarigarName}
                            onValueChange={setEditKarigarName}
                          >
                            <SelectTrigger className="h-8 text-sm w-40">
                              <SelectValue placeholder="Select karigar" />
                            </SelectTrigger>
                            <SelectContent>
                              {karigars.filter(Boolean).map((k) => (
                                <SelectItem key={k} value={k}>
                                  {k}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={
                              group.karigarName
                                ? ""
                                : "text-muted-foreground italic"
                            }
                          >
                            {group.karigarName || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-destructive">
                          {group.missingFields.join(", ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {group.count}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(group.designCode)}
                              disabled={
                                updateDesignMappingMutation.isPending ||
                                reassignDesignMutation.isPending
                              }
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleEdit(
                                group.designCode,
                                group.genericName,
                                group.karigarName,
                              )
                            }
                            className="h-7 px-2"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
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
