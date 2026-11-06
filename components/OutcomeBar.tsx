interface OutcomeBarProps {
  counts: Record<string, number>;
}

// Groups call categories into four honest buckets. Spam and silent calls are shown
// separately so they never blur into the real conversations.
const GROUPS: { label: string; color: string; keys: string[] }[] = [
  { label: "Leads & bookings", color: "var(--green)", keys: ["lead", "booked"] },
  { label: "Messages & transfers", color: "var(--blue)", keys: ["message", "info", "transferred", "support"] },
  { label: "Questions & other", color: "var(--amber)", keys: ["question", "wants_person", "other"] },
  { label: "Spam, silent & wrong number", color: "var(--bg-4)", keys: ["spam", "no_conversation", "vendor", "wrong_number"] },
];

export default function OutcomeBar({ counts }: OutcomeBarProps) {
  const groups = GROUPS.map((g) => ({ ...g, n: g.keys.reduce((s, k) => s + (counts[k] ?? 0), 0) }));
  const total = groups.reduce((s, g) => s + g.n, 0);
  if (total === 0) {
    return <div style={{ display: "flex", height: 4, width: "80%", borderRadius: 2, background: "var(--bg-3)" }} />;
  }
  return (
    <div
      style={{ display: "flex", gap: 1, height: 4, width: "80%", borderRadius: 2, overflow: "hidden" }}
      role="img"
      aria-label={groups.filter((g) => g.n > 0).map((g) => `${g.label}: ${g.n}`).join(", ")}
    >
      {groups.filter((g) => g.n > 0).map((g) => (
        <div key={g.label} title={`${g.label}: ${g.n}`} style={{ flex: g.n, background: g.color, height: "100%" }} />
      ))}
    </div>
  );
}
