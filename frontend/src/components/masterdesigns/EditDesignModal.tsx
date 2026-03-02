import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useActor } from "@/hooks/useActor";

interface EditDesignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designCode: string;
  genericName: string;
  currentKarigar: string;
  karigars: string[];
}

export function EditDesignModal({
  open,
  onOpenChange,
  designCode,
  genericName,
  currentKarigar,
  karigars,
}: EditDesignModalProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const [selectedKarigar, setSelectedKarigar] = useState(currentKarigar);
  const [newKarigarName, setNewKarigarName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedKarigar(currentKarigar);
      setNewKarigarName("");
      setAddingNew(false);
    }
  }, [open, currentKarigar]);

  // Deduplicate karigar list
  const uniqueKarigars = Array.from(new Set(karigars.filter(Boolean)));

  const handleSave = async () => {
    if (!actor) return;

    const karigarToUse = addingNew ? newKarigarName.trim() : selectedKarigar;

    if (!karigarToUse) {
      toast.error("Please select or enter a karigar name.");
      return;
    }

    setIsSaving(true);
    try {
      if (addingNew && newKarigarName.trim()) {
        try {
          await actor.addKarigar(newKarigarName.trim());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.toLowerCase().includes("already exists")) {
            throw err;
          }
        }
      }

      await actor.reassignDesign(designCode, karigarToUse, "user");

      // Invalidate all relevant caches so KarigarsTab and TotalOrdersTab update
      await queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      await queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      await queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      await queryClient.invalidateQueries({ queryKey: ["karigars"] });

      toast.success(`Design ${designCode} reassigned to ${karigarToUse}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const match = raw.match(/Reject text: (.+)/);
      const message = match ? match[1] : raw;
      toast.error(`Failed to save: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Design Mapping</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm text-muted-foreground">Design Code</Label>
            <p className="font-semibold text-orange-500">{designCode}</p>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Generic Name</Label>
            <p className="font-medium">{genericName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="karigar-select">Assign Karigar</Label>
            {!addingNew ? (
              <select
                id="karigar-select"
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedKarigar}
                onChange={(e) => setSelectedKarigar(e.target.value)}
              >
                <option value="">-- Select Karigar --</option>
                {uniqueKarigars.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Enter new karigar name"
                value={newKarigarName}
                onChange={(e) => setNewKarigarName(e.target.value)}
              />
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setAddingNew(!addingNew);
                setNewKarigarName("");
              }}
            >
              {addingNew ? "← Select existing karigar" : "+ Add new karigar"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
