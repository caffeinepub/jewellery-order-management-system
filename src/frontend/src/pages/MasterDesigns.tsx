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
} from "@/hooks/useQueries";
import { ExternalBlob, MappingRecord, DesignMapping } from "@/backend";
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
      // Read the file
      const arrayBuffer = await file.arrayBuffer();
      
      // Dynamically import XLSX
      const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);
      
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      setUploadProgress(20);

      // Parse the Excel data
      const mappings: MappingRecord[] = [];
      const uniqueKarigars = new Set<string>();

      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const designCode = normalizeDesignCode(String(row[0] || "").trim());
        const genericName = String(row[1] || "").trim();
        const karigarName = String(row[2] || "").trim();

        if (designCode && genericName && karigarName) {
          mappings.push({
            designCode,
            genericName,
            karigarName,
          });
          uniqueKarigars.add(karigarName);
        }
      }

      if (mappings.length === 0) {
        toast.error("No valid mappings found in the Excel file");
        setIsUploading(false);
        return;
      }

      setUploadProgress(40);

      // Upload the Excel file as blob
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);
      await uploadMasterDesignExcelMutation.mutateAsync(blob);

      setUploadProgress(60);

      // Upload design mappings
      await uploadDesignMappingMutation.mutateAsync(mappings);

      setUploadProgress(70);

      // Update master design karigars list
      await updateMasterDesignKarigarsMutation.mutateAsync(Array.from(uniqueKarigars));

      setUploadProgress(80);

      // Assign orders to karigars
      await assignOrdersToKarigarMutation.mutateAsync(mappings);

      setUploadProgress(100);

      // Count newly mapped orders
      const mappedDesignCodes = new Set(mappings.map((m) => m.designCode));
      const newlyMappedOrders = allOrders.filter((order) =>
        mappedDesignCodes.has(order.design)
      );

      toast.success(
        `Master Design Excel uploaded successfully! ${mappings.length} designs mapped. ${newlyMappedOrders.length} orders updated.`
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error uploading Master Design Excel:", error);
      toast.error(error?.message || "Failed to upload Master Design Excel");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditClick = (mapping: [string, DesignMapping]) => {
    const [designCode, designMapping] = mapping;
    setEditingMapping({
      designCode: designMapping.designCode,
      genericName: designMapping.genericName,
      karigarName: designMapping.karigarName,
    });
  };

  const handleSaveEdit = async (designCode: string, genericName: string, newKarigar: string) => {
    await reassignDesignMutation.mutateAsync({
      designCode,
      newKarigar,
    });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Master Designs</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage master design mappings
        </p>
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Important:</strong> Upload the Master Design Excel file before ingesting orders.
          This file should contain three columns: Design Code, Generic Name, and Karigar Name.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Master Design Excel</CardTitle>
          <CardDescription>
            Upload an Excel file with design codes, generic names, and karigar assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-design-file">Excel File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="master-design-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-gold hover:bg-gold-hover"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Expected format: Column 1 = Design Code, Column 2 = Generic Name, Column 3 = Karigar Name
            </p>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading and processing...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gold h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {masterDesignExcel && !isUploading && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-900 dark:text-green-100">
                Master Design Excel file uploaded
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {masterDesignMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Master Design Mappings</CardTitle>
            <CardDescription>
              {masterDesignMappings.length} design{masterDesignMappings.length !== 1 ? "s" : ""} mapped
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar Name</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterDesignMappings.map((mapping) => {
                    const [designCode, designMapping] = mapping;
                    return (
                      <TableRow key={designCode}>
                        <TableCell className="font-medium">{designMapping.designCode}</TableCell>
                        <TableCell>{designMapping.genericName}</TableCell>
                        <TableCell>{designMapping.karigarName}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(mapping)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editingMapping && (
        <EditDesignModal
          open={!!editingMapping}
          onOpenChange={(open) => !open && setEditingMapping(null)}
          designCode={editingMapping.designCode}
          genericName={editingMapping.genericName}
          currentKarigar={editingMapping.karigarName}
          availableKarigars={availableKarigars}
          onSave={handleSaveEdit}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
