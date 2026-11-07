import { cacheGet, cacheSet } from "@/lib/page-cache";
import { getDateRange } from "@/lib/dateRange";

const j = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

// Loads the Outbound page's data (default range: last 30 days) in the background right after the dashboard opens,
// under the same cache keys the page uses, so the first click on Outbound shows everything instantly.
export async function prefetchOutbound(): Promise<void> {
  const { from, to } = getDateRange("30d");
  const f = from.toISOString();
  const t = to.toISOString();
  const tPlusOne = new Date(to.getTime() + 86400000).toISOString();

  if (!cacheGet("outbound:30d")) {
    const [stats, volume, calls] = await Promise.allSettled([
      j(`/api/outbound-stats?from=${f}&to=${t}`),
      j(`/api/call-volume?from=${f}&to=${tPlusOne}`),
      j(`/api/calls?from=${f}&to=${t}&direction=outbound&page=1&limit=10`),
    ]);
    if (stats.status === "fulfilled" && volume.status === "fulfilled" && calls.status === "fulfilled") {
      cacheSet("outbound:30d", { stats: stats.value, volume: volume.value, recentCalls: (calls.value as { calls?: unknown[] }).calls ?? [] });
    }
  }

  if (!cacheGet("history:outbound:1|all||30d")) {
    const params = new URLSearchParams({ from: f, to: t, direction: "outbound", page: "1", limit: "25" });
    try {
      const data = (await j(`/api/calls?${params}`)) as { calls?: unknown[]; total?: number };
      cacheSet("history:outbound:1|all||30d", { calls: data.calls ?? [], total: data.total ?? 0 });
    } catch {
      // the page will load it itself
    }
  }
}
