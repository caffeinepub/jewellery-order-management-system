import { useMemo, useState } from "react";
import { useGetAllOrders } from "@/hooks/useQueries";
import OrderTable from "./OrderTable";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { OrderType, OrderStatus } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function HallmarkTab() {
  const { data: allOrders = [], isLoading } = useGetAllOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<string>("all");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const statusMatch =
        order.status === OrderStatus.Hallmark ||
        order.status === OrderStatus.ReturnFromHallmark;

      if (!statusMatch) return false;

      const searchMatch =
        searchQuery === "" ||
        order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.design.toLowerCase().includes(searchQuery.toLowerCase());

      const typeMatch =
        selectedOrderType === "all" || order.orderType === selectedOrderType;

      const karigarMatch =
        selectedKarigar === "all" || order.karigarName === selectedKarigar;

      let dateMatch = true;
      if (dateRange.from || dateRange.to) {
        const orderDate = new Date(Number(order.updatedAt) / 1000000);
        if (dateRange.from && dateRange.to) {
          dateMatch = isWithinInterval(orderDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          });
        } else if (dateRange.from) {
          dateMatch = orderDate >= startOfDay(dateRange.from);
        } else if (dateRange.to) {
          dateMatch = orderDate <= endOfDay(dateRange.to);
        }
      }

      return searchMatch && typeMatch && karigarMatch && dateMatch;
    });
  }, [allOrders, searchQuery, selectedOrderType, selectedKarigar, dateRange]);

  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    allOrders.forEach((order) => {
      if (
        order.karigarName &&
        (order.status === OrderStatus.Hallmark ||
          order.status === OrderStatus.ReturnFromHallmark)
      ) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [allOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading hallmark orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or design..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedOrderType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType("all")}
            className={
              selectedOrderType === "all" ? "bg-gold hover:bg-gold-hover" : ""
            }
          >
            All
          </Button>
          <Button
            variant={selectedOrderType === OrderType.CO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.CO)}
            className={
              selectedOrderType === OrderType.CO
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            CO
          </Button>
          <Button
            variant={selectedOrderType === OrderType.RB ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.RB)}
            className={
              selectedOrderType === OrderType.RB
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            RB
          </Button>
        </div>
        <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Karigars</SelectItem>
            {uniqueKarigars.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[200px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd")} -{" "}
                    {format(dateRange.to, "MMM dd")}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, yyyy")
                )
              ) : (
                "Pick a date"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={2}
            />
            {(dateRange.from || dateRange.to) && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({})}
                  className="w-full"
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <OrderTable orders={filteredOrders} />
    </div>
  );
}
