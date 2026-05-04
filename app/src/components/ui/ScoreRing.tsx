interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ score, size = 64, strokeWidth = 6 }: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(score / 100, 1) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 60
        ? "var(--color-brand)"
        : score >= 40
          ? "var(--color-warning)"
          : "var(--color-danger)";

  const fontSize = Math.round(size * 0.26);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-label={`Score: ${Math.round(score)}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 500ms ease-out" }}
      />
      <text
        x={cx}
        y={cy}
        dominantBaseline="middle"
        textAnchor="middle"
        style={{
          transform: `rotate(90deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          fill: color,
          fontSize,
          fontWeight: 700,
          fontFamily: "Nunito Sans, sans-serif",
        }}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}
