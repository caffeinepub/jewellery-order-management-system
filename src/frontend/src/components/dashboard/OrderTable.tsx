import { useState, useMemo } from 'react';
import { Order, OrderType } from '@/backend';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { exportToExcel, exportToPDF, exportToJPEG } from '@/utils/exportUtils';
import { toast } from 'sonner';
import DesignImageModal from './DesignImageModal';

interface OrderTableProps {
  orders: Order[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function OrderTable({
  orders,
  isLoading,
  selectedIds,
  onSelectionChange,
}: OrderTableProps) {
  const [searchText, setSearchText] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDesignCode, setSelectedDesignCode] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchText ||
        order.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
        order.product.toLowerCase().includes(searchText.toLowerCase());

      const matchesType =
        orderTypeFilter === 'all' ||
        (orderTypeFilter === 'CO' && order.orderType === OrderType.CO) ||
        (orderTypeFilter === 'RB' && order.orderType === OrderType.RB);

      const orderDate = new Date(Number(order.createdAt) / 1000000);
      const matchesDateRange =
        (!startDate || orderDate >= new Date(startDate)) &&
        (!endDate || orderDate <= new Date(endDate));

      return matchesSearch && matchesType && matchesDateRange;
    });
  }, [orders, searchText, orderTypeFilter, startDate, endDate]);

  const toggleSelection = (orderId: string) => {
    if (selectedIds.includes(orderId)) {
      onSelectionChange(selectedIds.filter((id) => id !== orderId));
    } else {
      onSelectionChange([...selectedIds, orderId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredOrders.map((o) => o.orderId));
    }
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'jpeg') => {
    try {
      if (format === 'excel') {
        await exportToExcel(filteredOrders);
      } else if (format === 'pdf') {
        await exportToPDF(filteredOrders);
      } else {
        await exportToJPEG(filteredOrders);
      }
      toast.success(`Exported ${filteredOrders.length} orders to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export to ${format.toUpperCase()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Order No..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="CO">CO</SelectItem>
            <SelectItem value="RB">RB</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[150px]"
          placeholder="Start Date"
        />

        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[150px]"
          placeholder="End Date"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="default">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('jpeg')}>
              Export to JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full overflow-x-auto rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    filteredOrders.length > 0 && selectedIds.length === filteredOrders.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[120px]">Order No</TableHead>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[120px]">Product</TableHead>
              <TableHead className="min-w-[120px]">Design</TableHead>
              <TableHead className="min-w-[140px]">Generic Name</TableHead>
              <TableHead className="min-w-[120px]">Karigar</TableHead>
              <TableHead className="min-w-[100px]">Weight</TableHead>
              <TableHead className="min-w-[80px]">Size</TableHead>
              <TableHead className="min-w-[60px]">Qty</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[150px]">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow
                  key={order.orderId}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedIds.includes(order.orderId) ? 'bg-muted' : ''
                  }`}
                  onClick={() => toggleSelection(order.orderId)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(order.orderId)}
                      onCheckedChange={() => toggleSelection(order.orderId)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.orderType}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDesignCode(order.design);
                      }}
                      className="text-gold hover:text-gold-hover underline underline-offset-2 transition-colors"
                    >
                      {order.design}
                    </button>
                  </TableCell>
                  <TableCell>{order.genericName || '-'}</TableCell>
                  <TableCell>{order.karigarName || '-'}</TableCell>
                  <TableCell>{order.weight.toFixed(2)}g</TableCell>
                  <TableCell>{order.size}</TableCell>
                  <TableCell>{Number(order.quantity)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground border">
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{order.remarks}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDesignCode && (
        <DesignImageModal
          designCode={selectedDesignCode}
          open={!!selectedDesignCode}
          onClose={() => setSelectedDesignCode(null)}
        />
      )}
    </div>
  );
}
