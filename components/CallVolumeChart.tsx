"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CallVolumeData } from "@/lib/types";

interface CallVolumeChartProps {
  data: CallVolumeData;
  showOutbound?: boolean;
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

// Area chart in the style of Mercury's balance graph: the big number is the total for the period,
// and moving across the chart (mouse or finger) shows that day's calls instead.
export default function CallVolumeChart({ data, showOutbound = true }: CallVolumeChartProps) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 200 });
  const [hover, setHover] = useState<number | null>(null);

  const label = showOutbound ? "Outbound calls" : "Calls";
  const rows = data.dates.map((date, i) => ({ date, value: (showOutbound ? data.outbound[i] : data.inbound[i]) ?? 0 }));
  const n = rows.length;
  const total = rows.reduce((s, r) => s + r.value, 0);
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

  const LABEL_H = 30, TOP = 14;
  const base = size.h - LABEL_H;
  const usable = Math.max(10, base - TOP);
  // Each day is a short flat step that eases into the next one, which is how Mercury's balance graph reads.
  const pts: Pt[] = rows.map((r, i) => ({ x: n <= 1 ? size.w / 2 : (i / (n - 1)) * size.w, y: base - (r.value / max) * usable }));
  const half = n > 1 ? (size.w / (n - 1)) * 0.14 : 0;
  const stepPts: Pt[] = [];
  pts.forEach((p, i) => {
    stepPts.push({ x: i === 0 ? 0 : p.x - half, y: p.y });
    stepPts.push({ x: i === n - 1 ? size.w : p.x + half, y: p.y });
  });
  const line = n > 1 ? monotonePath(stepPts) : "";
  const area = n > 1 ? `${line}L${size.w},${base}L0,${base}Z` : "";

  const labelIdx = n >= 5 ? [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => Math.round(f * (n - 1))) : rows.map((_, i) => i);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    setHover(Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))));
  }

  const hovered = hover !== null ? rows[hover] : null;
  const prevVal = hover !== null && hover > 0 ? rows[hover - 1].value : null;
  const diff = hovered && prevVal !== null ? hovered.value - prevVal : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 240 }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</div>
      <div className="num" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: "40px", color: "var(--ink)", marginTop: 2 }}>
        {hovered ? hovered.value : total}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, fontSize: 14, color: "var(--text-primary)", minHeight: 22 }}>
        <span>{hovered ? hovered.date : n > 0 ? `${rows[0].date} – ${rows[n - 1].date}` : ""}</span>
        <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: diff !== null && diff < 0 ? "var(--red)" : "var(--green-text)" }}>
          {hovered ? (
            diff !== null && diff !== 0 ? (
              <>
                {diff > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {diff > 0 ? "+" : "−"}{Math.abs(diff)} vs day before
              </>
            ) : null
          ) : busiest.value > 0 ? (
            <>
              <ArrowUpRight size={13} />
              {busiest.value} on {busiest.date}
            </>
          ) : null}
        </span>
      </div>

      <div ref={wrapRef} style={{ position: "relative", flex: 1, minHeight: 150, margin: "10px -20px -20px" }}>
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
          {hover !== null && pts[hover] && (
            <g>
              <line x1={pts[hover].x} x2={pts[hover].x} y1={pts[hover].y} y2={base} style={{ stroke: "var(--blue)" }} strokeWidth={1} />
              <circle cx={pts[hover].x} cy={pts[hover].y} r={4.5} style={{ fill: "var(--bg-1)", stroke: "var(--blue)" }} strokeWidth={2} />
            </g>
          )}
          {labelIdx.map((i) => (
            <text key={i} x={pts[i]?.x ?? 0} y={size.h - 9} textAnchor="middle" fontSize={12} style={{ fill: "var(--text-secondary)" }}>
              {rows[i]?.date}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
