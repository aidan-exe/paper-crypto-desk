import type { EquityPoint } from "@/lib/ledger";
import { formatTs, formatZar } from "@/lib/ledger";

type Props = {
  points: EquityPoint[];
};

export function EquityChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No equity curve points yet.</p>
    );
  }

  const width = 720;
  const height = 220;
  const pad = { l: 64, r: 16, t: 18, b: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const values = points.map((p) => p.equity_zar);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padY = min === max ? Math.max(Math.abs(min) * 0.02, 1) : (max - min) * 0.12;
  const yMin = min - padY;
  const yMax = max + padY;
  const ySpan = yMax - yMin || 1;

  const xAt = (i: number) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (value: number) => pad.t + ((yMax - value) / ySpan) * innerH;

  const path = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(point.equity_zar).toFixed(2)}`)
    .join(" ");

  const area = `${path} L ${xAt(points.length - 1).toFixed(2)} ${pad.t + innerH} L ${xAt(0).toFixed(2)} ${pad.t + innerH} Z`;

  const ticks = [yMax, (yMin + yMax) / 2, yMin];

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Equity curve in ZAR"
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[280px]"
      >
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="#27272a"
              strokeDasharray="4 4"
            />
            <text
              x={pad.l - 8}
              y={yAt(tick) + 4}
              textAnchor="end"
              fill="#a1a1aa"
              fontSize="11"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {formatZar(tick)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#equityFill)" />
        <path d={path} fill="none" stroke="#34d399" strokeWidth="2.25" />
        {points.map((point, i) => (
          <circle
            key={`${point.ts}-${i}`}
            cx={xAt(i)}
            cy={yAt(point.equity_zar)}
            r="3.5"
            fill="#0a0a0a"
            stroke="#34d399"
            strokeWidth="1.75"
          >
            <title>
              {formatTs(point.ts)} · {formatZar(point.equity_zar)}
            </title>
          </circle>
        ))}
        <text
          x={pad.l}
          y={height - 10}
          fill="#71717a"
          fontSize="11"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {formatTs(points[0].ts)}
        </text>
        <text
          x={width - pad.r}
          y={height - 10}
          textAnchor="end"
          fill="#71717a"
          fontSize="11"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {formatTs(points[points.length - 1].ts)}
        </text>
      </svg>
    </div>
  );
}
