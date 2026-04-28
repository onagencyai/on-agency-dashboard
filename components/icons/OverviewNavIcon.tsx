import type { CSSProperties } from "react";

export default function OverviewNavIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
