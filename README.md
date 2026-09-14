# Paper crypto desk

Dark scoreboard for the paper BTC/ETH trader. It reads a checked-in snapshot at [`public/ledger.json`](public/ledger.json) (also served as `/ledger.json`) and shows:

- equity and cash (ZAR)
- positions
- last trades
- last mark / decisions
- equity curve

**PAPER ONLY.** Simulated money. No real exchange orders. No secrets.

## Refresh the snapshot (Ellie / paper trader)

Copy the fleet ledger into this repo and commit:

```bash
cp /home/box/sand-data/projects/paper-crypto/ledger.json public/ledger.json
git add public/ledger.json
git commit -m "Refresh paper ledger snapshot"
```

The dashboard fetches `/ledger.json` from `public/`. After the copy lands on `main`, the next deploy picks it up.

## Local

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```
