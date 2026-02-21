import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { parseKarigarMappingExcel } from "@/utils/excelParser";
import {
  useUploadDesignMapping,
  useGetDesignMappings,
  useReassignDesign,
  useAddKarigar,
  useGetKarigars,
} from "@/hooks/useQueries";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";

export default function MasterDesigns() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDesign, setEditingDesign] = useState<{
    designCode: string;
    genericName: string;
    karigarName: string;
  } | null>(null);

  const uploadMutation = useUploadDesignMapping();
  const reassignMutation = useReassignDesign();
  const addKarigarMutation = useAddKarigar();
  const { data: mappings = [], isLoading } = useGetDesignMappings();
  const { data: karigars = [] } = useGetKarigars();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const result = await parseKarigarMappingExcel(file);
      await uploadMutation.mutateAsync(result.data);
      toast.success("Master design Excel uploaded successfully");
      setFile(null);
    } catch (error) {
      toast.error("Failed to upload Excel file");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (designCode: string, newKarigar: string) => {
    await reassignMutation.mutateAsync({ designCode, newKarigar });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  // Get unique karigar names from mappings
  const uniqueKarigars = Array.from(
    new Set([
      ...mappings.map((m) => m.karigarName),
      ...karigars.map((k) => k.name),
    ])
  ).sort();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Designs</h1>
          <p className="text-muted-foreground">
            Upload and manage design-to-karigar mappings
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-gold hover:bg-gold-hover"
          >
            {isUploading ? (
              "Uploading..."
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Excel
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Upload an Excel file with columns: Design Code (A), Generic Name (B),
          Karigar Name (C)
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Design Mappings</h2>
          <p className="text-sm text-muted-foreground">
            {mappings.length} design codes mapped
          </p>
        </div>
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
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
                    Loading mappings...
                  </TableCell>
                </TableRow>
              ) : mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No design mappings found. Upload an Excel file to get started.
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
                        onClick={() =>
                          setEditingDesign({
                            designCode: mapping.designCode,
                            genericName: mapping.genericName,
                            karigarName: mapping.karigarName,
                          })
                        }
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
      </div>

      {editingDesign && (
        <EditDesignModal
          open={!!editingDesign}
          onOpenChange={(open) => !open && setEditingDesign(null)}
          designCode={editingDesign.designCode}
          genericName={editingDesign.genericName}
          currentKarigar={editingDesign.karigarName}
          availableKarigars={uniqueKarigars}
          onSave={handleSaveEdit}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
