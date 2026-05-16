import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MACRO_EVENTS_2022, EVENT_TYPES, SEVERITY_COLORS } from "./data/marketData";
import { HOURLY_DATA } from "./data/hourlyData";
import CandlestickChart from "./components/CandlestickChart";
import "./App.css";

const START_CASH = 100_000;
const START_PRICE = HOURLY_DATA[0].price;
const TOTAL_BARS = HOURLY_DATA.length;

function formatCurrency(val) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}
function formatPct(val) {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatKey(bar) {
  if (!bar) return "";
  return `${formatDate(bar.date)} ${bar.hour}`;
}

// How many bars to show in the rolling window
const WINDOW = 91; // ~2 trading weeks of hourly bars

export default function App() {
  const [barIndex, setBarIndex] = useState(0);
  const [cash, setCash] = useState(START_CASH);
  const [shares, setShares] = useState(0);
  const [tradeQty, setTradeQty] = useState(10);
  const [trades, setTrades] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200); // ms per bar — 1× is leisurely trading pace
  const [activeEvent, setActiveEvent] = useState(null);
  const [notification, setNotification] = useState(null);
  const [tab, setTab] = useState("chart");
  const [seenEventDates, setSeenEventDates] = useState(new Set());

  const currentBar = HOURLY_DATA[barIndex];
  const currentPrice = currentBar.price;
  const portfolioValue = cash + shares * currentPrice;
  const totalReturn = ((portfolioValue - START_CASH) / START_CASH) * 100;
  const qqqReturn = ((currentPrice - START_PRICE) / START_PRICE) * 100;
  const alpha = totalReturn - qqqReturn;
  const maxBuy = Math.floor(cash / currentPrice);
  const progress = (barIndex / (TOTAL_BARS - 1)) * 100;

  // Windowed chart data: last WINDOW bars
  const chartData = useMemo(() => {
    const start = Math.max(0, barIndex - WINDOW + 1);
    return HOURLY_DATA.slice(start, barIndex + 1);
  }, [barIndex]);

  // Event reference lines visible in current window
  const eventLines = useMemo(() => {
    const keys = new Set(chartData.map(d => d.key));
    return chartData
      .filter(d => d.hasEvent)
      .map(d => ({ key: d.key, color: SEVERITY_COLORS[d.events[0]?.severity] }));
  }, [chartData]);

  const showNotif = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const advance = useCallback(() => {
    if (barIndex >= TOTAL_BARS - 1) { setIsPlaying(false); return; }
    const nextIndex = barIndex + 1;
    setBarIndex(nextIndex);
  }, [barIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(advance, speed);
    return () => clearTimeout(t);
  }, [isPlaying, advance, speed]);

  const buy = () => {
    const cost = currentPrice * tradeQty;
    if (cost > cash) { showNotif("Insufficient cash!", "error"); return; }
    setCash(c => c - cost);
    setShares(s => s + tradeQty);
    setTrades(t => [...t, { key: currentBar.key, date: currentBar.date, hour: currentBar.hour, type: "BUY", qty: tradeQty, price: currentPrice }]);
    showNotif(`Bought ${tradeQty} @ $${currentPrice.toFixed(2)}`, "success");
  };

  const sell = () => {
    if (tradeQty > shares) { showNotif("Not enough shares!", "error"); return; }
    setCash(c => c + currentPrice * tradeQty);
    setShares(s => s - tradeQty);
    setTrades(t => [...t, { key: currentBar.key, date: currentBar.date, hour: currentBar.hour, type: "SELL", qty: tradeQty, price: currentPrice }]);
    showNotif(`Sold ${tradeQty} @ $${currentPrice.toFixed(2)}`, "success");
  };

  const reset = () => {
    setBarIndex(0); setCash(START_CASH); setShares(0); setTrades([]);
    setIsPlaying(false); setSeenEventDates(new Set());
  };

  // Nearby events within ±3 trading days (±21 bars)
  const nearbyEvents = useMemo(() => {
    const nearby = [];
    const seen = new Set();
    for (let i = Math.max(0, barIndex - 21); i < Math.min(TOTAL_BARS, barIndex + 22); i++) {
      const b = HOURLY_DATA[i];
      if (b.events?.length > 0) {
        b.events.forEach(e => {
          if (!seen.has(e.date + e.title)) {
            seen.add(e.date + e.title);
            nearby.push(e);
          }
        });
      }
    }
    return nearby.slice(0, 5);
  }, [barIndex]);

  // Events seen so far
  const seenEvents = useMemo(() => {
    const seen = [];
    const seenKeys = new Set();
    for (let i = 0; i <= barIndex; i++) {
      const b = HOURLY_DATA[i];
      if (b.events?.length > 0) {
        b.events.forEach(e => {
          if (!seenKeys.has(e.title)) {
            seenKeys.add(e.title);
            seen.unshift(e);
          }
        });
      }
    }
    return seen;
  }, [barIndex]);

  return (
    <div className="app">
      {notification && (
        <div className={`notification notif-${notification.type}`}>{notification.msg}</div>
      )}

      {/* Event detail modal */}
      {activeEvent && (
        <div className="modal-overlay" onClick={() => setActiveEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-event-type" style={{ color: EVENT_TYPES[activeEvent.type]?.color }}>
              {EVENT_TYPES[activeEvent.type]?.icon} {EVENT_TYPES[activeEvent.type]?.label}
              <span className="severity-badge" style={{ background: SEVERITY_COLORS[activeEvent.severity] }}>{activeEvent.severity}</span>
            </div>
            <div className="modal-event-title">{activeEvent.title}</div>
            <div className="modal-event-date">{formatDate(activeEvent.date)}</div>
            <div className="modal-event-desc">{activeEvent.description}</div>
            <div className="modal-factors">
              {activeEvent.affectedFactors.map((f, i) => <span key={i} className="factor-tag">{f}</span>)}
            </div>
            <button className="btn btn-neutral" style={{ marginTop: "1rem" }} onClick={() => setActiveEvent(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">QQQ<span>SIM</span></div>
          <div className="year-badge">2022 · Hourly Bars</div>
        </div>
        <div className="header-right">
          <div className="header-stat">
            <span className="stat-label">PORTFOLIO</span>
            <span className="stat-value">{formatCurrency(portfolioValue)}</span>
          </div>
          <div className="header-stat">
            <span className="stat-label">RETURN</span>
            <span className={`stat-value ${totalReturn >= 0 ? "pos" : "neg"}`}>{formatPct(totalReturn)}</span>
          </div>
          <div className="header-stat">
            <span className="stat-label">α ALPHA</span>
            <span className={`stat-value ${alpha >= 0 ? "pos" : "neg"}`}>{formatPct(alpha)}</span>
          </div>
          <div className="header-stat">
            <span className="stat-label">SHARES</span>
            <span className="stat-value">{shares}</span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <div className="progress-labels">
          <span>Jan 3, 2022</span>
          <span className="progress-mid">{formatKey(currentBar)}</span>
          <span>Dec 30, 2022</span>
        </div>
      </div>

      <div className="layout">
        {/* Left: chart + tabs */}
        <div className="left-col">
          <div className="tabs">
            {["chart", "trades", "events"].map(t => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "chart" ? "📈 Chart" : t === "trades" ? "📋 Trades" : "📰 Events"}
              </button>
            ))}
          </div>

          {tab === "chart" && (
            <div className="chart-wrap">
              <div className="chart-meta">
                <span className="chart-price" style={{ color: currentBar.close >= currentBar.open ? "#10b981" : "#f43f5e" }}>
                  ${currentPrice.toFixed(2)}
                </span>
                <span className="chart-ohlc-row">
                  O {currentBar.open} · H {currentBar.high} · L {currentBar.low} · C {currentBar.close}
                </span>
                <span className={`chart-ytd ${qqqReturn >= 0 ? "pos" : "neg"}`}>{formatPct(qqqReturn)} YTD</span>
              </div>

              <div className="candle-chart-wrap">
                <CandlestickChart
                  data={chartData}
                  eventLines={eventLines}
                  width={860}
                  height={320}
                />
              </div>

              {/* Playback controls */}
              <div className="playback">
                <button className="btn btn-sm" onClick={() => setBarIndex(i => Math.max(0, i - 1))} disabled={barIndex === 0}>‹</button>
                <button className="btn btn-sm" onClick={() => setBarIndex(i => Math.max(0, i - 7))} disabled={barIndex === 0}>◂◂ Day</button>
                <button className={`btn ${isPlaying ? "btn-pause" : "btn-play"}`} onClick={() => setIsPlaying(p => !p)}>
                  {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button className="btn btn-sm" onClick={() => setBarIndex(i => Math.min(TOTAL_BARS - 1, i + 7))}>Day ▸▸</button>
                <button className="btn btn-sm" onClick={advance} disabled={barIndex >= TOTAL_BARS - 1}>›</button>
                <button className="btn btn-sm btn-reset" onClick={reset}>↺</button>
              </div>

              {/* Speed selector */}
              <div className="speed-row">
                <span className="speed-label">Speed</span>
                {[{ label: "0.5×", ms: 2400 }, { label: "1×", ms: 1200 }, { label: "2×", ms: 600 }, { label: "5×", ms: 240 }, { label: "10×", ms: 120 }].map(s => (
                  <button
                    key={s.ms}
                    className={`btn btn-xs ${speed === s.ms ? "speed-active" : ""}`}
                    onClick={() => setSpeed(s.ms)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "trades" && (
            <div className="trade-log">
              {trades.length === 0 ? (
                <div className="empty-state">No trades yet.</div>
              ) : (
                <table className="trade-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Qty</th><th>Price</th><th>Value</th></tr></thead>
                  <tbody>
                    {[...trades].reverse().map((t, i) => (
                      <tr key={i}>
                        <td>{formatDate(t.date)}</td>
                        <td style={{ color: "var(--text-dim)" }}>{t.hour}</td>
                        <td><span className={`trade-badge ${t.type === "BUY" ? "badge-buy" : "badge-sell"}`}>{t.type}</span></td>
                        <td>{t.qty}</td>
                        <td>${t.price.toFixed(2)}</td>
                        <td>{formatCurrency(t.qty * t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "events" && (
            <div className="events-list">
              {seenEvents.length === 0 && <div className="empty-state">No events yet. Advance time to reveal.</div>}
              {seenEvents.map((e, i) => (
                <div key={i} className="event-item" onClick={() => setActiveEvent(e)}>
                  <span className="event-icon">{EVENT_TYPES[e.type]?.icon}</span>
                  <div className="event-item-body">
                    <div className="event-item-title">{e.title}</div>
                    <div className="event-item-meta">{formatDate(e.date)} · {EVENT_TYPES[e.type]?.label}</div>
                  </div>
                  <span className="sev-dot" style={{ background: SEVERITY_COLORS[e.severity] }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: trading panel */}
        <div className="right-col">
          <div className="price-card">
            <div className="ticker">QQQ · {currentBar.hour}</div>
            <div className="price-big" style={{ color: currentBar.close >= currentBar.open ? "#10b981" : "#f43f5e" }}>
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`price-ytd ${qqqReturn >= 0 ? "pos" : "neg"}`}>{formatPct(qqqReturn)} YTD</div>
            <div className="price-date-label">{formatDate(currentBar.date)}</div>
            <div className="ohlc-mini">
              <span>O <b>{currentBar.open}</b></span>
              <span>H <b style={{color:"#10b981"}}>{currentBar.high}</b></span>
              <span>L <b style={{color:"#f43f5e"}}>{currentBar.low}</b></span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Portfolio</div>
            <div className="port-row"><span>Cash</span><span>{formatCurrency(cash)}</span></div>
            <div className="port-row"><span>Shares</span><span>{shares} shares</span></div>
            <div className="port-row"><span>Equity</span><span>{formatCurrency(shares * currentPrice)}</span></div>
            <div className="divider" />
            <div className="port-row port-total"><span>Total</span><span className={totalReturn >= 0 ? "pos" : "neg"}>{formatCurrency(portfolioValue)}</span></div>
            <div className="port-row"><span>P&amp;L</span><span className={totalReturn >= 0 ? "pos" : "neg"}>{formatCurrency(portfolioValue - START_CASH)}</span></div>
            <div className="port-row"><span>vs QQQ (α)</span><span className={alpha >= 0 ? "pos" : "neg"}>{formatPct(alpha)}</span></div>
          </div>

          <div className="card">
            <div className="card-title">Trade</div>
            <div className="qty-row">
              <button className="qty-btn" onClick={() => setTradeQty(q => Math.max(1, q - 5))}>−</button>
              <input className="qty-input" type="number" min={1} value={tradeQty}
                onChange={e => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))} />
              <button className="qty-btn" onClick={() => setTradeQty(q => q + 5)}>+</button>
            </div>
            <div className="trade-cost">≈ {formatCurrency(currentPrice * tradeQty)}</div>
            <div className="trade-btns">
              <button className="btn btn-buy" onClick={buy} disabled={currentPrice * tradeQty > cash}>Buy {tradeQty}</button>
              <button className="btn btn-sell" onClick={sell} disabled={tradeQty > shares}>Sell {tradeQty}</button>
            </div>
            <div className="quick-row">
              <button className="btn btn-xs" onClick={() => setTradeQty(Math.max(1, Math.floor(maxBuy * 0.25)))}>25%</button>
              <button className="btn btn-xs" onClick={() => setTradeQty(Math.max(1, Math.floor(maxBuy * 0.5)))}>50%</button>
              <button className="btn btn-xs" onClick={() => setTradeQty(Math.max(1, maxBuy))}>Max</button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events — full width below the main layout */}
      <div className="recent-events-panel">
        <div className="recent-events-header">
          <span className="card-title" style={{ marginBottom: 0 }}>📰 Recent Events</span>
          <span className="recent-events-count">{seenEvents.length} logged</span>
        </div>
        {seenEvents.length === 0 && (
          <div className="empty-state" style={{ padding: "20px" }}>No events yet — advance time to reveal macro catalysts.</div>
        )}
        <div className="recent-events-grid">
          {seenEvents.slice(0, 12).map((e, i) => (
            <div key={i} className="recent-event-card" onClick={() => setActiveEvent(e)}>
              <div className="rec-event-top">
                <span className="rec-event-icon">{EVENT_TYPES[e.type]?.icon}</span>
                <span className="severity-badge" style={{ background: SEVERITY_COLORS[e.severity] }}>{e.severity}</span>
              </div>
              <div className="rec-event-title">{e.title}</div>
              <div className="rec-event-meta">
                <span style={{ color: EVENT_TYPES[e.type]?.color }}>{EVENT_TYPES[e.type]?.label}</span>
                <span>{formatDate(e.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
