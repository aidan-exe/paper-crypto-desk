# Paper crypto desk

Dark scoreboard for the paper crypto trader (strategy **v1.2**, universe BTC / ETH / SOL / XRP / DOT / AVAX / LINK). It reads a checked-in snapshot at [`public/ledger.json`](public/ledger.json) (also served as `/ledger.json`) and shows:

- equity and cash (ZAR)
- positions
- last trades
- last mark / decisions (all assets in `last_mark.prices`)
- equity curve

**PAPER ONLY.** Simulated money. No real exchange orders. No secrets.

## Refresh the snapshot (Ellie / paper trader)

Copy the fleet ledger into this repo and commit. Canonical path:

```bash
cp /home/box/agent-data/projects/paper-crypto/ledger.json public/ledger.json
git add public/ledger.json
git commit -m "Refresh paper ledger snapshot"
```

The same content also lives on the sand-data twin (`/home/box/sand-data/projects/paper-crypto/ledger.json`). Durable auto-sync is out of scope for this repo; the v1 sync is a snapshot commit of `public/ledger.json`. After the copy lands on `main`, the next deploy picks it up.

## Local

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```
