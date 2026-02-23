import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useResetActiveOrders } from '@/hooks/useQueries';
import { toast } from 'sonner';

interface DataResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataResetDialog({ open, onOpenChange }: DataResetDialogProps) {
  const resetMutation = useResetActiveOrders();

  const handleConfirm = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success('All active orders have been deleted successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to reset data');
      console.error(error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Active Orders Data</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This action will permanently delete all orders with <strong>Pending</strong> or{' '}
              <strong>ReturnFromHallmark</strong> status.
            </p>
            <p className="font-medium">The following tabs will be affected:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>Total Orders</li>
              <li>Karigar</li>
              <li>Customer Orders</li>
              <li>Hallmark</li>
            </ul>
            <p className="text-destructive font-medium pt-2">
              This action cannot be undone. Are you sure you want to continue?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={resetMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {resetMutation.isPending ? 'Deleting...' : 'Delete All Active Orders'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
