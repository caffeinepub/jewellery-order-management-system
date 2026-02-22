import { useState, useMemo, useEffect } from "react";
import OrderTable from "./OrderTable";
import { useGetHallmarkOrders, useGetUniqueKarigarsFromMappings } from "@/hooks/useQueries";
import { OrderType, Order } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HallmarkTabProps {
  onFilteredOrdersChange: (orders: Order[], isLoading: boolean) => void;
}

export default function HallmarkTab({ onFilteredOrdersChange }: HallmarkTabProps) {
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | "All">("All");
  const [searchText, setSearchText] = useState("");
  const [karigarFilter, setKarigarFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const { data: orders = [], isLoading } = useGetHallmarkOrders();
  const { data: uniqueKarigars = [] } = useGetUniqueKarigarsFromMappings();

  // Deduplicate karigar names
  const uniqueKarigarList = useMemo(() => {
    const karigarSet = new Set(uniqueKarigars);
    return Array.from(karigarSet).sort();
  }, [uniqueKarigars]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by order type
    if (orderTypeFilter !== "All") {
      result = result.filter((order) => order.orderType === orderTypeFilter);
    }

    // Filter by karigar name
    if (karigarFilter !== "All") {
      result = result.filter((order) => order.karigarName === karigarFilter);
    }

    // Filter by order number (search)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((order) =>
        order.orderNo.toLowerCase().includes(search)
      );
    }

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      result = result.filter((order) => {
        const orderDate = new Date(Number(order.createdAt) / 1000000);
        return isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });
      });
    }

    return result;
  }, [orders, orderTypeFilter, karigarFilter, searchText, dateRange]);

  // Notify parent of filtered orders changes
  useEffect(() => {
    onFilteredOrdersChange(filteredOrders, isLoading);
  }, [filteredOrders, isLoading, onFilteredOrdersChange]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          <Button
            variant={orderTypeFilter === "All" ? "default" : "outline"}
            onClick={() => setOrderTypeFilter("All")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={orderTypeFilter === OrderType.CO ? "default" : "outline"}
            onClick={() => setOrderTypeFilter(OrderType.CO)}
            size="sm"
          >
            CO
          </Button>
          <Button
            variant={orderTypeFilter === OrderType.RB ? "default" : "outline"}
            onClick={() => setOrderTypeFilter(OrderType.RB)}
            size="sm"
          >
            RB
          </Button>
        </div>
        <Select value={karigarFilter} onValueChange={setKarigarFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Karigars</SelectItem>
            {uniqueKarigarList.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order Number..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                : "Select date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-2">
              <div className="text-sm font-medium">From Date</div>
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange((prev) => ({ ...prev, from: startOfDay(date) }))}
              />
              <div className="text-sm font-medium">To Date</div>
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange((prev) => ({ ...prev, to: endOfDay(date) }))}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  setDateRange({
                    from: startOfDay(new Date()),
                    to: endOfDay(new Date()),
                  })
                }
              >
                Reset to Today
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <OrderTable orders={filteredOrders} />
    </div>
  );
}
