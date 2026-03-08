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

  let orderMs: number | null = null;

  if (typeof od === "bigint") {
    if (od === BigInt(0)) return null;
    // Nanosecond timestamp — divide as BigInt to preserve precision
    orderMs = Number(od / BigInt(1_000_000));
  } else if (typeof od === "number") {
    if (od === 0) return null;
    if (od < 100000) {
      // Excel date serial
      orderMs = (od - 25569) * 86400 * 1000;
    } else if (od < 1e10) {
      orderMs = od * 1000; // seconds → ms
    } else if (od < 1e13) {
      orderMs = od; // already ms
    } else {
      orderMs = od / 1_000_000; // nanoseconds as number
    }
  } else if (typeof od === "string" && od.trim().length > 0) {
    const s = od.trim();
    // DD/MM/YYYY or DD-MM-YYYY (primary format used in this app)
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      orderMs = Date.UTC(Number(y), Number(m) - 1, Number(d));
    } else {
      // YYYY-MM-DD (ISO)
      const yyyymmdd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (yyyymmdd) {
        const [, y, m, d] = yyyymmdd;
        orderMs = Date.UTC(Number(y), Number(m) - 1, Number(d));
      }
      // NOTE: Do NOT use new Date(s) fallback — it interprets "12/02/2026"
      // as December 2 (MM/DD/YYYY) instead of February 12 (DD/MM/YYYY).
    }
  } else {
    return null;
  }

  if (orderMs === null || Number.isNaN(orderMs)) return null;

  // Sanity check: year 2000–2100
  if (orderMs < 946684800000 || orderMs > 4102444800000) return null;

  const nowMs = Date.now();
  // All orders are past-dated — negative days means a parsing error; always show positive
  return Math.floor(Math.abs(nowMs - orderMs) / (1000 * 60 * 60 * 24));
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
