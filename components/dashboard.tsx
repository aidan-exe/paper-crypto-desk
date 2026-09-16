"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EquityChart } from "@/components/equity-chart";
import {
  formatCell,
  formatPct,
  formatTs,
  formatUsd,
  formatZar,
  markPriceList,
  parseLedger,
  parsePosition,
  recordEntries,
  tradeColumns,
  tradeRows,
  type Ledger,
} from "@/lib/ledger";

function pctClass(value: number | undefined): string {
  if (value === undefined) return "text-zinc-300";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-zinc-300";
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-6 text-center text-sm text-zinc-500">
      {message}
    </p>
  );
}

function formatTradeCell(col: string, value: unknown): string {
  if (col === "ts") return formatTs(String(value ?? ""));
  if (typeof value === "number") {
    if (col === "price_usd" || col === "avg_entry_usd") return formatUsd(value);
    if (col.endsWith("_zar")) return formatZar(value);
  }
  return formatCell(value);
}

function sideClass(side: unknown): string {
  if (side === "BUY") return "text-emerald-400";
  if (side === "SELL") return "text-rose-400";
  return "text-zinc-300";
}

export function Dashboard() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/ledger.json")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load /ledger.json (${res.status})`);
        }
        return parseLedger(await res.json());
      })
      .then((data) => {
        if (!cancelled) setLedger(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load ledger");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trades = useMemo(
    () => (ledger ? tradeRows(ledger.trades) : []),
    [ledger],
  );
  const tradeCols = useMemo(() => tradeColumns(trades), [trades]);
  const positionEntries = ledger ? recordEntries(ledger.positions) : [];
  const markedEntries = ledger
    ? recordEntries(ledger.last_mark.positions_marked ?? {})
    : [];
  const markPrices = useMemo(
    () => (ledger ? markPriceList(ledger) : []),
    [ledger],
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-6 text-rose-200">
        <p className="font-medium">Could not load the paper ledger.</p>
        <p className="mt-1 font-mono text-sm text-rose-300/80">{error}</p>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-sm text-zinc-500">
        Loading paper ledger…
      </div>
    );
  }

  const pnl = ledger.equity_zar - ledger.meta.start_bankroll_zar;
  const pnlPct =
    ledger.meta.start_bankroll_zar === 0
      ? 0
      : (pnl / ledger.meta.start_bankroll_zar) * 100;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent px-4 py-3 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400">
          PAPER ONLY · simulated money
        </p>
        <p className="mt-1 text-sm text-amber-100/90">
          {ledger.meta.warning} Mode {ledger.meta.mode}. No real exchange orders.
        </p>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Paper crypto desk
            {ledger.meta.strategy_version ? (
              <span className="ml-2 align-middle font-mono text-sm font-medium tracking-normal text-amber-400/90">
                {ledger.meta.strategy_version}
              </span>
            ) : null}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {ledger.meta.strategy}
          </p>
        </div>
        <p className="font-mono text-xs text-zinc-500">
          Started {formatTs(ledger.meta.started_at)}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Equity</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50 sm:text-3xl">
            {formatZar(ledger.equity_zar)}
          </p>
          <p className={`mt-1 font-mono text-sm ${pctClass(pnl)}`}>
            {pnl >= 0 ? "+" : ""}
            {formatZar(pnl)} ({formatPct(pnlPct)}) vs start
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Cash</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50 sm:text-3xl">
            {formatZar(ledger.cash_zar)}
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-500">
            Bankroll {formatZar(ledger.meta.start_bankroll_zar)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Universe</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(ledger.meta.assets.length > 0 ? ledger.meta.assets : ["—"]).map(
              (asset) => (
                <span
                  key={asset}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm font-semibold text-zinc-100"
                >
                  {asset}
                </span>
              ),
            )}
          </div>
          <p className="mt-2 font-mono text-sm text-zinc-500">
            {positionEntries.length} open
            {ledger.meta.max_open_notions != null
              ? ` / ${ledger.meta.max_open_notions}`
              : ""}{" "}
            · {ledger.trades.length} fills logged
            {ledger.meta.thresholds_pct?.buy != null &&
            ledger.meta.thresholds_pct?.sell != null
              ? ` · ±${ledger.meta.thresholds_pct.buy}%`
              : ""}
          </p>
        </div>
      </div>

      <Panel title="Equity curve">
        <EquityChart points={ledger.equity_curve} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Positions">
          {positionEntries.length === 0 ? (
            <EmptyState message="No positions yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="py-2 pr-3 font-medium">Asset</th>
                    <th className="py-2 pr-3 font-medium">Qty</th>
                    <th className="py-2 pr-3 font-medium">Avg</th>
                    <th className="py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {positionEntries.map(([asset, holding]) => {
                    const pos = parsePosition(holding);
                    return (
                      <tr key={asset} className="border-b border-zinc-800/70">
                        <td className="py-2 pr-3 font-mono font-medium text-zinc-200">
                          {asset}
                        </td>
                        {pos ? (
                          <>
                            <td className="py-2 pr-3 font-mono text-zinc-300">
                              {pos.qty !== undefined ? formatCell(pos.qty) : "—"}
                            </td>
                            <td className="py-2 pr-3 font-mono text-zinc-300">
                              {pos.avg_entry_usd !== undefined
                                ? formatUsd(pos.avg_entry_usd)
                                : "—"}
                            </td>
                            <td className="py-2 font-mono text-zinc-300">
                              {pos.cost_zar !== undefined
                                ? formatZar(pos.cost_zar)
                                : "—"}
                            </td>
                          </>
                        ) : (
                          <td
                            className="py-2 font-mono text-zinc-300"
                            colSpan={3}
                          >
                            {formatCell(holding)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Last trades">
          {trades.length === 0 ? (
            <EmptyState message="No trades yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    {tradeCols.map((col) => (
                      <th key={col} className="py-2 pr-3 font-medium">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, i) => (
                    <tr key={i} className="border-b border-zinc-800/70">
                      {tradeCols.map((col) => (
                        <td
                          key={col}
                          className={`py-2 pr-3 font-mono ${
                            col === "side" ? sideClass(trade.side) : "text-zinc-300"
                          }`}
                        >
                          {formatTradeCell(col, trade[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Last mark / decisions">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">Marked</dt>
            <dd className="mt-1 font-mono text-zinc-200">{formatTs(ledger.last_mark.ts)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">Source</dt>
            <dd className="mt-1 font-mono text-zinc-200">{ledger.last_mark.source}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">USD/ZAR</dt>
            <dd className="mt-1 font-mono text-zinc-200">
              {ledger.last_mark.usdzar.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">Fills this wake</dt>
            <dd className="mt-1 font-mono text-zinc-200">{ledger.last_mark.fills ?? 0}</dd>
          </div>
        </dl>
        {markPrices.length === 0 ? (
          <EmptyState message="No mark prices recorded" />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {markPrices.map((row) => (
              <div
                key={row.asset}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  {row.asset}-USD
                </p>
                <p className="mt-1 font-mono text-zinc-100">
                  {row.usd !== undefined ? formatUsd(row.usd) : "—"}
                </p>
                {row.chg_pct !== undefined ? (
                  <p className={`mt-0.5 font-mono text-sm ${pctClass(row.chg_pct)}`}>
                    {formatPct(row.chg_pct)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Decisions</p>
          {ledger.last_mark.decisions && ledger.last_mark.decisions.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {ledger.last_mark.decisions.map((line) => (
                <li
                  key={line}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 font-mono text-xs leading-5 text-zinc-300 sm:text-sm"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No decisions recorded" />
          )}
          {ledger.last_mark.usdzar_note ? (
            <p className="mt-3 text-xs text-zinc-500">{ledger.last_mark.usdzar_note}</p>
          ) : null}
        </div>
        {markedEntries.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-600">No marked positions.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Asset</th>
                  <th className="py-2 font-medium">Mark</th>
                </tr>
              </thead>
              <tbody>
                {markedEntries.map(([asset, mark]) => (
                  <tr key={asset} className="border-b border-zinc-800/70">
                    <td className="py-2 pr-3 font-mono text-zinc-200">{asset}</td>
                    <td className="py-2 font-mono text-zinc-300">{formatCell(mark)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
