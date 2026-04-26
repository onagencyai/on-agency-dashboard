interface LogoMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function LogoMark({ size = 26, className = "", style }: LogoMarkProps) {
  const width = Math.round((size * 1377) / 932);
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 1377 932"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <line
        x1="71.7163"
        y1="52.5088"
        x2="422.457"
        y2="255.009"
        stroke="currentColor"
        strokeWidth="105"
        strokeLinecap="round"
      />
      <line
        x1="953.716"
        y1="657.509"
        x2="1304.46"
        y2="860.009"
        stroke="currentColor"
        strokeWidth="105"
        strokeLinecap="round"
      />
      <line
        x1="954.216"
        y1="255.009"
        x2="1304.96"
        y2="52.5088"
        stroke="currentColor"
        strokeWidth="105"
        strokeLinecap="round"
      />
      <line
        x1="72.2163"
        y1="860.009"
        x2="422.957"
        y2="657.509"
        stroke="currentColor"
        strokeWidth="105"
        strokeLinecap="round"
      />
    </svg>
  );
}
