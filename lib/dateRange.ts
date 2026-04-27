import type { TimeRange } from "./types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "60d":
      from.setDate(from.getDate() - 60);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

export function formatDateRange(from: Date, to: Date): string {
  const fromStr = `${MONTHS[from.getMonth()]} ${from.getDate()}`;
  const toStr = `${MONTHS[to.getMonth()]} ${to.getDate()}, ${to.getFullYear()}`;
  return `${fromStr} – ${toStr}`;
}
