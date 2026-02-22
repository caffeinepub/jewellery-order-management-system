import { useMemo, useState } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { OrderTable } from './OrderTable';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrderStatus } from '../../backend';

export function TotalOrdersTab() {
  const { data: orders = [], isLoading } = useGetOrders();
  const [orderTypeFilter, setOrderTypeFilter] = useState<'All' | 'CO' | 'RB'>('All');
  const [karigarFilter, setKarigarFilter] = useState<string>('All');
  const [searchText, setSearchText] = useState('');

  const totalOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === OrderStatus.Pending || order.status === OrderStatus.ReturnFromHallmark
    );
  }, [orders]);

  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    totalOrders.forEach((order) => {
      if (order.karigarName) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [totalOrders]);

  const filteredOrders = useMemo(() => {
    return totalOrders.filter((order) => {
      if (orderTypeFilter !== 'All' && order.orderType !== orderTypeFilter) {
        return false;
      }

      if (karigarFilter !== 'All' && order.karigarName !== karigarFilter) {
        return false;
      }

      if (searchText && !order.orderNo.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [totalOrders, orderTypeFilter, karigarFilter, searchText]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Button
            variant={orderTypeFilter === 'All' ? 'default' : 'outline'}
            onClick={() => setOrderTypeFilter('All')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={orderTypeFilter === 'CO' ? 'default' : 'outline'}
            onClick={() => setOrderTypeFilter('CO')}
            size="sm"
          >
            CO
          </Button>
          <Button
            variant={orderTypeFilter === 'RB' ? 'default' : 'outline'}
            onClick={() => setOrderTypeFilter('RB')}
            size="sm"
          >
            RB
          </Button>
        </div>

        <Select value={karigarFilter} onValueChange={setKarigarFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Karigars</SelectItem>
            {uniqueKarigars.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by Order No..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <OrderTable
        orders={filteredOrders}
        showStatusActions={true}
        showExport={true}
        exportFilename="total-orders"
      />
    </div>
  );
}

export default TotalOrdersTab;
