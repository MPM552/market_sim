import { useMemo, useRef, useState } from "react";
import { EVENT_TYPES, SEVERITY_COLORS } from "../data/marketData";

const MARGIN = { top: 12, right: 8, bottom: 28, left: 62 };

function niceYTicks(min, max, count = 6) {
  const range = max - min;
  const step = Math.ceil(range / count / 5) * 5;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step; v += step) ticks.push(v);
  return ticks;
}

export default function CandlestickChart({ data, eventLines, width = 800, height = 340 }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const { candles, xScale, yScale, yTicks, xTicks } = useMemo(() => {
    if (!data || data.length === 0) return { candles: [], xScale: () => 0, yScale: () => 0, yTicks: [], xTicks: [] };

    const prices = data.flatMap(d => [d.high, d.low]);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const pad = (rawMax - rawMin) * 0.06;
    const yMin = rawMin - pad;
    const yMax = rawMax + pad;

    const n = data.length;
    const candleW = Math.max(2, Math.floor(innerW / n) - 1);
    const halfW = Math.floor(candleW / 2);

    const xScale = i => MARGIN.left + (i + 0.5) * (innerW / n);
    const yScale = v => MARGIN.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    const yTicks = niceYTicks(yMin, yMax, 6);

    // X-axis ticks: show date label every ~13 candles (≈ 2 days)
    const tickEvery = Math.max(1, Math.floor(n / 10));
    const xTicks = data
      .map((d, i) => ({ i, d }))
      .filter(({ i }) => i % tickEvery === 0 || i === n - 1);

    const candles = data.map((d, i) => {
      const x = xScale(i);
      const bullish = d.close >= d.open;
      const color = bullish ? "#10b981" : "#f43f5e";
      const bodyTop = yScale(Math.max(d.open, d.close));
      const bodyBot = yScale(Math.min(d.open, d.close));
      const bodyH = Math.max(bodyBot - bodyTop, 1);
      const wickTop = yScale(d.high);
      const wickBot = yScale(d.low);
      return { i, x, color, bullish, bodyTop, bodyH, wickTop, wickBot, halfW, candleW, d };
    });

    return { candles, xScale, yScale, yTicks, xTicks };
  }, [data, innerW, innerH]);

  // Event reference line x positions
  const eventLineXs = useMemo(() => {
    return eventLines
      .map(el => {
        const idx = data.findIndex(d => d.key === el.key);
        if (idx < 0) return null;
        return { x: MARGIN.left + (idx + 0.5) * (innerW / data.length), color: el.color };
      })
      .filter(Boolean);
  }, [eventLines, data, innerW]);

  const handleMouseMove = (e) => {
    if (!svgRef.current || !data.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (width / rect.width);
    const relX = mx - MARGIN.left;
    const idx = Math.floor(relX / (innerW / data.length));
    if (idx >= 0 && idx < data.length) setHovered({ idx, bar: data[idx] });
    else setHovered(null);
  };

  const tooltipX = hovered
    ? Math.min(
        MARGIN.left + (hovered.idx + 0.5) * (innerW / data.length),
        width - 160
      )
    : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "100%", display: "block" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Grid lines */}
      {yTicks.map(t => {
        const y = MARGIN.top + innerH - ((t - (Math.min(...yTicks))) / (Math.max(...yTicks) - Math.min(...yTicks))) * innerH;
        // recalc properly via closure
        return null;
      })}

      {/* Proper grid using yScale */}
      {candles.length > 0 && (() => {
        const prices = data.flatMap(d => [d.high, d.low]);
        const rawMin = Math.min(...prices);
        const rawMax = Math.max(...prices);
        const pad = (rawMax - rawMin) * 0.06;
        const yMin = rawMin - pad;
        const yMax = rawMax + pad;
        const ys = (v) => MARGIN.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
        const ticks = niceYTicks(yMin, yMax, 6);

        return (
          <g>
            {/* Y grid + labels */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line
                  x1={MARGIN.left} x2={MARGIN.left + innerW}
                  y1={ys(t)} y2={ys(t)}
                  stroke="#1e293b" strokeWidth={1}
                />
                <text x={MARGIN.left - 6} y={ys(t) + 4} textAnchor="end" fill="#64748b" fontSize={10}>
                  ${t}
                </text>
              </g>
            ))}

            {/* Event reference lines */}
            {eventLineXs.map((el, i) => (
              <line
                key={i}
                x1={el.x} x2={el.x}
                y1={MARGIN.top} y2={MARGIN.top + innerH}
                stroke={el.color} strokeWidth={1} strokeDasharray="4 3" opacity={0.55}
              />
            ))}

            {/* Candles */}
            {candles.map(c => (
              <g key={c.i} opacity={hovered?.idx === c.i ? 1 : 0.92}>
                {/* Wick */}
                <line
                  x1={c.x} x2={c.x}
                  y1={c.wickTop} y2={c.wickBot}
                  stroke={c.color} strokeWidth={1}
                />
                {/* Body */}
                <rect
                  x={c.x - c.halfW}
                  y={c.bodyTop}
                  width={c.candleW}
                  height={c.bodyH}
                  fill={c.color}
                  fillOpacity={0.85}
                  rx={0.5}
                />
                {/* Event dot on top of wick */}
                {c.d.hasEvent && (
                  <circle
                    cx={c.x} cy={c.wickTop - 5} r={3}
                    fill={SEVERITY_COLORS[c.d.events?.[0]?.severity] ?? "#f59e0b"}
                    stroke="#080c14" strokeWidth={1}
                  />
                )}
              </g>
            ))}

            {/* Hover crosshair */}
            {hovered && (() => {
              const hx = MARGIN.left + (hovered.idx + 0.5) * (innerW / data.length);
              const hy = ys(hovered.bar.close);
              return (
                <g>
                  <line x1={hx} x2={hx} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={hy} y2={hy} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
                  <rect x={MARGIN.left + innerW + 2} y={hy - 9} width={42} height={18} fill="#0d1829" rx={3} />
                  <text x={MARGIN.left + innerW + 24} y={hy + 4} textAnchor="middle" fill="#22d3ee" fontSize={10} fontWeight="bold">
                    ${hovered.bar.close}
                  </text>
                </g>
              );
            })()}

            {/* X-axis ticks */}
            {xTicks.map(({ i, d }) => {
              const x = MARGIN.left + (i + 0.5) * (innerW / data.length);
              const label = d.date
                ? new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "";
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={MARGIN.top + innerH} y2={MARGIN.top + innerH + 4} stroke="#334155" strokeWidth={1} />
                  <text x={x} y={MARGIN.top + innerH + 15} textAnchor="middle" fill="#64748b" fontSize={10}>
                    {label}
                  </text>
                  {d.hour && (
                    <text x={x} y={MARGIN.top + innerH + 25} textAnchor="middle" fill="#334155" fontSize={9}>
                      {d.hour}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Axes */}
            <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="#1a2535" strokeWidth={1} />
            <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={MARGIN.top + innerH} y2={MARGIN.top + innerH} stroke="#1a2535" strokeWidth={1} />
          </g>
        );
      })()}

      {/* Tooltip */}
      {hovered && (() => {
        const bar = hovered.bar;
        const bullish = bar.close >= bar.open;
        const tx = Math.min(tooltipX + 12, width - 168);
        const ty = MARGIN.top + 10;
        const events = bar.events ?? [];
        const boxH = 62 + events.length * 18;
        return (
          <g>
            <rect x={tx} y={ty} width={160} height={boxH} fill="#0d1829" rx={5} stroke="#243044" strokeWidth={1} />
            <text x={tx + 8} y={ty + 16} fill="#64748b" fontSize={10}>{bar.date} {bar.hour}</text>
            <text x={tx + 8} y={ty + 30} fill="#94a3b8" fontSize={10}>
              O <tspan fill={bullish ? "#10b981" : "#f43f5e"}>{bar.open}</tspan>
              {"  "}H <tspan fill="#10b981">{bar.high}</tspan>
            </text>
            <text x={tx + 8} y={ty + 44} fill="#94a3b8" fontSize={10}>
              L <tspan fill="#f43f5e">{bar.low}</tspan>
              {"  "}C <tspan fill={bullish ? "#10b981" : "#f43f5e"} fontWeight="bold">{bar.close}</tspan>
            </text>
            {events.map((e, i) => (
              <text key={i} x={tx + 8} y={ty + 60 + i * 18} fill={SEVERITY_COLORS[e.severity]} fontSize={9}>
                {EVENT_TYPES[e.type]?.icon} {e.title.slice(0, 22)}…
              </text>
            ))}
          </g>
        );
      })()}
    </svg>
  );
}
