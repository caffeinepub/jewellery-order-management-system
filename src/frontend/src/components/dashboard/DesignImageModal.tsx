import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetDesignImage } from "@/hooks/useQueries";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";

interface DesignImageModalProps {
  designCode: string;
  open: boolean;
  onClose: () => void;
}

export default function DesignImageModal({
  designCode,
  open,
  onClose,
}: DesignImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const { data: designData, isLoading, error } = useGetDesignImage(designCode);

  // Fetch image bytes first for full-quality blob URL, fallback to getDirectURL()
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!designData?.blob) {
      setImageUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    (async () => {
      try {
        const bytes = await designData.blob.getBytes();
        if (bytes && bytes.length > 0) {
          let mimeType = "image/jpeg";
          if (bytes[0] === 0x89 && bytes[1] === 0x50) mimeType = "image/png";
          else if (bytes[0] === 0x47 && bytes[1] === 0x49)
            mimeType = "image/gif";
          else if (bytes[0] === 0x52 && bytes[1] === 0x49)
            mimeType = "image/webp";
          const blob = new Blob([bytes], { type: mimeType });
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          return;
        }
      } catch {
        /* fall through to getDirectURL */
      }
      setImageUrl(designData.blob.getDirectURL());
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [designData?.blob]);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [open]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPan({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPanPosition({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsPanning(true);
      setStartPan({
        x: e.touches[0].clientX - panPosition.x,
        y: e.touches[0].clientY - panPosition.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && zoom > 1 && e.touches.length === 1) {
      setPanPosition({
        x: e.touches[0].clientX - startPan.x,
        y: e.touches[0].clientY - startPan.y,
      });
    }
  };

  const handleTouchEnd = () => setIsPanning(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Design: {designCode}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">
                Loading design image...
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-destructive">
                Failed to load design image
              </div>
            </div>
          )}

          {!isLoading && !error && !designData && (
            <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
              <div className="text-muted-foreground">
                No image available for this design
              </div>
            </div>
          )}

          {designData && imageUrl && (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <div
                className="overflow-auto max-h-[50vh] border rounded-lg bg-muted/20 flex items-center justify-center p-4"
                style={{
                  cursor:
                    zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={imageUrl}
                  alt={`Design ${designCode}`}
                  style={{
                    transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                    transition: isPanning
                      ? "none"
                      : "transform 0.2s ease-in-out",
                    maxWidth: "100%",
                    height: "auto",
                    userSelect: "none",
                  }}
                  className="rounded-md"
                  draggable={false}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {zoom > 1
                  ? "Click and drag to pan"
                  : "Use zoom controls to magnify"}
              </p>
            </>
          )}

          {designData && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-semibold text-sm">Design Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Design Code:</span>
                  <p className="font-medium">{designCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Generic Name:</span>
                  <p className="font-medium">{designData.genericName || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Karigar Name:</span>
                  <p className="font-medium">{designData.karigarName || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
