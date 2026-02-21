import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import { useDesignImage } from '@/hooks/useQueries';

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
  
  const { data: designData, isLoading, error } = useDesignImage(designCode);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [open]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPanPosition({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

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

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

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
              <div className="text-muted-foreground">Loading design image...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-destructive">Failed to load design image</div>
            </div>
          )}

          {!isLoading && !error && !designData?.imageUrl && (
            <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
              <div className="text-muted-foreground">No image available for this design</div>
            </div>
          )}

          {designData?.imageUrl && (
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
                style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={designData.imageUrl}
                  alt={`Design ${designCode}`}
                  style={{
                    transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                    transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
                    maxWidth: '100%',
                    height: 'auto',
                    userSelect: 'none',
                  }}
                  className="rounded-md"
                  draggable={false}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {zoom > 1 ? 'Click and drag to pan' : 'Use zoom controls to magnify'}
              </p>
            </>
          )}

          {designData && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-semibold text-sm">Design Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Design Code:</span>
                  <p className="font-medium">{designData.designCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Generic Name:</span>
                  <p className="font-medium">{designData.genericName || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Karigar Name:</span>
                  <p className="font-medium">{designData.karigarName || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
