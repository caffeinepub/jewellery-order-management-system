import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActor } from '@/hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DesignMapping } from '@/backend';

interface EditDesignModalProps {
  designCode: string;
  mapping: DesignMapping;
  availableKarigars: string[];
  onClose: () => void;
}

export function EditDesignModal({ designCode, mapping, availableKarigars, onClose }: EditDesignModalProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [selectedKarigar, setSelectedKarigar] = useState(mapping.karigarName);
  const [newKarigar, setNewKarigar] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!actor) return;

    const karigarToSave = isAddingNew ? newKarigar.trim() : selectedKarigar;

    if (!karigarToSave) {
      toast.error('Please select or enter a karigar name');
      return;
    }

    setIsSaving(true);

    try {
      if (isAddingNew && newKarigar.trim()) {
        await actor.addKarigar(newKarigar.trim());
      }

      await actor.saveDesignMapping(designCode, mapping.genericName, karigarToSave);
      await actor.reassignDesign(designCode, karigarToSave);

      await queryClient.invalidateQueries({ queryKey: ['masterDesignMappings'] });
      await queryClient.invalidateQueries({ queryKey: ['masterDesignKarigars'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success('Design mapping updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating design mapping:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update design mapping');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Design Mapping</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Design Code</Label>
            <Input value={designCode} disabled />
          </div>
          <div className="space-y-2">
            <Label>Generic Name</Label>
            <Input value={mapping.genericName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Karigar</Label>
            {!isAddingNew ? (
              <div className="space-y-2">
                <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKarigars.map((karigar) => (
                      <SelectItem key={karigar} value={karigar}>
                        {karigar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full"
                >
                  + Add New Karigar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter new karigar name"
                  value={newKarigar}
                  onChange={(e) => setNewKarigar(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewKarigar('');
                  }}
                  className="w-full"
                >
                  Cancel - Select Existing
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
