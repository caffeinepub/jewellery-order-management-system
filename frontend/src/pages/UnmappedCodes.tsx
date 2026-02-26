import { useState, useMemo } from "react";
import {
  useGetAllOrders,
  useGetAllMasterDesignMappings,
  useUpdateDesignMapping,
  useGetMasterDesignKarigars,
} from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeOrders } from "@/utils/orderNormalizer";

interface UnmappedDesign {
  designCode: string;
  orderCount: number;
  orderNos: string[];
}

export function UnmappedCodes() {
  const [editingDesign, setEditingDesign] = useState<string | null>(null);
  const [editGenericName, setEditGenericName] = useState("");
  const [editKarigarName, setEditKarigarName] = useState("");

  const { data: rawOrders, isLoading: ordersLoading } = useGetAllOrders();
  const { data: mappings } = useGetAllMasterDesignMappings();
  const { data: karigars } = useGetMasterDesignKarigars();
  const updateMappingMutation = useUpdateDesignMapping();

  const orders = rawOrders ? normalizeOrders(rawOrders) : [];

  const mappedDesignCodes = useMemo(() => {
    if (!mappings) return new Set<string>();
    return new Set(mappings.map(([code]) => code.trim().toUpperCase()));
  }, [mappings]);

  const unmappedDesigns = useMemo((): UnmappedDesign[] => {
    const groups: Record<string, UnmappedDesign> = {};
    for (const order of orders) {
      const normalizedCode = order.design?.trim().toUpperCase();
      if (!normalizedCode) continue;
      if (mappedDesignCodes.has(normalizedCode)) continue;
      if (!groups[normalizedCode]) {
        groups[normalizedCode] = {
          designCode: order.design,
          orderCount: 0,
          orderNos: [],
        };
      }
      groups[normalizedCode].orderCount += 1;
      if (!groups[normalizedCode].orderNos.includes(order.orderNo)) {
        groups[normalizedCode].orderNos.push(order.orderNo);
      }
    }
    return Object.values(groups).sort((a, b) =>
      a.designCode.localeCompare(b.designCode)
    );
  }, [orders, mappedDesignCodes]);

  const handleEditOpen = (designCode: string) => {
    setEditingDesign(designCode);
    setEditGenericName("");
    setEditKarigarName("");
  };

  const handleSave = async () => {
    if (!editingDesign || !editGenericName.trim() || !editKarigarName) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await updateMappingMutation.mutateAsync({
        designCode: editingDesign,
        genericName: editGenericName.trim(),
        karigarName: editKarigarName,
      });
      toast.success(`Mapping saved for ${editingDesign}`);
      setEditingDesign(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save mapping");
    }
  };

  if (ordersLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-playfair text-foreground">
          Unmapped Design Codes
        </h1>
        <Badge variant="secondary">{unmappedDesigns.length} unmapped</Badge>
      </div>

      {unmappedDesigns.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg font-medium">All design codes are mapped!</p>
          <p className="text-sm">No unmapped design codes found in pending orders.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Design Code</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Order Numbers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unmappedDesigns.map((design) => (
                <TableRow key={design.designCode}>
                  <TableCell className="font-medium">{design.designCode}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{design.orderCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {design.orderNos.slice(0, 5).join(", ")}
                    {design.orderNos.length > 5 && ` +${design.orderNos.length - 5} more`}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditOpen(design.designCode)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Map
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingDesign} onOpenChange={(open) => { if (!open) setEditingDesign(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Design Code: {editingDesign}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="generic-name">Generic Name</Label>
              <Input
                id="generic-name"
                value={editGenericName}
                onChange={(e) => setEditGenericName(e.target.value)}
                placeholder="Enter generic name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="karigar-select">Karigar</Label>
              <Select value={editKarigarName} onValueChange={setEditKarigarName}>
                <SelectTrigger id="karigar-select">
                  <SelectValue placeholder="Select karigar" />
                </SelectTrigger>
                <SelectContent>
                  {(karigars ?? []).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDesign(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMappingMutation.isPending}
              className="bg-gold hover:bg-gold-hover text-white"
            >
              {updateMappingMutation.isPending ? "Saving..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
