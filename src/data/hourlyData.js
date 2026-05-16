/**
 * Intraday bar generator for QQQ 2022 simulator.
 *
 * Strategy:
 * - Each trading day has 6.5 hours = 7 hourly bars (9:30, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30)
 * - We interpolate between real daily close prices using realistic intraday volatility profiles
 * - On macro event days we inject a directional shock at the appropriate hour
 * - Seeded PRNG so results are deterministic (same "historical" replay every time)
 */

import { QQQ_2022, MACRO_EVENTS_2022 } from "./marketData.js";

// Market hours as display labels
export const MARKET_HOURS = ["9:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30"];

// Intraday volatility weights by hour slot (open & close are noisier)
const VOL_PROFILE = [1.6, 0.9, 0.7, 0.65, 0.75, 0.9, 1.4];

// Seeded pseudo-random number generator (mulberry32)
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal variate using our seeded rng
function randn(rng) {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Given two consecutive daily closes, generate 7 hourly bars for `day`.
 * prevClose  → open of first bar
 * todayClose → close of last bar
 */
function generateDayBars(date, prevClose, todayClose, dayEvents, rng) {
  const totalMove = todayClose - prevClose;

  // Distribute the total daily move across 7 bars using vol-weighted random walk
  // then rescale so the sum matches totalMove exactly
  const rawSteps = VOL_PROFILE.map((w, i) => {
    let base = randn(rng) * w;
    // On event days inject a directional shock at hour 1 (10:30) or 2 (11:30)
    if (dayEvents.length > 0 && (i === 1 || i === 2)) {
      const impact = dayEvents[0].impact === "BULLISH" ? 1 : -1;
      base += impact * w * 1.8;
    }
    return base;
  });

  const rawSum = rawSteps.reduce((a, b) => a + b, 0);
  // Scale so cumulative sum ends at totalMove
  const scale = rawSum !== 0 ? totalMove / rawSum : 0;
  const steps = rawSteps.map(s => s * scale);

  // Build price path
  const bars = [];
  let price = prevClose;
  MARKET_HOURS.forEach((hour, i) => {
    const open = i === 0 ? prevClose : bars[i - 1].close;
    const close = i === MARKET_HOURS.length - 1 ? todayClose : open + steps[i];
    const noise = Math.abs(randn(rng)) * Math.abs(steps[i]) * 0.6 + 0.05;
    const high = Math.max(open, close) + Math.abs(noise);
    const low = Math.min(open, close) - Math.abs(noise);
    bars.push({
      date,
      hour,
      // Unique key for chart x-axis
      key: `${date} ${hour}`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      price: +close.toFixed(2), // alias for area chart
      volume: Math.floor(3_000_000 + rng() * 8_000_000),
      hasEvent: dayEvents.length > 0 && (i === 1 || i === 2),
      events: (i === 1 || i === 2) ? dayEvents : [],
      isOpen: i === 0,
      isClose: i === MARKET_HOURS.length - 1,
    });
    price = close;
  });

  return bars;
}

/**
 * Build the full 2022 hourly dataset.
 * Returns array of ~1,638 bar objects.
 */
export function buildHourlyData() {
  const bars = [];
  // Map events by date for quick lookup
  const eventsByDate = {};
  MACRO_EVENTS_2022.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  for (let i = 0; i < QQQ_2022.length; i++) {
    const today = QQQ_2022[i];
    const prev = QQQ_2022[i - 1];
    const prevClose = prev ? prev.price : today.price;
    const dayEvents = eventsByDate[today.date] || [];

    // Seed per day so it's deterministic
    const seed = today.date.replace(/-/g, "") | 0;
    const rng = makeRng(seed + i * 997);

    const dayBars = generateDayBars(today.date, prevClose, today.price, dayEvents, rng);
    bars.push(...dayBars);
  }

  return bars;
}

// Pre-build once and export
export const HOURLY_DATA = buildHourlyData();

// Helper: get index of first bar for a given date
export function getFirstBarIndexForDate(date) {
  return HOURLY_DATA.findIndex(b => b.date === date);
}
