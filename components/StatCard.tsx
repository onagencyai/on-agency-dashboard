interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export default function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 flex flex-col gap-1"
      style={{ minHeight: 104 }}
    >
      <span
        className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </span>
      <span className="text-[30px] font-semibold text-[var(--text-primary)] leading-tight mt-1">
        {value}
      </span>
      {subtext && (
        <span className="text-[12px] text-[var(--text-tertiary)]">{subtext}</span>
      )}
    </div>
  );
}
