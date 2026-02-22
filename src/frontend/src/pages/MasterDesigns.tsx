import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Edit } from "lucide-react";
import { toast } from "sonner";
import { 
  useGetAllMasterDesignMappings, 
  useReassignDesign, 
  useGetMasterDesignKarigars, 
  useAddKarigar, 
  useSaveDesignMapping,
  useUpdateMasterDesignKarigars,
  useUploadDesignMapping,
  useAssignOrdersToKarigar,
  useGetOrdersWithMappings
} from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import { parseMasterDesignExcel } from "@/utils/excelParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";
import { Progress } from "@/components/ui/progress";

export default function MasterDesigns() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { data: mappings = [], isLoading } = useGetAllMasterDesignMappings();
  const { data: masterDesignKarigars = [] } = useGetMasterDesignKarigars();
  const reassignMutation = useReassignDesign();
  const addKarigarMutation = useAddKarigar();
  const saveDesignMappingMutation = useSaveDesignMapping();
  const updateMasterDesignKarigarsMutation = useUpdateMasterDesignKarigars();
  const uploadDesignMappingMutation = useUploadDesignMapping();
  const assignOrdersToKarigarMutation = useAssignOrdersToKarigar();
  const { data: ordersWithMappings = [] } = useGetOrdersWithMappings();
  const { actor } = useActor();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<{
    designCode: string;
    genericName: string;
    karigarName: string;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Count unmapped orders before upload
      const unmappedBefore = ordersWithMappings.filter(
        (order) => !order.genericName || !order.karigarName
      ).length;

      const result = await parseMasterDesignExcel(file);
      
      if (result.errors.length > 0) {
        toast.error(`Found ${result.errors.length} error(s) in the Excel file`);
        result.errors.slice(0, 5).forEach((error) => {
          toast.error(`Row ${error.row}, ${error.field}: ${error.message}`);
        });
        if (result.data.length === 0) {
          return;
        }
      }

      console.log(`📤 Uploading ${result.data.length} design mappings...`);

      // Step 1: Upload to master design mappings table
      await uploadDesignMappingMutation.mutateAsync(result.data);
      setUploadProgress(25);
      
      // Step 2: Extract unique karigar names and ensure they exist in karigars table
      const uniqueKarigars = Array.from(new Set(result.data.map(record => record.karigarName)));
      
      // Add each karigar if it doesn't exist (backend will skip if exists)
      for (const karigarName of uniqueKarigars) {
        try {
          await addKarigarMutation.mutateAsync(karigarName);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error?.message?.includes("already exists")) {
            console.error(`Failed to add karigar ${karigarName}:`, error);
          }
        }
      }
      
      // Update the master design karigars list
      await updateMasterDesignKarigarsMutation.mutateAsync(uniqueKarigars);
      setUploadProgress(50);
      
      // Step 3: Save each mapping to designMappings so orders can access them
      let savedCount = 0;
      for (const mapping of result.data) {
        try {
          await saveDesignMappingMutation.mutateAsync({
            designCode: mapping.designCode,
            genericName: mapping.genericName,
            karigarName: mapping.karigarName,
          });
          savedCount++;
          setUploadProgress(50 + Math.round((savedCount / result.data.length) * 25));
        } catch (error: any) {
          console.error(`Failed to save mapping for ${mapping.designCode}:`, error);
          // Continue with other mappings even if one fails
        }
      }

      // Step 4: Automatically apply mappings to all existing orders with matching design codes
      console.log(`🔄 Applying mappings to existing orders...`);
      await assignOrdersToKarigarMutation.mutateAsync(result.data);
      setUploadProgress(100);

      // Fetch updated orders to count how many were mapped
      const updatedOrders = await actor.getOrdersWithMappings();
      const unmappedAfter = updatedOrders.filter(
        (order) => !order.genericName || !order.karigarName
      ).length;
      const newlyMapped = unmappedBefore - unmappedAfter;

      toast.success(
        `Successfully uploaded ${result.data.length} design mappings with ${uniqueKarigars.length} unique karigars. ${newlyMapped > 0 ? `${newlyMapped} order(s) were automatically mapped.` : ''}`
      );
    } catch (error) {
      toast.error("Failed to upload master design Excel");
      console.error(error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleEditClick = (mapping: { designCode: string; genericName: string; karigarName: string }) => {
    setSelectedMapping(mapping);
    setEditModalOpen(true);
  };

  const handleSaveMapping = async (designCode: string, genericName: string, newKarigar: string) => {
    if (!actor) throw new Error("Actor not initialized");
    
    // Step 1: Update master mapping table
    await saveDesignMappingMutation.mutateAsync({ designCode, genericName, karigarName: newKarigar });
    
    // Step 2: Update pending orders only (backend filters for Pending status)
    await reassignMutation.mutateAsync({ designCode, newKarigar });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Designs</h1>
          <p className="text-muted-foreground">
            Manage design code mappings and karigar assignments
          </p>
        </div>
        <div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="master-excel-upload"
          />
          <label htmlFor="master-excel-upload">
            <Button asChild disabled={isUploading}>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Master Excel"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing master design mappings...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead className="w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No design mappings found. Upload a Master Excel file to get started.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.designCode}>
                  <TableCell className="font-medium">{mapping.designCode}</TableCell>
                  <TableCell>{mapping.genericName}</TableCell>
                  <TableCell>{mapping.karigarName}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(mapping)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedMapping && (
        <EditDesignModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          designCode={selectedMapping.designCode}
          genericName={selectedMapping.genericName}
          currentKarigar={selectedMapping.karigarName}
          availableKarigars={masterDesignKarigars}
          onSave={handleSaveMapping}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
