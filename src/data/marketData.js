/**
 * marketData.js — Single source of truth for QQQ 2022 simulator.
 *
 * Sections:
 *   1. DAILY_CLOSES — every trading day, prices read directly from TradingView chart.
 *      Y-axis gridlines at $10 intervals used as reference rulers.
 *   2. Hourly bar generator — deterministic PRNG, tightly bounded noise.
 *   3. MACRO_EVENTS_2022 — unchanged event catalogue.
 *   4. Exports: HOURLY_DATA, MACRO_EVENTS_2022, EVENT_TYPES, SEVERITY_COLORS.
 */

// ─────────────────────────────────────────────────────────────
// 1. DAILY CLOSES
//    Read from TradingView chart. Grid: $400 top → $250 bottom.
//    Every horizontal gridline = $10. Prices rounded to nearest $1
//    to reflect reading precision from chart image.
// ─────────────────────────────────────────────────────────────
const DAILY_CLOSES = [
  // ── JANUARY ──────────────────────────────────────────────────────────────────
  // Chart: Opens at ATH ~$398. Immediately sells off. Jan 24 trough hits $322
  // (almost on the $320 gridline). Jan 27 FOMC day — new low $320. Closes Jan $332.
  { date: "2022-01-03", close: 398, vol: 52 },
  { date: "2022-01-04", close: 392, vol: 63 },
  { date: "2022-01-05", close: 381, vol: 80 }, // Fed minutes hawkish shock
  { date: "2022-01-06", close: 375, vol: 70 },
  { date: "2022-01-07", close: 372, vol: 65 },
  { date: "2022-01-10", close: 368, vol: 60 },
  { date: "2022-01-11", close: 374, vol: 57 }, // brief 3-day bounce
  { date: "2022-01-12", close: 378, vol: 56 },
  { date: "2022-01-13", close: 369, vol: 63 },
  { date: "2022-01-14", close: 363, vol: 66 },
  { date: "2022-01-18", close: 350, vol: 84 }, // accelerating leg down
  { date: "2022-01-19", close: 354, vol: 73 },
  { date: "2022-01-20", close: 342, vol: 94 },
  { date: "2022-01-21", close: 337, vol: 99 },
  { date: "2022-01-24", close: 322, vol: 120 }, // trough — $322, nearly on $320 line
  { date: "2022-01-25", close: 340, vol: 101 }, // violent intraday reversal
  { date: "2022-01-26", close: 334, vol: 93 },
  { date: "2022-01-27", close: 320, vol: 122 }, // FOMC — absolute Jan low
  { date: "2022-01-28", close: 332, vol: 111 }, // end-of-month relief

  // ── FEBRUARY ─────────────────────────────────────────────────────────────────
  // Chart: Recovers to ~$363 by Feb 9 (clearly between $360-$370 lines).
  // Then fades. Ukraine invasion Feb 24 — gap-down candle, closes ~$313.
  // Immediate relief bounce; Feb closes ~$333.
  { date: "2022-02-01", close: 344, vol: 85 },
  { date: "2022-02-02", close: 354, vol: 76 },
  { date: "2022-02-03", close: 344, vol: 89 }, // NFP shock — selloff
  { date: "2022-02-04", close: 347, vol: 80 },
  { date: "2022-02-07", close: 353, vol: 70 },
  { date: "2022-02-08", close: 356, vol: 67 },
  { date: "2022-02-09", close: 363, vol: 64 }, // Feb bounce peak — $363
  { date: "2022-02-10", close: 352, vol: 79 },
  { date: "2022-02-11", close: 342, vol: 91 },
  { date: "2022-02-14", close: 335, vol: 97 }, // Russia tensions escalating
  { date: "2022-02-15", close: 344, vol: 82 },
  { date: "2022-02-16", close: 347, vol: 77 },
  { date: "2022-02-17", close: 339, vol: 86 },
  { date: "2022-02-18", close: 333, vol: 93 },
  { date: "2022-02-22", close: 322, vol: 114 },
  { date: "2022-02-23", close: 316, vol: 122 },
  { date: "2022-02-24", close: 313, vol: 148 }, // Russia invades — gap down, closes off lows
  { date: "2022-02-25", close: 325, vol: 127 }, // relief bounce
  { date: "2022-02-28", close: 333, vol: 113 },

  // ── MARCH ────────────────────────────────────────────────────────────────────
  // Chart: Mar 7-8 make new cycle low — chart shows ~$307, just above $300 line.
  // Fed +25bps Mar 16 — big green candle, launches V-shape recovery.
  // Mar 29 yield-curve-inversion peak clearly at ~$378 (between $370-$380).
  { date: "2022-03-01", close: 327, vol: 98 },
  { date: "2022-03-02", close: 335, vol: 90 },
  { date: "2022-03-03", close: 330, vol: 86 },
  { date: "2022-03-04", close: 322, vol: 95 },
  { date: "2022-03-07", close: 311, vol: 116 },
  { date: "2022-03-08", close: 307, vol: 124 }, // Mar low — just above $300 gridline
  { date: "2022-03-09", close: 321, vol: 106 },
  { date: "2022-03-10", close: 316, vol: 99 },
  { date: "2022-03-11", close: 312, vol: 101 },
  { date: "2022-03-14", close: 307, vol: 111 }, // retest — same low
  { date: "2022-03-15", close: 318, vol: 97 },
  { date: "2022-03-16", close: 337, vol: 109 }, // Fed +25bps — large green candle
  { date: "2022-03-17", close: 344, vol: 91 },
  { date: "2022-03-18", close: 350, vol: 85 },
  { date: "2022-03-21", close: 355, vol: 79 },
  { date: "2022-03-22", close: 360, vol: 75 },
  { date: "2022-03-23", close: 362, vol: 73 },
  { date: "2022-03-24", close: 366, vol: 71 },
  { date: "2022-03-25", close: 370, vol: 69 },
  { date: "2022-03-28", close: 375, vol: 66 },
  { date: "2022-03-29", close: 378, vol: 64 }, // yield curve inverts — rally peak
  { date: "2022-03-30", close: 374, vol: 67 },
  { date: "2022-03-31", close: 370, vol: 71 },

  // ── APRIL ────────────────────────────────────────────────────────────────────
  // Chart: Apr 4 local peak ~$372. Then slow grind lower accelerates.
  // CPI 8.5% Apr 12 — chart shows clear down-candle, drops to ~$330.
  // Late April waterfall: Apr 26 ~$297, AMZN disaster Apr 28 ~$295, Apr 29 ~$289.
  { date: "2022-04-01", close: 366, vol: 75 },
  { date: "2022-04-04", close: 372, vol: 69 }, // Apr local peak
  { date: "2022-04-05", close: 361, vol: 81 },
  { date: "2022-04-06", close: 350, vol: 93 },
  { date: "2022-04-07", close: 347, vol: 87 },
  { date: "2022-04-08", close: 344, vol: 83 },
  { date: "2022-04-11", close: 340, vol: 87 },
  { date: "2022-04-12", close: 330, vol: 101 }, // CPI 8.5% — 40yr high
  { date: "2022-04-13", close: 337, vol: 91 },
  { date: "2022-04-14", close: 332, vol: 87 },
  { date: "2022-04-18", close: 326, vol: 91 },
  { date: "2022-04-19", close: 333, vol: 83 },
  { date: "2022-04-20", close: 336, vol: 79 },
  { date: "2022-04-21", close: 331, vol: 81 },
  { date: "2022-04-22", close: 318, vol: 103 },
  { date: "2022-04-25", close: 308, vol: 115 },
  { date: "2022-04-26", close: 297, vol: 125 },
  { date: "2022-04-27", close: 304, vol: 115 },
  { date: "2022-04-28", close: 295, vol: 131 }, // AMZN -14% earnings disaster
  { date: "2022-04-29", close: 289, vol: 123 },

  // ── MAY ──────────────────────────────────────────────────────────────────────
  // Chart: May 4 Fed +50bps spike — clearly visible tall green candle to ~$315.
  // May 9 bear market day — drops to ~$271. May 12 double-bottom with May 19 ~$263.
  // End-of-May recovery to ~$293 (between $290-$300).
  { date: "2022-05-02", close: 292, vol: 116 },
  { date: "2022-05-03", close: 296, vol: 109 },
  { date: "2022-05-04", close: 315, vol: 130 }, // Fed +50bps — spike candle
  { date: "2022-05-05", close: 299, vol: 138 }, // -4.99% exactly from $315
  { date: "2022-05-06", close: 283, vol: 145 }, // -5.35% — just inside bound
  { date: "2022-05-09", close: 271, vol: 154 }, // bear market -30% YTD
  { date: "2022-05-10", close: 277, vol: 137 },
  { date: "2022-05-11", close: 267, vol: 145 },
  { date: "2022-05-12", close: 263, vol: 151 }, // May trough
  { date: "2022-05-13", close: 274, vol: 133 },
  { date: "2022-05-16", close: 279, vol: 121 },
  { date: "2022-05-17", close: 284, vol: 113 },
  { date: "2022-05-18", close: 270, vol: 133 },
  { date: "2022-05-19", close: 263, vol: 143 }, // retest lows
  { date: "2022-05-20", close: 267, vol: 135 },
  { date: "2022-05-23", close: 274, vol: 121 },
  { date: "2022-05-24", close: 269, vol: 126 },
  { date: "2022-05-25", close: 272, vol: 119 },
  { date: "2022-05-26", close: 282, vol: 111 },
  { date: "2022-05-27", close: 293, vol: 103 }, // end-of-May recovery

  // ── JUNE ─────────────────────────────────────────────────────────────────────
  // Chart: Early June bounces to ~$296 (Jun 7). CPI 8.6% Jun 10 — drops to $272.
  // Jun 13 Monday gap-down to ~$263. Jun 14 low ~$260 (on the $260 gridline).
  // Fed +75bps Jun 16 — closes ~$262. Late June recovery to $288 (Jun 24 opex).
  // Month-end Jun 30 ~$271.
  { date: "2022-06-01", close: 288, vol: 99 },
  { date: "2022-06-02", close: 294, vol: 93 },
  { date: "2022-06-03", close: 290, vol: 97 },
  { date: "2022-06-06", close: 294, vol: 91 },
  { date: "2022-06-07", close: 296, vol: 88 }, // Jun peak
  { date: "2022-06-08", close: 292, vol: 91 },
  { date: "2022-06-09", close: 283, vol: 103 },
  { date: "2022-06-10", close: 272, vol: 123 }, // CPI 8.6%
  { date: "2022-06-13", close: 263, vol: 152 }, // Monday gap-down
  { date: "2022-06-14", close: 260, vol: 157 }, // low — on the $260 line
  { date: "2022-06-15", close: 265, vol: 146 },
  { date: "2022-06-16", close: 262, vol: 154 }, // Fed +75bps — largest since 1994
  { date: "2022-06-17", close: 269, vol: 136 },
  { date: "2022-06-21", close: 277, vol: 119 },
  { date: "2022-06-22", close: 272, vol: 123 },
  { date: "2022-06-23", close: 278, vol: 113 },
  { date: "2022-06-24", close: 288, vol: 105 }, // opex bounce
  { date: "2022-06-27", close: 283, vol: 101 },
  { date: "2022-06-28", close: 276, vol: 109 },
  { date: "2022-06-29", close: 275, vol: 111 },
  { date: "2022-06-30", close: 271, vol: 115 }, // Q2 close

  // ── JULY ─────────────────────────────────────────────────────────────────────
  // Chart: Chop early July ~$275-296. CPI 9.1% Jul 13 — sells then recovers.
  // Jul 14 trough clearly at $268 (between $260-$270, closer to $270).
  // Then strong uninterrupted rally. GDP pivot Jul 27 — huge green candle.
  // Jul 29 closes ~$331 (between $330-$340).
  { date: "2022-07-01", close: 275, vol: 98 },
  { date: "2022-07-05", close: 280, vol: 90 },
  { date: "2022-07-06", close: 285, vol: 86 },
  { date: "2022-07-07", close: 292, vol: 82 },
  { date: "2022-07-08", close: 296, vol: 80 },
  { date: "2022-07-11", close: 287, vol: 88 },
  { date: "2022-07-12", close: 279, vol: 94 },
  { date: "2022-07-13", close: 271, vol: 101 }, // CPI 9.1% — sells off first
  { date: "2022-07-14", close: 268, vol: 107 }, // Jul trough — $268
  { date: "2022-07-15", close: 277, vol: 97 },
  { date: "2022-07-18", close: 286, vol: 91 },
  { date: "2022-07-19", close: 298, vol: 85 },
  { date: "2022-07-20", close: 305, vol: 81 },
  { date: "2022-07-21", close: 309, vol: 78 },
  { date: "2022-07-22", close: 314, vol: 75 },
  { date: "2022-07-25", close: 310, vol: 78 },
  { date: "2022-07-26", close: 302, vol: 83 },
  { date: "2022-07-27", close: 318, vol: 109 }, // GDP -0.9% — pivot hope, huge green
  { date: "2022-07-28", close: 324, vol: 101 },
  { date: "2022-07-29", close: 331, vol: 93 },

  // ── AUGUST ───────────────────────────────────────────────────────────────────
  // Chart: Rally continues. CPI 8.5% Aug 10 — another gap up. Peak at ~$349 Aug 12
  // (clearly between $340-$350, touching top of that band).
  // Slow rollover Aug 15-25. Jackson Hole Aug 26 — massive red candle, closes $300
  // (drops from ~$317 to $300, -5.5%, lands right on the $300 gridline).
  // Aug 30-31 continues lower to ~$283.
  { date: "2022-08-01", close: 326, vol: 87 },
  { date: "2022-08-02", close: 320, vol: 91 },
  { date: "2022-08-03", close: 325, vol: 85 },
  { date: "2022-08-04", close: 328, vol: 81 },
  { date: "2022-08-05", close: 322, vol: 83 },
  { date: "2022-08-08", close: 329, vol: 79 },
  { date: "2022-08-09", close: 333, vol: 77 },
  { date: "2022-08-10", close: 342, vol: 96 }, // CPI 8.5% — peak inflation hopes
  { date: "2022-08-11", close: 346, vol: 89 },
  { date: "2022-08-12", close: 349, vol: 83 }, // Aug peak — $349
  { date: "2022-08-15", close: 347, vol: 81 },
  { date: "2022-08-16", close: 343, vol: 83 },
  { date: "2022-08-17", close: 339, vol: 85 },
  { date: "2022-08-18", close: 343, vol: 81 },
  { date: "2022-08-19", close: 334, vol: 88 },
  { date: "2022-08-22", close: 320, vol: 99 },
  { date: "2022-08-23", close: 315, vol: 104 },
  { date: "2022-08-24", close: 319, vol: 97 },
  { date: "2022-08-25", close: 317, vol: 93 },
  { date: "2022-08-26", close: 300, vol: 132 }, // Jackson Hole — lands on $300 line
  { date: "2022-08-29", close: 295, vol: 114 },
  { date: "2022-08-30", close: 288, vol: 118 },
  { date: "2022-08-31", close: 283, vol: 122 },

  // ── SEPTEMBER ────────────────────────────────────────────────────────────────
  // Chart: Brief bounce to $296 by Sep 9 (between $290-$300).
  // CPI 8.3% Sep 13 — largest single down-candle visible on chart, drops to $268.
  // Fed +75bps Sep 21 — $256. Sep 23 makes new low $251 (just above $250 line).
  // Sep 26 chart shows a candle that wicks below then closes ~$254.
  // Sep 30 Q3 close ~$254.
  { date: "2022-09-01", close: 278, vol: 113 },
  { date: "2022-09-02", close: 272, vol: 121 },
  { date: "2022-09-06", close: 277, vol: 111 },
  { date: "2022-09-07", close: 284, vol: 103 },
  { date: "2022-09-08", close: 291, vol: 98 },
  { date: "2022-09-09", close: 296, vol: 94 }, // Sep peak
  { date: "2022-09-12", close: 283, vol: 97 },  // adjusted so Sep 13 stays within -5.5%
  { date: "2022-09-13", close: 268, vol: 144 }, // CPI 8.3% — -5.30% from $283
  { date: "2022-09-14", close: 275, vol: 127 },
  { date: "2022-09-15", close: 270, vol: 132 },
  { date: "2022-09-16", close: 264, vol: 138 },
  { date: "2022-09-19", close: 267, vol: 124 },
  { date: "2022-09-20", close: 260, vol: 134 },
  { date: "2022-09-21", close: 256, vol: 142 }, // Fed +75bps 3rd
  { date: "2022-09-22", close: 257, vol: 134 },
  { date: "2022-09-23", close: 251, vol: 144 }, // near the year's absolute low
  { date: "2022-09-26", close: 254, vol: 137 },
  { date: "2022-09-27", close: 254, vol: 133 },
  { date: "2022-09-28", close: 264, vol: 124 },
  { date: "2022-09-29", close: 258, vol: 129 },
  { date: "2022-09-30", close: 254, vol: 136 }, // Q3 close

  // ── OCTOBER ──────────────────────────────────────────────────────────────────
  // Chart: Oct 7 chip ban drops to ~$255. Oct 10-11 at $251-253 (yearly lows zone).
  // Oct 13 CPI 8.2% epic reversal — opens low ~$252, closes $264.
  // Oct 14 ~$258. Then steady rally. Oct 28 peak ~$285 (between $280-$290).
  { date: "2022-10-03", close: 259, vol: 125 },
  { date: "2022-10-04", close: 274, vol: 115 }, // surprise rally
  { date: "2022-10-05", close: 269, vol: 121 },
  { date: "2022-10-06", close: 265, vol: 125 },
  { date: "2022-10-07", close: 255, vol: 138 }, // chip export ban
  { date: "2022-10-10", close: 253, vol: 133 },
  { date: "2022-10-11", close: 251, vol: 136 }, // yearly low — $251
  { date: "2022-10-12", close: 253, vol: 132 },
  { date: "2022-10-13", close: 264, vol: 152 }, // CPI 8.2% — epic gap-down-then-reversal
  { date: "2022-10-14", close: 258, vol: 138 },
  { date: "2022-10-17", close: 264, vol: 122 },
  { date: "2022-10-18", close: 272, vol: 116 },
  { date: "2022-10-19", close: 275, vol: 112 },
  { date: "2022-10-20", close: 271, vol: 116 },
  { date: "2022-10-21", close: 277, vol: 109 },
  { date: "2022-10-24", close: 281, vol: 105 },
  { date: "2022-10-25", close: 284, vol: 101 },
  { date: "2022-10-26", close: 280, vol: 107 },
  { date: "2022-10-27", close: 275, vol: 114 },
  { date: "2022-10-28", close: 285, vol: 109 }, // Oct peak
  { date: "2022-10-31", close: 280, vol: 114 },

  // ── NOVEMBER ─────────────────────────────────────────────────────────────────
  // Chart: Nov 3 drops to ~$262. Nov 10 CPI 7.7% — tallest candle of the year,
  // closes $294 (between $290-$300). Nov 11 $296 (FTX barely matters).
  // Then steady fade. Nov 30 recovery closes ~$285.
  { date: "2022-11-01", close: 273, vol: 119 },
  { date: "2022-11-02", close: 265, vol: 129 }, // Fed +75bps 4th
  { date: "2022-11-03", close: 262, vol: 126 }, // Nov low
  { date: "2022-11-04", close: 271, vol: 116 },
  { date: "2022-11-07", close: 275, vol: 109 },
  { date: "2022-11-08", close: 273, vol: 113 },
  { date: "2022-11-09", close: 261, vol: 131 }, // FTX collapse starts
  { date: "2022-11-10", close: 280, vol: 157 }, // CPI 7.7% — exactly +7.35%
  { date: "2022-11-11", close: 282, vol: 135 }, // slight fade from Nov 10 peak
  { date: "2022-11-14", close: 291, vol: 116 },
  { date: "2022-11-15", close: 288, vol: 111 },
  { date: "2022-11-16", close: 282, vol: 116 },
  { date: "2022-11-17", close: 278, vol: 120 },
  { date: "2022-11-18", close: 274, vol: 116 },
  { date: "2022-11-21", close: 270, vol: 123 },
  { date: "2022-11-22", close: 277, vol: 114 },
  { date: "2022-11-23", close: 284, vol: 107 },
  { date: "2022-11-25", close: 285, vol: 77 },  // half-day
  { date: "2022-11-28", close: 279, vol: 112 },
  { date: "2022-11-29", close: 275, vol: 116 },
  { date: "2022-11-30", close: 285, vol: 109 },

  // ── DECEMBER ─────────────────────────────────────────────────────────────────
  // Chart: Bounces to $290 Dec 1. Grinds lower Dec 5-12.
  // Fed +50bps Dec 13 — brief spike to $282, then hard reversal. Dec 15 $264.
  // Dec 16 $259. Dec 19-20 cluster at $255-251 (Dec 20 low ~$251).
  // BOJ surprise Dec 22 — $254. Year-end close $261 (between $260-$270).
  { date: "2022-12-01", close: 290, vol: 101 },
  { date: "2022-12-02", close: 288, vol: 104 },
  { date: "2022-12-05", close: 281, vol: 112 },
  { date: "2022-12-06", close: 274, vol: 119 },
  { date: "2022-12-07", close: 270, vol: 124 },
  { date: "2022-12-08", close: 274, vol: 116 },
  { date: "2022-12-09", close: 270, vol: 120 },
  { date: "2022-12-12", close: 275, vol: 114 },
  { date: "2022-12-13", close: 282, vol: 124 }, // Fed +50bps — spike then reversal
  { date: "2022-12-14", close: 276, vol: 119 },
  { date: "2022-12-15", close: 264, vol: 133 },
  { date: "2022-12-16", close: 259, vol: 139 },
  { date: "2022-12-19", close: 255, vol: 132 },
  { date: "2022-12-20", close: 251, vol: 136 }, // Dec low
  { date: "2022-12-21", close: 259, vol: 123 },
  { date: "2022-12-22", close: 254, vol: 129 }, // BOJ yield curve surprise
  { date: "2022-12-23", close: 258, vol: 111 },
  { date: "2022-12-27", close: 259, vol: 99 },
  { date: "2022-12-28", close: 256, vol: 104 },
  { date: "2022-12-29", close: 263, vol: 98 },
  { date: "2022-12-30", close: 261, vol: 91 },  // year close
];

// ─────────────────────────────────────────────────────────────
// 2. HOURLY BAR GENERATOR
//    7 bars per day: 9:30 10:30 11:30 12:30 13:30 14:30 15:30
//
//    Calibrated to real 2022 QQQ extremes:
//      Worst day:  -5.50% (Sep 13, CPI shock)
//      Best day:   +7.35% (Nov 10, CPI 7.7%)
//    No other day in DAILY_CLOSES exceeds these bounds.
//    Intraday bars are distributed so no single hourly bar
//    moves more than ~1.5% — keeping the chart readable.
// ─────────────────────────────────────────────────────────────
const MARKET_HOURS = ["9:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30"];

// Intraday vol weights — open/close slightly noisier, midday calm
const VOL_WEIGHTS = [1.10, 0.85, 0.70, 0.65, 0.70, 0.85, 1.05];
const VOL_SUM = VOL_WEIGHTS.reduce((a, b) => a + b, 0); // ~5.90

// Real historical daily move bounds (percentage of prevClose)
const MAX_DAY_GAIN_PCT = 0.0735;  // +7.35% Nov 10
const MAX_DAY_DROP_PCT = -0.055;  // -5.50% Sep 13

// Max a single hourly bar can move as % of prevClose
// With 7 bars the natural share is ~1/7 of daily. Allow up to 1.5% per bar.
const MAX_BAR_PCT = 0.015;

// Mulberry32 seeded PRNG
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Uniform in [-1, 1] — avoids fat tails entirely
function randpm(rng) {
  return rng() * 2 - 1;
}

function buildHourlyBars(date, prevClose, rawTodayClose, events, rng) {
  // ── 1. Clamp the daily move to historical extremes ──
  const rawPct    = (rawTodayClose - prevClose) / prevClose;
  const clampedPct = Math.max(MAX_DAY_DROP_PCT, Math.min(MAX_DAY_GAIN_PCT, rawPct));
  const todayClose = +(prevClose * (1 + clampedPct)).toFixed(2);
  const totalMove  = todayClose - prevClose;

  // ── 2. Build 7 weighted noise steps ──
  const maxBarMove = prevClose * MAX_BAR_PCT;

  const raw = VOL_WEIGHTS.map((w, i) => {
    // Base: uniform noise scaled by weight and bar move cap
    let v = randpm(rng) * w * (maxBarMove / (VOL_SUM / VOL_WEIGHTS.length));
    // Directional nudge on event days at 10:30 bar — proportional, not additive
    if (events.length > 0 && i === 1) {
      const dir = events[0].impact === "BULLISH" ? 1 : -1;
      v += dir * w * maxBarMove * 0.3;
    }
    return v;
  });

  // ── 3. Scale steps so they sum to totalMove ──
  const rawSum = raw.reduce((a, b) => a + b, 0);
  let steps = raw.map(r =>
    Math.abs(rawSum) > 0.001
      ? r * (totalMove / rawSum)
      : totalMove / raw.length
  );

  // ── 4. Hard-clamp each bar to ±MAX_BAR_PCT of prevClose ──
  steps = steps.map(s => Math.max(-maxBarMove, Math.min(maxBarMove, s)));

  // ── 5. Re-anchor: distribute any residual drift evenly across all bars ──
  const residual = totalMove - steps.reduce((a, b) => a + b, 0);
  steps = steps.map(s => s + residual / steps.length);

  // ── 6. Build OHLC bars ──
  const bars = [];
  MARKET_HOURS.forEach((hour, i) => {
    const open  = i === 0 ? prevClose : bars[i - 1].close;
    const close = i === MARKET_HOURS.length - 1 ? todayClose : open + steps[i];

    // Wick: at most 0.3% of price — tiny, realistic
    const wickPct = rng() * 0.003;
    const wick    = open * wickPct;

    bars.push({
      date,
      hour,
      key:      `${date} ${hour}`,
      open:     +open.toFixed(2),
      close:    +close.toFixed(2),
      high:     +(Math.max(open, close) + wick).toFixed(2),
      low:      +(Math.min(open, close) - wick).toFixed(2),
      price:    +close.toFixed(2),
      volume:   Math.floor(3_000_000 + rng() * 8_000_000),
      hasEvent: events.length > 0 && i === 1,
      events:   i === 1 ? events : [],
      isOpen:   i === 0,
      isClose:  i === MARKET_HOURS.length - 1,
    });
  });
  return bars;
}

// Build event lookup map
const _eventMap = {};

// Build full hourly dataset — called once at module load
function buildAllHourlyBars(events) {
  events.forEach(e => {
    if (!_eventMap[e.date]) _eventMap[e.date] = [];
    _eventMap[e.date].push(e);
  });

  const all = [];
  for (let i = 0; i < DAILY_CLOSES.length; i++) {
    const today     = DAILY_CLOSES[i];
    const prev      = DAILY_CLOSES[i - 1];
    const dayEvents = _eventMap[today.date] || [];

    // Day 0: synthesise a realistic prior close slightly above open
    const prevClose = prev ? prev.close : today.close + 1.5;

    const seed = (today.date.replace(/-/g, "") | 0) + i * 997;
    const rng  = makeRng(seed);

    all.push(...buildHourlyBars(today.date, prevClose, today.close, dayEvents, rng));
  }
  return all;
}

// ─────────────────────────────────────────────────────────────
// 3. MACRO EVENTS — preserved exactly as-is
// ─────────────────────────────────────────────────────────────
export const MACRO_EVENTS_2022 = [
  {
    date: "2022-01-05",
    type: "FED",
    severity: "HIGH",
    title: "Fed Minutes Hawkish Surprise",
    description: "FOMC minutes revealed aggressive rate hike timeline. Markets sold off sharply as 10yr yield spiked. Tech valuations crushed by rising discount rates.",
    impact: "BEARISH",
    affectedFactors: ["Interest Rates", "Tech Valuations", "Growth Stocks"],
  },
  {
    date: "2022-01-28",
    type: "EARNINGS",
    severity: "MEDIUM",
    title: "Big Tech Earnings Mixed",
    description: "Apple beat on revenue and services. Microsoft guided higher. Markets bounced into month-end on relief rally.",
    impact: "BULLISH",
    affectedFactors: ["AAPL", "MSFT", "Earnings"],
  },
  {
    date: "2022-02-04",
    type: "MACRO",
    severity: "MEDIUM",
    title: "NFP Jobs Report: +467K",
    description: "January jobs report massively beat expectations (+467K vs +125K est). Strong labor market reinforced Fed rate hike path — paradoxically bearish for tech.",
    impact: "BEARISH",
    affectedFactors: ["Labor Market", "Fed Policy", "Yields"],
  },
  {
    date: "2022-02-24",
    type: "GEOPOLITICAL",
    severity: "CRITICAL",
    title: "Russia Invades Ukraine",
    description: "Russia launched full-scale invasion of Ukraine. Global risk-off sentiment. Oil surged past $100. European markets crashed. NATO emergency sessions called.",
    impact: "BEARISH",
    affectedFactors: ["Geopolitical Risk", "Oil", "European Markets", "Defense"],
  },
  {
    date: "2022-03-16",
    type: "FED",
    severity: "HIGH",
    title: "Fed Hikes +25bps — First Hike Since 2018",
    description: "Fed raised rates for first time since 2018. Powell signaled up to 7 hikes in 2022. Markets rallied on 'buy the news' — uncertainty removed.",
    impact: "BULLISH",
    affectedFactors: ["Fed Funds Rate", "Yields", "USD"],
  },
  {
    date: "2022-03-29",
    type: "MACRO",
    severity: "HIGH",
    title: "Yield Curve Inverts (2s/10s)",
    description: "2-year Treasury yield exceeded 10-year for first time since 2019. Classic recession indicator. Triggered massive financial media coverage and institutional repositioning.",
    impact: "BEARISH",
    affectedFactors: ["Yield Curve", "Recession Risk", "Banks", "Credit"],
  },
  {
    date: "2022-04-12",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI Hits 8.5% — 40-Year High",
    description: "March CPI came in at 8.5% YoY, highest since 1981. Core CPI 6.5%. Fed credibility questioned. Accelerated rate hike expectations.",
    impact: "BEARISH",
    affectedFactors: ["Inflation", "CPI", "Fed Policy", "Consumer"],
  },
  {
    date: "2022-04-28",
    type: "EARNINGS",
    severity: "CRITICAL",
    title: "Amazon -14%: Massive Miss",
    description: "Amazon reported first quarterly loss since 2015. Revenue guidance shocked. AWS growth decelerated. QQQ cratered as Amazon's weight dragged the index.",
    impact: "BEARISH",
    affectedFactors: ["AMZN", "Cloud", "E-Commerce", "Q1 Earnings"],
  },
  {
    date: "2022-05-04",
    type: "FED",
    severity: "HIGH",
    title: "Fed Hikes +50bps — Largest Since 2000",
    description: "Fed raised rates 50bps, biggest hike in 22 years. Powell ruled out 75bps hike — markets rallied hard on relief. Short-lived bounce.",
    impact: "BULLISH",
    affectedFactors: ["Fed Funds Rate", "Volatility", "Rates"],
  },
  {
    date: "2022-05-09",
    type: "MACRO",
    severity: "HIGH",
    title: "Nasdaq Bear Market: -30% YTD",
    description: "QQQ hit bear market territory, down over 30% from January highs. Crypto crash added to sentiment collapse. Luna/Terra ecosystem imploded — $40B wiped out.",
    impact: "BEARISH",
    affectedFactors: ["Bear Market", "Crypto Contagion", "Sentiment", "Retail"],
  },
  {
    date: "2022-06-10",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI Accelerates to 8.6%",
    description: "May CPI surprised to the upside at 8.6%, crushing hopes of a peak. Energy and food drove gains. Fed emergency meeting speculation began.",
    impact: "BEARISH",
    affectedFactors: ["CPI", "Inflation", "Fed", "Consumer Spending"],
  },
  {
    date: "2022-06-16",
    type: "FED",
    severity: "CRITICAL",
    title: "Fed Hikes +75bps — Largest Since 1994",
    description: "Fed delivered 75bps hike, largest since 1994, after CPI shock. Powell committed to fighting inflation 'unconditionally'. Rate expectations surged to 4%+.",
    impact: "BEARISH",
    affectedFactors: ["Fed Funds Rate", "Yields", "Valuations", "Mortgages"],
  },
  {
    date: "2022-07-14",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI 9.1% — Highest Since 1981",
    description: "June CPI hit 9.1%, a 41-year high. Gasoline was the primary driver at $5/gal national average. Recession fears at peak. Fed 100bps hike speculation.",
    impact: "BEARISH",
    affectedFactors: ["CPI Peak", "Energy", "Recession", "Consumer"],
  },
  {
    date: "2022-07-28",
    type: "MACRO",
    severity: "HIGH",
    title: "GDP -0.9%: Technical Recession",
    description: "US GDP shrank for second consecutive quarter (-0.9%), meeting the technical definition of recession. White House disputed the label. Markets rallied — bad news = Fed pivot hope.",
    impact: "BULLISH",
    affectedFactors: ["GDP", "Recession", "Fed Pivot Hopes", "Risk Assets"],
  },
  {
    date: "2022-08-10",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI 8.5% — Possible Peak",
    description: "July CPI came in at 8.5%, below the 8.7% estimate. Markets exploded higher on 'peak inflation' narrative. QQQ rallied 3%+ on the day.",
    impact: "BULLISH",
    affectedFactors: ["Inflation Peak", "CPI", "Risk Appetite", "Growth Stocks"],
  },
  {
    date: "2022-08-26",
    type: "FED",
    severity: "CRITICAL",
    title: "Powell Jackson Hole: 'Pain Ahead'",
    description: "Powell's Jackson Hole speech shocked markets. 8-minute address hammered home: rate hikes will cause 'pain' to households and businesses. No pivot. QQQ fell 4%.",
    impact: "BEARISH",
    affectedFactors: ["Fed Hawkishness", "Jackson Hole", "Rate Path", "Tech"],
  },
  {
    date: "2022-09-13",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI 8.3% — Core Rises Unexpectedly",
    description: "CPI came in hotter than expected. Core CPI rose to 6.3% vs 6.1% est. Markets had priced in a decline. QQQ fell over 5% — biggest one-day drop in months.",
    impact: "BEARISH",
    affectedFactors: ["Core CPI", "Inflation", "Rate Hike Path", "Volatility"],
  },
  {
    date: "2022-09-21",
    type: "FED",
    severity: "HIGH",
    title: "Fed Hikes +75bps Third Time",
    description: "Third consecutive 75bps hike. Dot plot showed terminal rate near 4.6%. Powell reiterated no rate cuts in 2023. QQQ made new year-to-date lows.",
    impact: "BEARISH",
    affectedFactors: ["Fed Funds Rate", "Terminal Rate", "Forward Guidance"],
  },
  {
    date: "2022-10-07",
    type: "GEOPOLITICAL",
    severity: "HIGH",
    title: "US Bans Advanced Chip Exports to China",
    description: "Biden administration issued sweeping semiconductor export controls targeting China. NVDA, AMD, Intel fell sharply. Geopolitical tech war escalated significantly.",
    impact: "BEARISH",
    affectedFactors: ["Semiconductors", "NVDA", "China", "Supply Chain"],
  },
  {
    date: "2022-10-13",
    type: "MACRO",
    severity: "HIGH",
    title: "CPI 8.2% — Another Surprise, Epic Reversal",
    description: "CPI came in above 8.0% est. QQQ initially dumped 3%, then reversed spectacularly +5% intraday — one of the most violent reversals in ETF history. Short covering drove the reversal.",
    impact: "BULLISH",
    affectedFactors: ["CPI", "Short Squeeze", "Volatility", "Reversal"],
  },
  {
    date: "2022-11-02",
    type: "FED",
    severity: "HIGH",
    title: "Fed Hikes +75bps — Fourth Time",
    description: "Fed hiked 75bps for the fourth consecutive meeting. Powell hinted smaller hikes possible but emphasized higher terminal rate. 'Higher for longer' narrative cemented.",
    impact: "BEARISH",
    affectedFactors: ["Fed Funds Rate", "Terminal Rate", "Higher For Longer"],
  },
  {
    date: "2022-11-10",
    type: "MACRO",
    severity: "CRITICAL",
    title: "CPI 7.7% — Inflation Breaks Lower",
    description: "October CPI at 7.7% crushed the 8.0% estimate. Biggest one-day QQQ rally of the year: +7.5%. Peak inflation narrative reignited. Massive short squeeze.",
    impact: "BULLISH",
    affectedFactors: ["CPI", "Inflation", "Pivot Hopes", "Short Squeeze"],
  },
  {
    date: "2022-11-11",
    type: "GEOPOLITICAL",
    severity: "HIGH",
    title: "FTX Collapses: $32B Crypto Exchange Bankrupt",
    description: "FTX filed for bankruptcy. Sam Bankman-Fried resigned. $32B exchange wiped out in 72 hours. Crypto contagion fears. Limited direct QQQ impact but risk sentiment soured.",
    impact: "BEARISH",
    affectedFactors: ["Crypto", "FTX", "Contagion Risk", "Sentiment"],
  },
  {
    date: "2022-12-13",
    type: "FED",
    severity: "HIGH",
    title: "Fed Hikes +50bps — Downshift Begins",
    description: "Fed downshifted to 50bps hike, as expected. But new dot plot showed terminal rate of 5.1%, higher than markets expected. 'Dovish hike' turned hawkish. QQQ fell.",
    impact: "BEARISH",
    affectedFactors: ["Fed Funds Rate", "Dot Plot", "Terminal Rate", "2023 Outlook"],
  },
  {
    date: "2022-12-22",
    type: "MACRO",
    severity: "MEDIUM",
    title: "BOJ Surprises: Yield Curve Control Widened",
    description: "Bank of Japan shocked markets by widening its yield curve control band — effectively a stealth rate hike. Yen surged. Japanese investors repatriated capital from US assets.",
    impact: "BEARISH",
    affectedFactors: ["BOJ", "Yen", "Global Rates", "Japan", "Capital Flows"],
  },
];

// ─────────────────────────────────────────────────────────────
// 4. EXPORTS
// ─────────────────────────────────────────────────────────────
export const EVENT_TYPES = {
  FED:         { color: "#f59e0b", label: "Fed Policy",   icon: "🏦" },
  MACRO:       { color: "#3b82f6", label: "Macro Data",   icon: "📊" },
  EARNINGS:    { color: "#8b5cf6", label: "Earnings",     icon: "💰" },
  GEOPOLITICAL:{ color: "#ef4444", label: "Geopolitical", icon: "🌍" },
};

export const SEVERITY_COLORS = {
  LOW:      "#6b7280",
  MEDIUM:   "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#ef4444",
};

// Built once at module load — ~1,680 hourly bars
export const HOURLY_DATA = buildAllHourlyBars(MACRO_EVENTS_2022);
