import { useMemo, useState } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { OrderTable } from './OrderTable';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrderStatus } from '../../backend';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function HallmarkTab() {
  const { data: orders = [], isLoading } = useGetOrders();
  const [orderTypeFilter, setOrderTypeFilter] = useState<'All' | 'CO' | 'RB'>('All');
  const [karigarFilter, setKarigarFilter] = useState<string>('All');
  const [searchText, setSearchText] = useState('');

  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());

  const hallmarkOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === OrderStatus.Hallmark || order.status === OrderStatus.ReturnFromHallmark
    );
  }, [orders]);

  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    hallmarkOrders.forEach((order) => {
      if (order.karigarName) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [hallmarkOrders]);

  const filteredOrders = useMemo(() => {
    return hallmarkOrders.filter((order) => {
      const orderDate = new Date(Number(order.updatedAt) / 1000000);
      const isInDateRange = isWithinInterval(orderDate, {
        start: startOfDay(fromDate),
        end: endOfDay(toDate),
      });

      if (!isInDateRange) {
        return false;
      }

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
  }, [hallmarkOrders, orderTypeFilter, karigarFilter, searchText, fromDate, toDate]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Date Range:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[140px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fromDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={(date) => date && setFromDate(date)} />
            </PopoverContent>
          </Popover>
          <span className="text-sm">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[140px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(toDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={(date) => date && setToDate(date)} />
            </PopoverContent>
          </Popover>
        </div>

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
      </div>

      <OrderTable
        orders={filteredOrders}
        showExport={true}
        exportFilename="hallmark-orders"
      />
    </div>
  );
}

export default HallmarkTab;
