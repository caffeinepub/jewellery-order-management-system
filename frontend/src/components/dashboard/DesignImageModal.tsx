import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { useGetDesignImage } from "../../hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";

interface DesignImageModalProps {
  open: boolean;
  designCode: string;
  onClose: () => void;
}

export function DesignImageModal({
  open,
  designCode,
  onClose,
}: DesignImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const { data: designData, isLoading } = useGetDesignImage(designCode);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Design: {designCode}</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-muted/20 rounded-lg p-4">
          {isLoading ? (
            <Skeleton className="w-64 h-64" />
          ) : designData && designData.url ? (
            <img
              src={designData.url}
              alt={`Design ${designCode}`}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
              className="max-w-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg font-medium">No image available</p>
              <p className="text-sm">Design code: {designCode}</p>
            </div>
          )}
        </div>

        {designData && (
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-border">
            <div className="flex gap-4 flex-wrap">
              <div>
                <span className="font-medium">Design Code:</span>{" "}
                <span>{designCode}</span>
              </div>
              {designData.genericName && (
                <div>
                  <span className="font-medium">Generic Name:</span>{" "}
                  <span>{designData.genericName}</span>
                </div>
              )}
              {designData.karigarName && (
                <div>
                  <span className="font-medium">Karigar:</span>{" "}
                  <span>{designData.karigarName}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DesignImageModal;
