import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Pencil } from "lucide-react";
import { useActor } from "@/hooks/useActor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseMasterDesignExcel } from "@/utils/excelParser";
import { ExternalBlob, DesignMapping } from "@/backend";
import { EditDesignModal } from "@/components/masterdesigns/EditDesignModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MasterDesigns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, batch: 0 });
  const [editingMapping, setEditingMapping] = useState<{
    designCode: string;
    mapping: DesignMapping;
  } | null>(null);

  const { data: masterMappings = [] } = useQuery({
    queryKey: ["masterDesignMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor,
  });

  const { data: availableKarigars = [] } = useQuery({
    queryKey: ["masterDesignKarigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesignKarigars();
    },
    enabled: !!actor,
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !actor) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: 0, batch: 0 });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);

      await actor.uploadMasterDesignExcel(blob);

      const result = await parseMasterDesignExcel(file);

      if (result.data.length === 0) {
        toast.error("No valid mappings found in the Excel file");
        setIsProcessing(false);
        return;
      }

      const mappings = result.data;
      const uniqueKarigars = Array.from(new Set(mappings.map((m) => m.karigarName)));

      setProgress({ current: 0, total: mappings.length, batch: 0 });

      await actor.updateMasterDesignKarigars(uniqueKarigars);

      const CHUNK_SIZE = 100;
      const chunks: typeof mappings[] = [];
      for (let i = 0; i < mappings.length; i += CHUNK_SIZE) {
        chunks.push(mappings.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await actor.uploadDesignMapping(chunk);
        setProgress({
          current: (i + 1) * CHUNK_SIZE,
          total: mappings.length,
          batch: i + 1,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      await queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      toast.success(
        `Successfully uploaded ${mappings.length} design mappings and ${uniqueKarigars.length} karigars!`
      );
    } catch (error) {
      console.error("Error uploading master design:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Master Designs</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Master Design Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload an Excel file with columns: Design Code, Generic Name,
              Karigar
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="master-file-upload"
            />
            <label htmlFor="master-file-upload">
              <Button asChild disabled={isProcessing}>
                <span className="cursor-pointer">
                  {isProcessing ? "Processing..." : "Choose File"}
                </span>
              </Button>
            </label>
          </div>

          {isProcessing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing mappings...</span>
                <span>
                  Batch {progress.batch} - {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {masterMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Design Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design Code</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Karigar</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterMappings.map(([designCode, mapping]) => (
                    <TableRow key={designCode}>
                      <TableCell className="font-medium">
                        {mapping.designCode}
                      </TableCell>
                      <TableCell>{mapping.genericName}</TableCell>
                      <TableCell>{mapping.karigarName}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditingMapping({ designCode, mapping })
                          }
                        >
                          <Pencil className="h-4 w-4" />
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

      {editingMapping && (
        <EditDesignModal
          designCode={editingMapping.designCode}
          mapping={editingMapping.mapping}
          availableKarigars={availableKarigars}
          onClose={() => setEditingMapping(null)}
        />
      )}
    </div>
  );
}
