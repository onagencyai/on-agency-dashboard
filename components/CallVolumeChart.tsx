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

  const base0 = data.dates.map((date, i) => ({ date, label: date, value: (showOutbound ? data.outbound[i] : data.inbound[i]) ?? 0 }));
  // The line adapts to any range: hours stay hours, up to two weeks stay days, longer ranges are grouped into weeks
  // (or about-monthly groups for very long ranges), counted back from the latest day so the newest group is always full.
  const hourly = data.unit === "hour";
  const groupSize = hourly || base0.length <= 14 ? 1 : base0.length <= 100 ? 7 : 30;
  const grouped = groupSize > 1;
  const rows = grouped
    ? (() => {
        const out: { date: string; label: string; value: number }[] = [];
        for (let end = base0.length; end > 0; end -= groupSize) {
          const chunk = base0.slice(Math.max(0, end - groupSize), end);
          const first = chunk[0].date, last = chunk[chunk.length - 1].date;
          out.unshift({ date: chunk.length > 1 ? `${first} – ${last}` : first, label: first, value: chunk.reduce((a, r) => a + r.value, 0) });
        }
        return out;
      })()
    : base0;
  const n = rows.length;
  const unit = hourly ? "hour" : groupSize === 1 ? "day" : groupSize === 7 ? "week" : "month";
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches); }, []);
  const max = Math.max(1, ...rows.map((r) => r.value));
  // Whole-number scale on the left that follows the data: always 5 to 6 numbers (0 up to a round top), so the
  // height of the line reads as a real count whether the client gets 3 calls or 300.
  const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000];
  const yStep = STEPS.find((c) => Math.ceil(max / c) <= 5) ?? Math.ceil(max / 5);
  const yTop = Math.max(4, Math.ceil(max / yStep)) * yStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yTop; v += yStep) yTicks.push(v);
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
  const LABEL_H = 54, TOP = 14;
  const base = size.h - LABEL_H;
  const usable = Math.max(10, base - TOP);
  const PAD = 40, PAD_L = 52;
  const pts: Pt[] = rows.map((r, i) => ({ x: n <= 1 ? (PAD_L + size.w - PAD) / 2 : PAD_L + (i / (n - 1)) * (size.w - PAD_L - PAD), y: base - (r.value / yTop) * usable }));

  const stepPts: Pt[] = pts;
  const line = n > 1 ? monotonePath(stepPts) : "";
  const area = n > 1 ? `${line}L${pts[n - 1].x},${base}L${pts[0].x},${base}Z` : "";

  // Dates sit under the points at an equal step, spanning the whole graph from the first point to the last.
  // Show every point when they fit; otherwise use a step that divides the span evenly so both ends get a date.
  let labelIdx: number[] = rows.map((_, i) => i);
  const maxLabels = Math.max(2, Math.floor((size.w - PAD_L - PAD) / 74) + 1);
  if (n > maxLabels) {
    const span = n - 1;
    const minStep = Math.ceil(span / (maxLabels - 1));
    let step = 0;
    for (let c = minStep; c <= span; c++) if (span % c === 0) { step = c; break; }
    labelIdx = [];
    if (step && span / step >= 2) {
      for (let i = 0; i <= span; i += step) labelIdx.push(i);
    } else {
      // No even split that spans both ends: keep an equal step and center the dates under the graph.
      step = minStep;
      const k = Math.floor(span / step) + 1;
      const start = Math.round((span - (k - 1) * step) / 2);
      for (let j = 0; j < k; j++) labelIdx.push(start + j * step);
    }
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left - PAD_L) / Math.max(1, r.width - PAD_L - PAD);
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
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
        >
          <defs>
            <linearGradient id={`g${gid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--blue)", stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: "var(--blue)", stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          {yTicks.map((v) => {
            const y = base - (v / yTop) * usable;
            return (
              <g key={v}>
                <line x1={pts[0]?.x ?? PAD_L} x2={pts[n - 1]?.x ?? size.w - PAD} y1={y} y2={y} strokeDasharray="3 3" strokeWidth={1} style={{ stroke: "var(--border)" }} />
                <text x={34} y={y} dy="0.35em" textAnchor="end" fontSize={12} style={{ fill: "var(--text-secondary)" }}>{v}</text>
              </g>
            );
          })}
          {n > 1 && <path d={area} fill={`url(#g${gid})`} />}
          <path d={line} fill="none" style={{ stroke: "var(--blue)" }} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {n <= 14 && rows.map((r, i) => i !== active && (
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
