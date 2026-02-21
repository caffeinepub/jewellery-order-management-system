import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, X, Edit2, Plus, Search } from 'lucide-react';
import { parseMasterDesignExcel } from '@/utils/excelParser';
import { useSaveDesignMappings, useGetKarigars, useReassignDesign, useAddKarigar } from '@/hooks/useQueries';
import { toast } from 'sonner';

interface DesignMapping {
  designCode: string;
  genericName: string;
  karigarName: string;
}

interface ParseError {
  row: number;
  field: string;
  message: string;
}

export default function MasterDesigns() {
  const [mappings, setMappings] = useState<DesignMapping[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDesignCode, setEditingDesignCode] = useState<string | null>(null);
  const [selectedKarigar, setSelectedKarigar] = useState<string>('');
  const [showAddKarigarDialog, setShowAddKarigarDialog] = useState(false);
  const [newKarigarName, setNewKarigarName] = useState('');
  
  const saveMappings = useSaveDesignMappings();
  const { data: karigars = [], isLoading: karigarsLoading } = useGetKarigars();
  const reassignMutation = useReassignDesign();
  const addKarigarMutation = useAddKarigar();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrors([]);
    try {
      const result = await parseMasterDesignExcel(file);
      setMappings(result.data);
      setErrors(result.errors);
      
      if (result.errors.length > 0) {
        toast.warning(`Parsed ${result.data.length} mappings with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully parsed ${result.data.length} design mappings`);
      }
    } catch (error) {
      toast.error('Failed to parse Excel file');
      console.error(error);
      setErrors([{ row: 0, field: 'File', message: 'Failed to read or parse the Excel file' }]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (mappings.length === 0) {
      toast.error('No mappings to save');
      return;
    }

    try {
      await saveMappings.mutateAsync(mappings);
      toast.success(`Successfully saved ${mappings.length} design mappings`);
      setMappings([]);
      setErrors([]);
      setSearchTerm('');
    } catch (error) {
      toast.error('Failed to save mappings');
    }
  };

  const handleReassignKarigar = async () => {
    if (!editingDesignCode || !selectedKarigar) {
      toast.error('Please select a karigar');
      return;
    }

    try {
      await reassignMutation.mutateAsync({
        designCode: editingDesignCode,
        newKarigar: selectedKarigar,
      });
      
      // Update local state
      setMappings((prev) =>
        prev.map((mapping) =>
          mapping.designCode === editingDesignCode
            ? { ...mapping, karigarName: selectedKarigar }
            : mapping
        )
      );
      
      toast.success(`Reassigned ${editingDesignCode} to ${selectedKarigar}`);
      setEditingDesignCode(null);
      setSelectedKarigar('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to reassign karigar';
      toast.error(errorMessage);
      console.error('Reassignment error:', error);
    }
  };

  const handleAddKarigar = async () => {
    if (!newKarigarName.trim()) {
      toast.error('Karigar name is required');
      return;
    }

    try {
      await addKarigarMutation.mutateAsync(newKarigarName.trim());
      toast.success(`Added new karigar: ${newKarigarName}`);
      setNewKarigarName('');
      setShowAddKarigarDialog(false);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to add karigar';
      toast.error(errorMessage);
      console.error('Add karigar error:', error);
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const filteredMappings = mappings.filter((mapping) =>
    mapping.designCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Master Designs</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage design code mappings to generic names and karigars
        </p>
      </div>

      <Card className="mb-6 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upload Master Design Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="master-excel" className="text-sm font-medium">
                Select Excel File
              </Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="master-excel"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button disabled={isUploading} variant="outline">
                  {isUploading ? (
                    'Parsing...'
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-dashed p-8 text-center bg-muted/30">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Expected columns: Design Code, Generic Name, Karigar Name
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>Parsing Errors ({errors.length})</span>
            <Button variant="ghost" size="sm" onClick={clearErrors}>
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
              {errors.map((error, idx) => (
                <div key={idx} className="text-sm">
                  <strong>Row {error.row}:</strong> {error.field} - {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {mappings.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium">
              Design Mappings ({filteredMappings.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by design code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => setShowAddKarigarDialog(true)}
                variant="outline"
                size="default"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Karigar
              </Button>
              <Button onClick={handleSave} disabled={saveMappings.isPending}>
                {saveMappings.isPending ? 'Saving...' : 'Save Mappings'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-auto">
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
                  {filteredMappings.map((mapping, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{mapping.designCode}</TableCell>
                      <TableCell>{mapping.genericName}</TableCell>
                      <TableCell>{mapping.karigarName}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDesignCode(mapping.designCode);
                            setSelectedKarigar(mapping.karigarName);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
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

      {/* Reassign Karigar Dialog */}
      <Dialog open={!!editingDesignCode} onOpenChange={(open) => {
        if (!open) {
          setEditingDesignCode(null);
          setSelectedKarigar('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Karigar Assignment</DialogTitle>
            <DialogDescription>
              Reassign design code <strong>{editingDesignCode}</strong> to a different karigar
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="karigar-select" className="text-sm font-medium mb-2 block">
              Select Karigar
            </Label>
            <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
              <SelectTrigger id="karigar-select">
                <SelectValue placeholder="Choose a karigar" />
              </SelectTrigger>
              <SelectContent>
                {karigarsLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading karigars...
                  </SelectItem>
                ) : karigars.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No karigars available
                  </SelectItem>
                ) : (
                  karigars.map((karigar) => (
                    <SelectItem key={karigar.name} value={karigar.name}>
                      {karigar.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingDesignCode(null);
                setSelectedKarigar('');
              }}
              disabled={reassignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignKarigar}
              disabled={!selectedKarigar || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Karigar Dialog */}
      <Dialog open={showAddKarigarDialog} onOpenChange={setShowAddKarigarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Karigar</DialogTitle>
            <DialogDescription>
              Create a new karigar to assign to design codes
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-karigar" className="text-sm font-medium mb-2 block">
              Karigar Name
            </Label>
            <Input
              id="new-karigar"
              placeholder="Enter karigar name"
              value={newKarigarName}
              onChange={(e) => setNewKarigarName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newKarigarName.trim()) {
                  handleAddKarigar();
                }
              }}
              disabled={addKarigarMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddKarigarDialog(false);
                setNewKarigarName('');
              }}
              disabled={addKarigarMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddKarigar}
              disabled={!newKarigarName.trim() || addKarigarMutation.isPending}
            >
              {addKarigarMutation.isPending ? 'Adding...' : 'Add Karigar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
