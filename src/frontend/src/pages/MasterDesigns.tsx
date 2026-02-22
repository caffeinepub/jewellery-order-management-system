import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Edit } from "lucide-react";
import { toast } from "sonner";
import { useGetDesignMappings, useReassignDesign, useGetKarigars, useAddKarigar } from "@/hooks/useQueries";
import { useActor } from "@/hooks/useActor";
import { parseKarigarMappingExcel } from "@/utils/excelParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";

export default function MasterDesigns() {
  const [isUploading, setIsUploading] = useState(false);
  const { data: mappings = [], isLoading } = useGetDesignMappings();
  const { data: karigars = [] } = useGetKarigars();
  const reassignMutation = useReassignDesign();
  const addKarigarMutation = useAddKarigar();
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
    try {
      const result = await parseKarigarMappingExcel(file);
      
      if (result.errors.length > 0) {
        toast.error(`Found ${result.errors.length} error(s) in the Excel file`);
        result.errors.forEach((error) => {
          toast.error(`Row ${error.row}, ${error.field}: ${error.message}`);
        });
        return;
      }

      await actor.uploadDesignMapping(result.data);
      toast.success(`Successfully uploaded ${result.data.length} design mappings`);
    } catch (error) {
      toast.error("Failed to upload master design Excel");
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleEditClick = (mapping: { designCode: string; genericName: string; karigarName: string }) => {
    setSelectedMapping(mapping);
    setEditModalOpen(true);
  };

  const handleSaveMapping = async (designCode: string, genericName: string, newKarigar: string) => {
    if (!actor) throw new Error("Actor not initialized");
    
    // Step 2: Update master mapping table
    await actor.saveDesignMapping(designCode, genericName, newKarigar);
    
    // Step 3: Update pending orders only (backend filters for Pending status)
    await reassignMutation.mutateAsync({ designCode, newKarigar });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  const availableKarigarNames = karigars.map((k) => k.name);

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
          availableKarigars={availableKarigarNames}
          onSave={handleSaveMapping}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
