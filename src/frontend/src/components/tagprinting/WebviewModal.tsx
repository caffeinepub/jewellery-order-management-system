import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface WebviewModalProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

export default function WebviewModal({ url, open, onClose }: WebviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              MPN System
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative flex-1 w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground">Loading MPN system...</p>
              </div>
            </div>
          )}
          
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="MPN System"
            onLoad={handleLoad}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            allow="fullscreen"
          />
        </div>

        <div className="px-6 py-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Complete your login in the browser above. Close this window when done.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
