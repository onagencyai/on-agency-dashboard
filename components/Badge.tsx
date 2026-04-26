import type { BadgeProps } from "@/lib/types";

export default function Badge({ variant, label }: BadgeProps) {
  const styles: Record<BadgeProps["variant"], string> = {
    success: "bg-[var(--green-bg)] text-[var(--green)]",
    failed: "bg-[var(--red-bg)] text-[var(--red)]",
    missed: "bg-[var(--red-bg)] text-[var(--red)]",
    voicemail: "bg-[var(--amber-bg)] text-[var(--amber)]",
    info: "bg-[var(--blue-bg)] text-[var(--blue)]",
    neutral: "bg-[var(--gray-badge-bg)] text-[var(--text-secondary)]",
  };

  return (
    <span
      className={`inline-flex items-center px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium leading-none whitespace-nowrap ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
