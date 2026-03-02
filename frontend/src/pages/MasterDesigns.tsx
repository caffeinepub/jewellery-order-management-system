import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadDesignMapping,
  useAssignOrdersToKarigar,
  useUpdateMasterDesignKarigars,
  useGetAllMasterDesignMappings,
  useGetAllOrders,
  useReassignDesign,
  useGetUniqueKarigarsFromDesignMappings,
  useAddKarigar,
  useUpdateDesignMapping,
} from "@/hooks/useQueries";
import { MappingRecord } from "@/backend";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";

// Normalize design code: uppercase, trim
function normalizeDesignCode(code: string): string {
  return code.toUpperCase().trim();
}

export default function MasterDesigns() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMapping, setEditingMapping] = useState<{
    designCode: string;
    genericName: string;
    karigarName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDesignMappingMutation = useUploadDesignMapping();
  const assignOrdersToKarigarMutation = useAssignOrdersToKarigar();
  const updateMasterDesignKarigarsMutation = useUpdateMasterDesignKarigars();
  const reassignDesignMutation = useReassignDesign();
  const updateDesignMappingMutation = useUpdateDesignMapping();
  const addKarigarMutation = useAddKarigar();
  const { data: masterDesignMappings = [] } = useGetAllMasterDesignMappings();
  const { data: allOrders = [] } = useGetAllOrders();
  const { data: availableKarigars = [] } = useGetUniqueKarigarsFromDesignMappings();

  // Suppress unused variable warnings for mutations not directly called in JSX
  void assignOrdersToKarigarMutation;
  void reassignDesignMutation;
  void updateDesignMappingMutation;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Dynamically import XLSX from CDN
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const XLSX: any = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs" as string);

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      setUploadProgress(20);

      const mappings: MappingRecord[] = [];
      const uniqueKarigars = new Set<string>();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const designCode = normalizeDesignCode(String(row[0] || "").trim());
        const genericName = String(row[1] || "").trim();
        const karigarName = String(row[2] || "").trim();

        if (!designCode || !genericName || !karigarName) continue;

        mappings.push({ designCode, genericName, karigarName });
        uniqueKarigars.add(karigarName);
      }

      setUploadProgress(40);

      if (mappings.length === 0) {
        toast.error("No valid mappings found in the Excel file");
        return;
      }

      // Add karigars first
      for (const karigar of uniqueKarigars) {
        try {
          await addKarigarMutation.mutateAsync(karigar);
        } catch {
          // karigar may already exist
        }
      }

      setUploadProgress(60);

      // Upload design mappings
      await uploadDesignMappingMutation.mutateAsync(mappings);

      setUploadProgress(80);

      // Update master design karigars list
      await updateMasterDesignKarigarsMutation.mutateAsync(Array.from(uniqueKarigars));

      setUploadProgress(100);
      toast.success(`Successfully uploaded ${mappings.length} design mappings`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload master design";
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEditMapping = (designCode: string, genericName: string, karigarName: string) => {
    setEditingMapping({ designCode, genericName, karigarName });
  };

  // Count orders per design code
  const orderCountByDesign = allOrders.reduce<Record<string, number>>((acc, order) => {
    const code = normalizeDesignCode(order.design);
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  // Deduplicate available karigars for the modal
  const uniqueKarigarList = Array.from(new Set(availableKarigars.filter(Boolean)));

  // Filter mappings by search query
  const filteredMappings = masterDesignMappings.filter(([code, mapping]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      mapping.genericName.toLowerCase().includes(q) ||
      mapping.karigarName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Master Designs</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage master design mappings for karigar assignments
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Master Design Excel
          </CardTitle>
          <CardDescription>
            Upload an Excel file with columns: Design Code, Generic Name, Karigar Name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Choose Excel File</span>
              </div>
            </Label>
            <Input
              id="excel-upload"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Excel format: Column A = Design Code, Column B = Generic Name, Column C = Karigar Name
          </p>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Design Mappings ({masterDesignMappings.length})</CardTitle>
          <CardDescription>
            All design codes with their generic names and karigar assignments
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by design code, generic name, or karigar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {masterDesignMappings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No design mappings found. Upload a master design Excel file to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map(([code, mapping]) => (
                    <TableRow key={code}>
                      <TableCell className="font-mono font-bold text-primary">
                        {code}
                      </TableCell>
                      <TableCell>{mapping.genericName}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                          {mapping.karigarName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {orderCountByDesign[normalizeDesignCode(code)] || 0}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleEditMapping(code, mapping.genericName, mapping.karigarName)}
                        >
                          Edit
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

      {/* Edit Modal */}
      {editingMapping && (
        <EditDesignModal
          open={!!editingMapping}
          onOpenChange={(open) => { if (!open) setEditingMapping(null); }}
          designCode={editingMapping.designCode}
          genericName={editingMapping.genericName}
          currentKarigar={editingMapping.karigarName}
          karigars={uniqueKarigarList}
        />
      )}
    </div>
  );
}
