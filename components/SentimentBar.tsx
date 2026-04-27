interface SentimentBarProps {
  positive: number;
  neutral: number;
  negative: number;
}

export default function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  const total = positive + neutral + negative;
  if (total === 0) {
    return (
      <div style={{ display: "flex", gap: 1, height: 4, width: "80%", borderRadius: 2, background: "var(--bg-3)" }} />
    );
  }

  const posW = (positive / total) * 100;
  const neuW = (neutral / total) * 100;
  const negW = (negative / total) * 100;

  return (
    <div style={{ display: "flex", gap: 1, height: 4, width: "80%", borderRadius: 2, overflow: "hidden" }}>
      {posW > 0 && (
        <div style={{ flex: posW, background: "var(--green)", height: "100%" }} />
      )}
      {neuW > 0 && (
        <div style={{ flex: neuW, background: "var(--amber)", height: "100%" }} />
      )}
      {negW > 0 && (
        <div style={{ flex: negW, background: "var(--red)", height: "100%" }} />
      )}
    </div>
  );
}
