import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  primary: string;
  secondary: string;
}

export default function EmptyState({ icon: Icon, primary, secondary }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <Icon size={20} className="text-[var(--text-tertiary)]" />
      <p className="text-[14px] text-[var(--text-secondary)]">{primary}</p>
      <p className="text-[13px] text-[var(--text-tertiary)]">{secondary}</p>
    </div>
  );
}
