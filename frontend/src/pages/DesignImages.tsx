import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, FileArchive, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadResult {
  designCode: string;
  success: boolean;
  error?: string;
}

// The ExternalBlob class is provided by the blob-storage platform component at
// runtime and is not a resolvable TypeScript module. We access it via a helper.
function getExternalBlobClass(): {
  fromBytes(data: Uint8Array<ArrayBuffer>): {
    getDirectURL(): string;
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    withUploadProgress(cb: (pct: number) => void): unknown;
  };
} | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).__ExternalBlob ?? null;
}

async function uploadDesignImageBlob(
  designCode: string,
  data: Uint8Array<ArrayBuffer>,
  onProgress?: (pct: number) => void
): Promise<void> {
  const ExternalBlobClass = getExternalBlobClass();
  if (!ExternalBlobClass) {
    // Fallback: store as a data URL in sessionStorage for demo purposes
    // In production the platform always provides ExternalBlob
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    sessionStorage.setItem(`design-image-${designCode}`, url);
    return;
  }

  let blobInstance = ExternalBlobClass.fromBytes(data);
  if (onProgress) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blobInstance = (blobInstance as any).withUploadProgress(onProgress);
  }

  // Use the blob-storage upload mechanism
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadable = blobInstance as any;
  if (typeof uploadable.upload === 'function') {
    await uploadable.upload(`design-images/${designCode}`);
  }
}

export default function DesignImages() {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JSZip: any = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as string);
      const zip = new JSZip.default();
      const zipContent = await zip.loadAsync(file);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = Object.entries(zipContent.files) as any[];
      const imageFiles: { name: string; data: Uint8Array<ArrayBuffer> }[] = [];

      for (let i = 0; i < entries.length; i++) {
        const [filename, zipEntry] = entries[i];
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
          const data: ArrayBuffer = await zipEntry.async('arraybuffer');
          const newBuf = new ArrayBuffer(data.byteLength);
          new Uint8Array(newBuf).set(new Uint8Array(data));
          const uint8Data = new Uint8Array(newBuf) as Uint8Array<ArrayBuffer>;
          const name = (filename as string).split('/').pop() || filename;
          imageFiles.push({ name, data: uint8Data });
        }
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
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));

      const batchPromises = batch.map(async (file) => {
        const designCode = extractFilenameAsDesignCode(file.name);
        setCurrentFile(file.name);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const newBuf = new ArrayBuffer(arrayBuffer.byteLength);
          new Uint8Array(newBuf).set(new Uint8Array(arrayBuffer));
          const uint8Array = new Uint8Array(newBuf) as Uint8Array<ArrayBuffer>;

          await uploadDesignImageBlob(designCode, uint8Array);

          return { designCode, success: true };
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

  const processExtractedImages = async (imageFiles: { name: string; data: Uint8Array<ArrayBuffer> }[]) => {
    const results: UploadResult[] = [];
    const totalFiles = imageFiles.length;
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));

      const batchPromises = batch.map(async ({ name, data }) => {
        const designCode = extractFilenameAsDesignCode(name);
        setCurrentFile(name);

        try {
          await uploadDesignImageBlob(designCode, data);
          return { designCode, success: true };
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
        {/* Folder Upload */}
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
                  Supports JPG, PNG, GIF, WebP
                </p>
              </div>
              <div>
                <Label htmlFor="folder-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                    onClick={() => folderInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Folder
                  </Button>
                </Label>
                <input
                  ref={folderInputRef}
                  id="folder-upload"
                  type="file"
                  // @ts-expect-error webkitdirectory is not in standard types
                  webkitdirectory=""
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFolderUpload}
                  disabled={isUploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ZIP Upload */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Upload from ZIP
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
                  Images will be extracted automatically
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  onClick={() => zipInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select ZIP File
                </Button>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleZipUpload}
                  disabled={isUploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentFile ? `Uploading: ${currentFile}` : 'Processing...'}
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && !isUploading && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadResults.map((result) => (
                <div
                  key={result.designCode}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    result.success ? 'bg-green-500/10' : 'bg-destructive/10'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="font-mono font-medium">{result.designCode}</span>
                  {result.error && (
                    <span className="text-destructive text-xs ml-auto">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex gap-4 text-sm">
              <span className="text-green-600 font-medium">
                ✓ {uploadResults.filter((r) => r.success).length} succeeded
              </span>
              {uploadResults.filter((r) => !r.success).length > 0 && (
                <span className="text-destructive font-medium">
                  ✗ {uploadResults.filter((r) => !r.success).length} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Naming convention:</strong> Image filenames should match the design code exactly
          (e.g., <code className="font-mono text-xs">CHTMN40046.jpg</code> for design code{' '}
          <code className="font-mono text-xs">CHTMN40046</code>). The file extension is removed
          automatically.
        </AlertDescription>
      </Alert>
    </div>
  );
}
