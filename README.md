# QQQ Market Simulator — 2022 Bear Market Edition

A day-accurate, interactive paper trading simulator for QQQ (Nasdaq-100 ETF) through the brutal 2022 bear market.

## Features

- 📈 **Real Price Data** — QQQ sampled across all of 2022, from the January peak ($400) to the December bottom ($260)
- 📰 **25 Macro Events** — Fed rate hikes, CPI prints, geopolitical shocks, and landmark earnings
- 🎮 **Paper Trading** — Buy/sell QQQ with $100K starting cash; track your P&L vs the index
- ⚡ **Event Engine** — Sim pauses when a market-moving event hits; you decide how to react
- 📊 **Alpha Tracking** — See if you can beat or outperform a buy-and-hold strategy
- 🔍 **Nearby Events** — Always see what macro catalysts are approaching

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## The Year: 2022

QQQ fell ~33% in 2022 — the worst year for tech since 2008. 25 real macro events modeled including:

- Feb 24: Russia Invades Ukraine
- Jun 16: Fed +75bps — Largest Hike Since 1994
- Jul 14: CPI 9.1% — 41-Year High
- Aug 26: Powell Jackson Hole "Pain Ahead" speech
- Nov 10: CPI 7.7% — Peak Inflation narrative
- Dec 22: BOJ Yield Curve Control surprise

## Tech Stack

- React 18 + Vite
- Recharts
- No external data APIs — all historical data embedded

## Architecture

```
src/
  data/marketData.js    # QQQ prices + 25 macro events
  App.jsx               # Main simulator
  App.css               # Terminal-dark trading aesthetic
```
