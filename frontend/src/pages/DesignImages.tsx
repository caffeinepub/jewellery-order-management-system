import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, FileArchive, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useActor } from '@/hooks/useActor';
import { ExternalBlob } from '@/backend';
import { toast } from 'sonner';

interface UploadResult {
  designCode: string;
  success: boolean;
  error?: string;
}

export default function DesignImages() {
  const { actor } = useActor();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [currentFile, setCurrentFile] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const extractFilenameAsDesignCode = (filename: string): string => {
    return filename.replace(/\.[^/.]+$/, '');
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processImageFiles(Array.from(files));
    e.target.value = '';
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    setCurrentFile('Extracting ZIP...');

    try {
      const JSZip: any = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as any);
      
      const zip = new JSZip.default();
      const zipContent = await zip.loadAsync(file);
      
      const imageFiles: { name: string; data: Uint8Array }[] = [];
      const entries = Object.entries(zipContent.files) as any;
      
      for (let i = 0; i < entries.length; i++) {
        const [filename, zipEntry] = entries[i];
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
          const data: ArrayBuffer = await zipEntry.async('arraybuffer');
          // Create a new Uint8Array with ArrayBuffer type
          const uint8Data = new Uint8Array(data);
          const name = filename.split('/').pop() || filename;
          imageFiles.push({ name, data: uint8Data });
        }
        
        // Update extraction progress
        setUploadProgress(Math.floor((i / entries.length) * 20));
      }

      if (imageFiles.length === 0) {
        toast.error('No image files found in ZIP');
        setIsUploading(false);
        return;
      }

      await processExtractedImages(imageFiles);
    } catch (error) {
      console.error('ZIP extraction error:', error);
      toast.error('Failed to extract ZIP file');
      setIsUploading(false);
    }

    e.target.value = '';
  };

  const processImageFiles = async (files: File[]) => {
    if (!actor) {
      toast.error('Backend not initialized');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
    );

    if (imageFiles.length === 0) {
      toast.error('No image files found');
      setIsUploading(false);
      return;
    }

    const results: UploadResult[] = [];
    const totalFiles = imageFiles.length;
    const BATCH_SIZE = 5; // Process 5 images concurrently

    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));
      
      const batchPromises = batch.map(async (file) => {
        const designCode = extractFilenameAsDesignCode(file.name);
        setCurrentFile(file.name);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const blob = ExternalBlob.fromBytes(uint8Array);
          
          await actor.uploadDesignImage(designCode, blob);
          
          return {
            designCode,
            success: true,
          };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          return {
            designCode,
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const progress = Math.floor(((i + batch.length) / totalFiles) * 100);
      setUploadProgress(progress);
    }

    setUploadResults(results);
    setIsUploading(false);
    setCurrentFile('');

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`Successfully uploaded ${successCount} images`);
    } else {
      toast.warning(`Uploaded ${successCount} images, ${failCount} failed`);
    }
  };

  const processExtractedImages = async (imageFiles: { name: string; data: Uint8Array }[]) => {
    if (!actor) {
      toast.error('Backend not initialized');
      setIsUploading(false);
      return;
    }

    const results: UploadResult[] = [];
    const totalFiles = imageFiles.length;
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));
      
      const batchPromises = batch.map(async ({ name, data }) => {
        const designCode = extractFilenameAsDesignCode(name);
        setCurrentFile(name);

        try {
          // Create a new ArrayBuffer and Uint8Array to ensure correct type
          const newArrayBuffer = new ArrayBuffer(data.length);
          const newUint8Array = new Uint8Array(newArrayBuffer);
          newUint8Array.set(data);
          
          const blob = ExternalBlob.fromBytes(newUint8Array);
          await actor.uploadDesignImage(designCode, blob);
          
          return {
            designCode,
            success: true,
          };
        } catch (error) {
          console.error(`Failed to upload ${name}:`, error);
          return {
            designCode,
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const progress = 20 + Math.floor(((i + batch.length) / totalFiles) * 80);
      setUploadProgress(progress);
    }

    setUploadResults(results);
    setIsUploading(false);
    setCurrentFile('');

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`Successfully uploaded ${successCount} images`);
    } else {
      toast.warning(`Uploaded ${successCount} images, ${failCount} failed`);
    }
  };

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Design Images</h1>
        <p className="text-muted-foreground mt-1">
          Upload design images using folder selection or ZIP file
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Upload from Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border border-dashed p-8 text-center bg-muted/30">
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a folder containing design images
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filename will be used as design code
                </p>
              </div>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFolderUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Folder
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Upload ZIP File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border border-dashed p-8 text-center bg-muted/30">
                <FileArchive className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Upload a ZIP file containing design images
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports nested folders
                </p>
              </div>
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                onClick={() => zipInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select ZIP File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isUploading && (
        <Card className="mt-6 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentFile || 'Processing...'}
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {uploadResults.length > 0 && (
        <Card className="mt-6 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {uploadResults.map((result, idx) => (
                <Alert
                  key={idx}
                  variant={result.success ? 'default' : 'destructive'}
                  className="py-3"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <div className="flex-1">
                      <AlertDescription className="text-sm">
                        <strong>{result.designCode}</strong>
                        {result.error && ` - ${result.error}`}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
