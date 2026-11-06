"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CallVolumeData } from "@/lib/types";

interface CallVolumeChartProps {
  data: CallVolumeData;
  showOutbound?: boolean;
  /** Optional totals shown top right, like Mercury's money in / money out. */
  summary?: { up?: string; down?: string };
  /** Plain range under the title, for example "Oct 7 – Nov 6". */
  rangeLabel?: string;
}

type Pt = { x: number; y: number };

// Smooth line through the points that never overshoots the data (monotone cubic, like d3's curveMonotoneX).
function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / (dx[i] || 1);
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    d += `C${pts[i].x + dx[i] / 3},${pts[i].y + (t[i] * dx[i]) / 3} ${pts[i + 1].x - dx[i] / 3},${pts[i + 1].y - (t[i + 1] * dx[i]) / 3} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

// Area chart in the style of Mercury's balance graph. The header row above it follows your cursor or finger:
// it shows the day, that day's calls, and the change against the day before.
export default function CallVolumeChart({ data, showOutbound = true, summary, rangeLabel }: CallVolumeChartProps) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 200 });
  const [hover, setHover] = useState<number | null>(null);

  const daily = data.dates.map((date, i) => ({ date, label: date, value: (showOutbound ? data.outbound[i] : data.inbound[i]) ?? 0 }));
  // Long ranges (30 days and up) are grouped into weeks, counted back from the latest day, so the line stays calm and readable.
  const weekly = daily.length >= 28;
  const rows = weekly
    ? (() => {
        const out: { date: string; label: string; value: number }[] = [];
        for (let end = daily.length; end > 0; end -= 7) {
          const chunk = daily.slice(Math.max(0, end - 7), end);
          const first = chunk[0].date, last = chunk[chunk.length - 1].date;
          out.unshift({ date: chunk.length > 1 ? `${first} – ${last}` : first, label: first, value: chunk.reduce((a, r) => a + r.value, 0) });
        }
        return out;
      })()
    : daily;
  const n = rows.length;
  const unit = weekly ? "week" : "day";
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches); }, []);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const busiest = rows.reduce((b, r) => (r.value > b.value ? r : b), { date: "", value: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(120, el.clientHeight) }));
    ro.observe(el);
    setSize({ w: Math.max(200, el.clientWidth), h: Math.max(120, el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  // Room under the graph so the dates never crowd the line.
  const LABEL_H = 46, TOP = 14;
  const base = size.h - LABEL_H;
  const usable = Math.max(10, base - TOP);
  const PAD = weekly ? 28 : 0;
  const pts: Pt[] = rows.map((r, i) => ({ x: n <= 1 ? size.w / 2 : PAD + (i / (n - 1)) * (size.w - 2 * PAD), y: base - (r.value / max) * usable }));

  // Each day is a short flat step that eases into the next one, which is how Mercury's balance graph reads.
  const half = n > 1 && !weekly ? (size.w / (n - 1)) * 0.14 : 0;
  const stepPts: Pt[] = [];
  if (weekly) stepPts.push(...pts);
  else pts.forEach((p, i) => {
    stepPts.push({ x: i === 0 ? 0 : p.x - half, y: p.y });
    stepPts.push({ x: i === n - 1 ? size.w : p.x + half, y: p.y });
  });
  const line = n > 1 ? monotonePath(stepPts) : "";
  const area = n > 1 ? `${line}L${pts[n - 1].x},${base}L${pts[0].x},${base}Z` : "";

  // Five dates exactly the same number of days apart, centered under the graph.
  let labelIdx: number[] = rows.map((_, i) => i);
  if (n >= 6) {
    const step = Math.max(1, Math.floor((n - 1) / 5));
    const start = Math.round(((n - 1) - 4 * step) / 2);
    labelIdx = [0, 1, 2, 3, 4].map((k) => start + k * step);
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    setHover(Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))));
  }

  // On a phone nothing hovers, so the latest period is selected by default and a tap moves it.
  const active = hover !== null ? hover : touch && n > 0 ? n - 1 : null;
  const hovered = active !== null ? rows[active] : null;
  const prevVal = active !== null && active > 0 ? rows[active - 1].value : null;
  const diff = hovered && prevVal !== null ? hovered.value - prevVal : null;
  const upColor = "var(--green-text)";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 210 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minHeight: 24 }}>
        <span className="num" style={{ fontSize: 14, color: "var(--text-primary)" }}>
          {hovered ? (
            <>
              {hovered.date} <span style={{ color: "var(--text-secondary)" }}>·</span>{" "}
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{hovered.value} {hovered.value === 1 ? "call" : "calls"}</span>
            </>
          ) : n > 0 ? (
            rangeLabel ?? `${rows[0].date} – ${rows[n - 1].date}`
          ) : null}
        </span>
        <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 13 }}>
          {hovered ? (
            diff !== null && diff !== 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: diff > 0 ? upColor : "var(--red)" }}>
                {diff > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {diff > 0 ? "+" : "−"}{Math.abs(diff)} vs {unit} before
              </span>
            ) : null
          ) : summary && (summary.up || summary.down) ? (
            <>
              {summary.up && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: upColor }}><ArrowUpRight size={13} />{summary.up}</span>}
              {summary.down && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--red)" }}><ArrowDownRight size={13} />{summary.down}</span>}
            </>
          ) : busiest.value > 0 ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: upColor }}><ArrowUpRight size={13} />{busiest.value} on {busiest.date}</span>
          ) : null}
        </span>
      </div>

      <div ref={wrapRef} style={{ position: "relative", flex: 1, minHeight: 150, margin: "6px -20px -20px" }}>
        <svg
          width={size.w}
          height={size.h}
          style={{ display: "block", touchAction: "pan-y", cursor: "crosshair" }}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`g${gid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--blue)", stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: "var(--blue)", stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          {n > 1 && <path d={area} fill={`url(#g${gid})`} />}
          <path d={line} fill="none" style={{ stroke: "var(--blue)" }} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {weekly && rows.map((r, i) => i !== active && (
            <circle key={i} cx={pts[i].x} cy={pts[i].y} r={3} style={{ fill: "var(--bg-1)", stroke: "var(--blue)" }} strokeWidth={1.5} />
          ))}
          {active !== null && pts[active] && (
            <g>
              <line x1={pts[active].x} x2={pts[active].x} y1={pts[active].y} y2={base} style={{ stroke: "var(--blue)" }} strokeWidth={1} />
              <circle cx={pts[active].x} cy={pts[active].y} r={4.5} style={{ fill: "var(--bg-1)", stroke: "var(--blue)" }} strokeWidth={2} />
            </g>
          )}
          {labelIdx.map((i) => (
            <text key={i} x={Math.min(size.w - 22, Math.max(22, pts[i]?.x ?? 0))} y={size.h - 14} textAnchor="middle" fontSize={12} style={{ fill: "var(--text-secondary)" }}>
              {rows[i]?.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
