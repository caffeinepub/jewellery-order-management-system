import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadMasterDesignExcel,
  useGetMasterDesignExcel,
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
import { MappingRecord, DesignMapping, ExternalBlob } from "@/backend";
import { normalizeDesignCode } from "@/utils/excelParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";

export default function MasterDesigns() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMapping, setEditingMapping] = useState<{
    designCode: string;
    genericName: string;
    karigarName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMasterDesignExcelMutation = useUploadMasterDesignExcel();
  const uploadDesignMappingMutation = useUploadDesignMapping();
  const assignOrdersToKarigarMutation = useAssignOrdersToKarigar();
  const updateMasterDesignKarigarsMutation = useUpdateMasterDesignKarigars();
  const reassignDesignMutation = useReassignDesign();
  const updateDesignMappingMutation = useUpdateDesignMapping();
  const addKarigarMutation = useAddKarigar();
  const { data: masterDesignExcel } = useGetMasterDesignExcel();
  const { data: masterDesignMappings = [] } = useGetAllMasterDesignMappings();
  const { data: allOrders = [] } = useGetAllOrders();
  const { data: availableKarigars = [] } = useGetUniqueKarigarsFromDesignMappings();

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

      // Dynamically import XLSX
      const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
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

      // Upload the raw Excel file for reference as an ExternalBlob
      const uint8Data = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
      const excelBlob = ExternalBlob.fromBytes(uint8Data);
      await uploadMasterDesignExcelMutation.mutateAsync(excelBlob);

      setUploadProgress(100);
      toast.success(`Successfully uploaded ${mappings.length} design mappings`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload master design";
      toast.error(message);
      console.error("Upload error:", error);
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

  const handleSaveMapping = async (
    designCode: string,
    genericName: string,
    newKarigar: string
  ) => {
    await updateDesignMappingMutation.mutateAsync({
      designCode,
      newGenericName: genericName,
      newKarigarName: newKarigar,
    });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  // Count orders per design code
  const orderCountByDesign = allOrders.reduce<Record<string, number>>((acc, order) => {
    const code = normalizeDesignCode(order.design);
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

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
          {masterDesignExcel && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A master design Excel file has been previously uploaded. Uploading a new file will
                update all mappings.
              </AlertDescription>
            </Alert>
          )}

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
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      {masterDesignMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Design Mappings ({masterDesignMappings.length})</CardTitle>
            <CardDescription>
              Current design code to generic name and karigar mappings
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
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterDesignMappings.map(([designCode, mapping]: [string, DesignMapping]) => (
                    <TableRow key={designCode}>
                      <TableCell className="font-mono font-medium">{designCode}</TableCell>
                      <TableCell>{mapping.genericName}</TableCell>
                      <TableCell>{mapping.karigarName}</TableCell>
                      <TableCell className="text-right">
                        {orderCountByDesign[normalizeDesignCode(designCode)] || 0}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleEditMapping(
                              designCode,
                              mapping.genericName,
                              mapping.karigarName
                            )
                          }
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {masterDesignMappings.length === 0 && !isUploading && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No design mappings found. Upload a master design Excel file to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {editingMapping && (
        <EditDesignModal
          open={!!editingMapping}
          onOpenChange={(open) => {
            if (!open) setEditingMapping(null);
          }}
          designCode={editingMapping.designCode}
          genericName={editingMapping.genericName}
          currentKarigar={editingMapping.karigarName}
          availableKarigars={availableKarigars}
          onSave={handleSaveMapping}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
