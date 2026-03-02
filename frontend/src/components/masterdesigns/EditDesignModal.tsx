import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateDesignMapping, useGetUniqueKarigarsFromDesignMappings } from '@/hooks/useQueries';

interface EditDesignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designCode: string;
  genericName: string;
  currentKarigar: string;
}

export function EditDesignModal({
  open,
  onOpenChange,
  designCode,
  genericName,
  currentKarigar,
}: EditDesignModalProps) {
  const [newGenericName, setNewGenericName] = useState(genericName);
  const [selectedKarigar, setSelectedKarigar] = useState(currentKarigar);

  const { data: karigarsRaw = [], isLoading: karigarsLoading } =
    useGetUniqueKarigarsFromDesignMappings();

  // Deduplicate karigar names
  const karigars = Array.from(new Set(karigarsRaw.filter(Boolean))).sort();

  const updateMutation = useUpdateDesignMapping();

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      setNewGenericName(genericName);
      setSelectedKarigar(currentKarigar);
    }
  }, [open, genericName, currentKarigar]);

  const handleSave = async () => {
    if (!selectedKarigar) {
      toast.error('Please select a karigar');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        designCode,
        newGenericName: newGenericName.trim(),
        newKarigarName: selectedKarigar,
      });
      toast.success(`Design ${designCode} updated successfully`);
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.message?.includes('Reject text:')
          ? err.message.split('Reject text:')[1].trim()
          : err?.message ?? 'Failed to update design mapping';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Design Mapping</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Design Code</Label>
            <p className="font-bold text-primary">{designCode}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input
              id="genericName"
              value={newGenericName}
              onChange={(e) => setNewGenericName(e.target.value)}
              placeholder="Enter generic name"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="karigar">Karigar</Label>
            {karigarsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading karigars…
              </div>
            ) : (
              <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
                <SelectTrigger id="karigar">
                  <SelectValue placeholder="Select karigar" />
                </SelectTrigger>
                <SelectContent>
                  {karigars.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No karigars found
                    </SelectItem>
                  ) : (
                    karigars.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !selectedKarigar}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
