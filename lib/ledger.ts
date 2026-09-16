export type EquityPoint = {
  ts: string;
  equity_zar: number;
};

export type ThresholdsPct = {
  buy?: number;
  sell?: number;
};

export type LedgerMeta = {
  mode: string;
  start_bankroll_zar: number;
  assets: string[];
  strategy: string;
  started_at: string;
  warning: string;
  strategy_version?: string;
  thresholds_pct?: ThresholdsPct;
  strategy_updated_at?: string;
  strategy_note?: string;
  max_open_notions?: number;
};

export type AssetPrice = {
  usd: number;
  chg_pct?: number;
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
  prices?: Record<string, AssetPrice>;
  positions_marked?: Record<string, unknown>;
  decisions?: string[];
  fills?: number;
  strategy_version?: string;
};

export type Position = {
  qty?: number;
  avg_entry_usd?: number;
  cost_zar?: number;
};

export type MarkPriceRow = {
  asset: string;
  usd?: number;
  chg_pct?: number;
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

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parsePrices(raw: unknown): Record<string, AssetPrice> | undefined {
  if (!isRecord(raw)) return undefined;
  const prices: Record<string, AssetPrice> = {};
  for (const [asset, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const usd = asOptionalNumber(value.usd);
    if (usd === undefined) continue;
    prices[asset] = {
      usd,
      chg_pct: asOptionalNumber(value.chg_pct),
    };
  }
  return Object.keys(prices).length > 0 ? prices : undefined;
}

function parseThresholds(raw: unknown): ThresholdsPct | undefined {
  if (!isRecord(raw)) return undefined;
  const buy = asOptionalNumber(raw.buy);
  const sell = asOptionalNumber(raw.sell);
  if (buy === undefined && sell === undefined) return undefined;
  return { buy, sell };
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

  const strategyVersion = asString(data.meta.strategy_version);
  const lastMarkStrategyVersion = asString(data.last_mark.strategy_version);
  const strategyUpdatedAt = asString(data.meta.strategy_updated_at);
  const strategyNote = asString(data.meta.strategy_note);

  return {
    meta: {
      mode: asString(data.meta.mode, "PAPER_ONLY"),
      start_bankroll_zar: asNumber(data.meta.start_bankroll_zar),
      assets,
      strategy: asString(data.meta.strategy),
      started_at: asString(data.meta.started_at),
      warning: asString(data.meta.warning),
      strategy_version: strategyVersion || undefined,
      thresholds_pct: parseThresholds(data.meta.thresholds_pct),
      strategy_updated_at: strategyUpdatedAt || undefined,
      strategy_note: strategyNote || undefined,
      max_open_notions: asOptionalNumber(data.meta.max_open_notions),
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
      prices: parsePrices(data.last_mark.prices),
      positions_marked: isRecord(data.last_mark.positions_marked)
        ? data.last_mark.positions_marked
        : {},
      decisions: Array.isArray(data.last_mark.decisions)
        ? data.last_mark.decisions.filter(
            (line): line is string => typeof line === "string",
          )
        : [],
      fills: asNumber(data.last_mark.fills),
      strategy_version: lastMarkStrategyVersion || undefined,
    },
  };
}

/** Ordered mark cards from last_mark.prices, falling back to legacy btc_/eth_ fields. */
export function markPriceList(ledger: Ledger): MarkPriceRow[] {
  const last = ledger.last_mark;
  const fromMap = new Map<string, MarkPriceRow>();

  if (last.prices) {
    for (const [asset, price] of Object.entries(last.prices)) {
      fromMap.set(asset, {
        asset,
        usd: price.usd,
        chg_pct: price.chg_pct,
      });
    }
  }

  if (fromMap.size === 0) {
    if (typeof last.btc_usd === "number") {
      fromMap.set("BTC", {
        asset: "BTC",
        usd: last.btc_usd,
        chg_pct: last.btc_24h_pct,
      });
    }
    if (typeof last.eth_usd === "number") {
      fromMap.set("ETH", {
        asset: "ETH",
        usd: last.eth_usd,
        chg_pct: last.eth_24h_pct,
      });
    }
  }

  const seen = new Set<string>();
  const ordered: MarkPriceRow[] = [];
  for (const asset of ledger.meta.assets) {
    ordered.push(fromMap.get(asset) ?? { asset });
    seen.add(asset);
  }
  for (const [asset, row] of fromMap) {
    if (!seen.has(asset)) ordered.push(row);
  }
  return ordered;
}

export function parsePosition(value: unknown): Position | null {
  if (!isRecord(value)) return null;
  const qty = asOptionalNumber(value.qty);
  const avg_entry_usd = asOptionalNumber(value.avg_entry_usd);
  const cost_zar = asOptionalNumber(value.cost_zar);
  if (qty === undefined && avg_entry_usd === undefined && cost_zar === undefined) {
    return null;
  }
  return { qty, avg_entry_usd, cost_zar };
}

const zarFmt = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatZar(value: number): string {
  return zarFmt.format(value);
}

export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
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
    return Number.isInteger(value)
      ? String(value)
      : value.toLocaleString("en-ZA", { maximumFractionDigits: 8 });
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
  const preferred = [
    "ts",
    "asset",
    "side",
    "qty",
    "price_usd",
    "price_zar",
    "usdzar",
    "spend_zar",
    "notional_zar",
    "fee_zar",
    "rationale",
  ];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) seen.add(key);
  }
  const rest = [...seen].filter((key) => !preferred.includes(key)).sort();
  return [...preferred.filter((key) => seen.has(key)), ...rest];
}
