import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, X, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type OverdueSortDirection = "mostOverdueFirst" | "mostRecentFirst" | null;
export type OverdueFilterThreshold = 15 | 7 | 3 | null;

interface OverdueFilterControlProps {
  sortDirection: OverdueSortDirection;
  filterThreshold: OverdueFilterThreshold;
  onSortChange: (direction: OverdueSortDirection) => void;
  onFilterChange: (threshold: OverdueFilterThreshold) => void;
  onClear: () => void;
}

export default function OverdueFilterControl({
  sortDirection,
  filterThreshold,
  onSortChange,
  onFilterChange,
  onClear,
}: OverdueFilterControlProps) {
  const [open, setOpen] = useState(false);

  const isActive = sortDirection !== null || filterThreshold !== null;

  const handleSortClick = (direction: OverdueSortDirection) => {
    onSortChange(sortDirection === direction ? null : direction);
  };

  const handleFilterClick = (threshold: OverdueFilterThreshold) => {
    onFilterChange(filterThreshold === threshold ? null : threshold);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={`gap-1.5 ${isActive ? "bg-gold hover:bg-gold-hover text-gold-foreground" : ""}`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Overdue Filter</span>
          {isActive && (
            <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold leading-none">
              {[sortDirection, filterThreshold].filter(Boolean).length}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          {/* Sort Section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sort by Age
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleSortClick("mostOverdueFirst")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                  sortDirection === "mostOverdueFirst"
                    ? "bg-gold/15 text-foreground font-medium border border-gold/30"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-base">🔴</span>
                Most Overdue First
                {sortDirection === "mostOverdueFirst" && (
                  <span className="ml-auto text-xs text-gold font-bold">✓</span>
                )}
              </button>
              <button
                onClick={() => handleSortClick("mostRecentFirst")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                  sortDirection === "mostRecentFirst"
                    ? "bg-gold/15 text-foreground font-medium border border-gold/30"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-base">🟢</span>
                Most Recent First
                {sortDirection === "mostRecentFirst" && (
                  <span className="ml-auto text-xs text-gold font-bold">✓</span>
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* Quick Filter Section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Quick Filter
            </p>
            <div className="flex flex-col gap-1">
              {([15, 7, 3] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => handleFilterClick(days)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                    filterThreshold === days
                      ? "bg-gold/15 text-foreground font-medium border border-gold/30"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      days === 15
                        ? "bg-red-400"
                        : days === 7
                        ? "bg-orange-400"
                        : "bg-yellow-400"
                    }`}
                  />
                  {days}+ days pending
                  {filterThreshold === days && (
                    <span className="ml-auto text-xs text-gold font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {isActive && (
            <>
              <Separator />
              <button
                onClick={handleClear}
                className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
