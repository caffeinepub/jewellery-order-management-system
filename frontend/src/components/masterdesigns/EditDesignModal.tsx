import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface EditDesignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designCode: string;
  genericName: string;
  currentKarigar: string;
  availableKarigars: string[];
  onSave: (designCode: string, genericName: string, newKarigar: string) => Promise<void>;
  onAddKarigar: (name: string) => Promise<void>;
}

export function EditDesignModal({
  open,
  onOpenChange,
  designCode,
  genericName,
  currentKarigar,
  availableKarigars,
  onSave,
  onAddKarigar,
}: EditDesignModalProps) {
  const [selectedKarigar, setSelectedKarigar] = useState(currentKarigar);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newKarigarName, setNewKarigarName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedKarigar(currentKarigar);
    setIsAddingNew(false);
    setNewKarigarName("");
  }, [currentKarigar, open]);

  const handleSave = async () => {
    // Validate
    if (!selectedKarigar || selectedKarigar.trim() === "") {
      toast.error("Please select a karigar");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(designCode, genericName, selectedKarigar);
      toast.success("Design mapping updated successfully. Pending orders have been reassigned.");
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update design mapping";
      toast.error(errorMessage);
      console.error("Error updating design mapping:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewKarigar = async () => {
    if (!newKarigarName.trim()) {
      toast.error("Please enter a karigar name");
      return;
    }

    setIsSaving(true);
    try {
      await onAddKarigar(newKarigarName.trim());
      setSelectedKarigar(newKarigarName.trim());
      setIsAddingNew(false);
      setNewKarigarName("");
      toast.success("New karigar added successfully");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to add new karigar";
      toast.error(errorMessage);
      console.error("Error adding karigar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === "__add_new__") {
      setIsAddingNew(true);
    } else {
      setSelectedKarigar(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Design Mapping</DialogTitle>
          <DialogDescription>
            Update the karigar assignment for this design code. Only Pending orders will be reassigned.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Design Code</Label>
            <Input value={designCode} disabled className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label>Generic Name</Label>
            <Input value={genericName} disabled className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label>Karigar</Label>
            {isAddingNew ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newKarigarName}
                    onChange={(e) => setNewKarigarName(e.target.value)}
                    placeholder="Enter new karigar name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddNewKarigar();
                      } else if (e.key === "Escape") {
                        setIsAddingNew(false);
                        setNewKarigarName("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={handleAddNewKarigar}
                    disabled={isSaving || !newKarigarName.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewKarigarName("");
                    }}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Select value={selectedKarigar} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a karigar" />
                </SelectTrigger>
                <SelectContent>
                  {availableKarigars.map((karigar) => (
                    <SelectItem key={karigar} value={karigar}>
                      {karigar}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-gold font-medium">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Karigar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isAddingNew} className="bg-gold hover:bg-gold-hover">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
