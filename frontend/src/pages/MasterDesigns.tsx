import { useState, useMemo, useRef } from "react";
import {
  useGetAllMasterDesignMappings,
  useGetMasterDesignKarigars,
  useUploadMasterDesignExcel,
  useUploadDesignMapping,
  useClearAllDesignMappings,
  useUpdateDesignMapping,
  useAddKarigar,
} from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, Search } from "lucide-react";
import { ExternalBlob, DesignMapping } from "@/backend";
import { toast } from "sonner";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";

export function MasterDesigns() {
  const [search, setSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DesignMapping | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mappings, isLoading } = useGetAllMasterDesignMappings();
  const { data: karigars } = useGetMasterDesignKarigars();
  const uploadExcelMutation = useUploadMasterDesignExcel();
  const uploadMappingMutation = useUploadDesignMapping();
  const clearMappingsMutation = useClearAllDesignMappings();
  const updateDesignMappingMutation = useUpdateDesignMapping();
  const addKarigarMutation = useAddKarigar();

  const filteredMappings = useMemo(() => {
    if (!mappings) return [];
    if (!search.trim()) return mappings;
    const s = search.toLowerCase();
    return mappings.filter(
      ([, mapping]) =>
        mapping.designCode.toLowerCase().includes(s) ||
        mapping.genericName.toLowerCase().includes(s) ||
        mapping.karigarName.toLowerCase().includes(s)
    );
  }, [mappings, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);
      await uploadExcelMutation.mutateAsync(blob);
      toast.success("Master design Excel uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload Excel");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearMappings = async () => {
    try {
      await clearMappingsMutation.mutateAsync();
      toast.success("All design mappings cleared");
      setShowClearConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear mappings");
    }
  };

  const handleSaveMapping = async (
    designCode: string,
    genericName: string,
    newKarigar: string
  ) => {
    await updateDesignMappingMutation.mutateAsync({
      designCode,
      genericName,
      karigarName: newKarigar,
    });
  };

  const handleAddKarigar = async (name: string) => {
    await addKarigarMutation.mutateAsync(name);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-playfair text-foreground">
          Master Designs
        </h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadExcelMutation.isPending}
            className="bg-gold hover:bg-gold-hover text-white"
          >
            {uploadExcelMutation.isPending ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Upload Excel
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowClearConfirm(true)}
            disabled={clearMappingsMutation.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mappings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredMappings.length} mapping(s)
        </span>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <span className="text-muted-foreground">Loading...</span>
                </TableCell>
              </TableRow>
            ) : filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No design mappings found
                </TableCell>
              </TableRow>
            ) : (
              filteredMappings.map(([designCode, mapping]) => (
                <TableRow key={designCode}>
                  <TableCell className="font-medium">{mapping.designCode}</TableCell>
                  <TableCell>{mapping.genericName}</TableCell>
                  <TableCell>{mapping.karigarName}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMapping(mapping)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Design Mappings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all design mappings? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearMappings}
              disabled={clearMappingsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearMappingsMutation.isPending ? "Clearing..." : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingMapping && (
        <EditDesignModal
          open={!!editingMapping}
          onOpenChange={(open) => { if (!open) setEditingMapping(null); }}
          designCode={editingMapping.designCode}
          genericName={editingMapping.genericName}
          currentKarigar={editingMapping.karigarName}
          availableKarigars={karigars ?? []}
          onSave={handleSaveMapping}
          onAddKarigar={handleAddKarigar}
        />
      )}
    </div>
  );
}
