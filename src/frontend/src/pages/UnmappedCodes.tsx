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
  useGetAllDesignMappings,
  useGetUniqueKarigarsFromDesignMappings,
  useGetUnmappedOrders,
  useUpdateDesignMapping,
} from "@/hooks/useQueries";
import { Check, Edit2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface UnmappedGroup {
  designCode: string;
  count: number;
}

export default function UnmappedCodes() {
  // useGetUnmappedOrders already correctly filters orders whose design code
  // is NOT present in master design mappings — it is the source of truth.
  const { data: unmappedOrders = [], isLoading } = useGetUnmappedOrders();
  const { data: allMappings = [] } = useGetAllDesignMappings();
  const { data: karigars = [] } = useGetUniqueKarigarsFromDesignMappings();
  const updateDesignMappingMutation = useUpdateDesignMapping();

  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editGenericName, setEditGenericName] = useState("");
  const [editKarigarName, setEditKarigarName] = useState("");

  // Build a lookup from designCode (uppercased) → existing mapping
  const mappingLookup = useMemo(() => {
    const map = new Map<string, { genericName: string; karigar: string }>();
    for (const m of allMappings) {
      map.set(m.designCode.toUpperCase().trim(), {
        genericName: m.genericName,
        karigar: m.karigar,
      });
    }
    return map;
  }, [allMappings]);

  // Group unmapped orders by design code
  const unmappedGroups = useMemo((): UnmappedGroup[] => {
    const groups = new Map<string, number>();
    for (const order of unmappedOrders) {
      const code = order.design.toUpperCase().trim();
      groups.set(code, (groups.get(code) ?? 0) + 1);
    }
    return Array.from(groups.entries())
      .map(([designCode, count]) => ({ designCode, count }))
      .sort((a, b) => a.designCode.localeCompare(b.designCode));
  }, [unmappedOrders]);

  const handleEdit = (designCode: string) => {
    const existing = mappingLookup.get(designCode.toUpperCase().trim());
    setEditingRow(designCode);
    setEditGenericName(existing?.genericName ?? "");
    setEditKarigarName(existing?.karigar ?? "");
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
      // Always use updateDesignMapping (batchSaveDesignMappings) to set both
      // genericName and karigarName. This is the only reliable path since
      // order records do not carry genericName/karigarName reliably.
      await updateDesignMappingMutation.mutateAsync({
        designCode,
        newGenericName: editGenericName.trim(),
        newKarigarName: editKarigarName.trim(),
      });

      toast.success(`Design ${designCode} mapped successfully`);
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
          Orders whose design code has no entry in Master Design mappings
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
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === group.designCode ? (
                          <div className="flex flex-col gap-1">
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
                            {/* Allow typing a new karigar name if not in dropdown */}
                            <Input
                              value={editKarigarName}
                              onChange={(e) =>
                                setEditKarigarName(e.target.value)
                              }
                              className="h-8 text-sm w-40"
                              placeholder="Or type karigar name"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
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
                              disabled={updateDesignMappingMutation.isPending}
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
                            onClick={() => handleEdit(group.designCode)}
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
