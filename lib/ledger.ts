export type EquityPoint = {
  ts: string;
  equity_zar: number;
};

export type LedgerMeta = {
  mode: string;
  start_bankroll_zar: number;
  assets: string[];
  strategy: string;
  started_at: string;
  warning: string;
};

export type LastMark = {
  ts: string;
  source: string;
  usdzar: number;
  usdzar_note?: string;
  btc_usd?: number;
  btc_24h_pct?: number;
  eth_usd?: number;
  eth_24h_pct?: number;
  positions_marked?: Record<string, unknown>;
  decisions?: string[];
  fills?: number;
};

export type Ledger = {
  meta: LedgerMeta;
  cash_zar: number;
  positions: Record<string, unknown>;
  equity_zar: number;
  trades: unknown[];
  equity_curve: EquityPoint[];
  last_mark: LastMark;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function parseLedger(data: unknown): Ledger {
  if (!isRecord(data) || !isRecord(data.meta) || !isRecord(data.last_mark)) {
    throw new Error("ledger.json is missing meta or last_mark");
  }

  const curveRaw = Array.isArray(data.equity_curve) ? data.equity_curve : [];
  const equity_curve: EquityPoint[] = curveRaw.flatMap((point) => {
    if (!isRecord(point)) return [];
    return [{ ts: asString(point.ts), equity_zar: asNumber(point.equity_zar) }];
  });

  const assets = Array.isArray(data.meta.assets)
    ? data.meta.assets.filter((asset): asset is string => typeof asset === "string")
    : [];

  return {
    meta: {
      mode: asString(data.meta.mode, "PAPER_ONLY"),
      start_bankroll_zar: asNumber(data.meta.start_bankroll_zar),
      assets,
      strategy: asString(data.meta.strategy),
      started_at: asString(data.meta.started_at),
      warning: asString(data.meta.warning),
    },
    cash_zar: asNumber(data.cash_zar),
    positions: isRecord(data.positions) ? data.positions : {},
    equity_zar: asNumber(data.equity_zar),
    trades: Array.isArray(data.trades) ? data.trades : [],
    equity_curve,
    last_mark: {
      ts: asString(data.last_mark.ts),
      source: asString(data.last_mark.source),
      usdzar: asNumber(data.last_mark.usdzar),
      usdzar_note:
        typeof data.last_mark.usdzar_note === "string"
          ? data.last_mark.usdzar_note
          : undefined,
      btc_usd:
        typeof data.last_mark.btc_usd === "number"
          ? data.last_mark.btc_usd
          : undefined,
      btc_24h_pct:
        typeof data.last_mark.btc_24h_pct === "number"
          ? data.last_mark.btc_24h_pct
          : undefined,
      eth_usd:
        typeof data.last_mark.eth_usd === "number"
          ? data.last_mark.eth_usd
          : undefined,
      eth_24h_pct:
        typeof data.last_mark.eth_24h_pct === "number"
          ? data.last_mark.eth_24h_pct
          : undefined,
      positions_marked: isRecord(data.last_mark.positions_marked)
        ? data.last_mark.positions_marked
        : {},
      decisions: Array.isArray(data.last_mark.decisions)
        ? data.last_mark.decisions.filter(
            (line): line is string => typeof line === "string",
          )
        : [],
      fills: asNumber(data.last_mark.fills),
    },
  };
}

const zarFmt = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatZar(value: number): string {
  return zarFmt.format(value);
}

export function formatUsd(value: number): string {
  return usdFmt.format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}%`;
}

export function formatTs(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toLocaleString("en-ZA", { maximumFractionDigits: 8 });
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordEntries(value: Record<string, unknown>): [string, unknown][] {
  return Object.entries(value);
}

export function tradeRows(trades: unknown[]): Record<string, unknown>[] {
  return trades.filter(isRecord);
}

export function tradeColumns(rows: Record<string, unknown>[]): string[] {
  const preferred = ["ts", "asset", "side", "qty", "price_zar", "notional_zar", "fee_zar"];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) seen.add(key);
  }
  const rest = [...seen].filter((key) => !preferred.includes(key)).sort();
  return [...preferred.filter((key) => seen.has(key)), ...rest];
}
