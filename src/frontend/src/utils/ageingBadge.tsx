import type { Time } from "@/backend";

interface AgeingBadgeProps {
  orderDate?: Time;
  className?: string;
}

function getDaysAgo(orderDate?: Time): number | null {
  // Handle Motoko Option<Time> serialised as JS array: [] = None, [bigint] = Some
  let od: unknown = orderDate;
  if (Array.isArray(od)) {
    if (od.length === 0) return null; // None
    od = od[0]; // Some(value)
  }
  if (od == null) return null;

  let orderMs: number;
  if (typeof od === "bigint") {
    if (od === BigInt(0)) return null;
    // Nanosecond timestamp — divide as BigInt to preserve precision
    orderMs = Number(od / BigInt(1_000_000));
  } else if (typeof od === "number") {
    if (od === 0) return null;
    orderMs = od < 1e13 ? od * 1000 : od / 1_000_000;
  } else {
    return null;
  }

  // Sanity check: year 2000–2100
  if (orderMs < 946684800000 || orderMs > 4102444800000) return null;

  const nowMs = Date.now();
  return Math.floor((nowMs - orderMs) / (1000 * 60 * 60 * 24));
}

export function AgeingBadge({ orderDate, className = "" }: AgeingBadgeProps) {
  const days = getDaysAgo(orderDate);
  if (days === null) return null;

  let colorClass = "";
  if (days <= 14) {
    colorClass =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
  } else if (days <= 29) {
    colorClass =
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
  } else {
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}
    >
      {days}d
    </span>
  );
}

export { getDaysAgo };
