// Sapcast demo server — synthetic mid-season forecasts for screenshots and
// manual UI review.
//
// Sapcast is only useful for about three weeks a year. Outside the season
// there is no freeze-thaw in the live forecast, so every day rates "poor" and
// most of the UI can't be exercised. This server proxies the real frontend
// from `wrangler dev` but answers /api/forecast with canned temperatures.
//
// The temperatures are the only fabricated input: they are fed through the
// real `src/weather.ts` and `src/scoring.ts`, so ratings, the best window, the
// recommendation and the season dates are whatever the production code
// computes.
//
// Usage:
//   1. npm run dev                  # real worker on :8787
//   2. node demo/demo-server.mjs    # this proxy on :8788
//   3. open http://localhost:8788
//
// Endpoints:
//   GET /_scenarios          list scenarios and the recommendation each yields
//   GET /_scenario/<name>    switch the active scenario
//
// Requires Node 22.18+ or 23.6+, where TypeScript type stripping is enabled by
// default (this file imports ../src/*.ts directly).

import http from 'node:http';
import { ensembleDaily } from '../src/weather.ts';
import {
  scoreDay,
  findBestWindow,
  generateRecommendation,
  getSeasonInfo,
} from '../src/scoring.ts';

const UPSTREAM = process.env.SAPCAST_UPSTREAM ?? 'http://127.0.0.1:8787';
const PORT = Number(process.env.PORT ?? 8788);

// Faux "today" — mid-season for a latitude-45 sugarbush (Ottawa valley).
const TODAY = '2026-03-10';
const YEAR = 2026;
const LAT = 45.35;

const SOURCE_NAMES = [
  'Pirate Weather (US)',
  'ECMWF (EU)',
  'GEM (Canada)',
  'GFS (US)',
];

// Per-model spread around the scenario value. Offsets sum to zero so the
// ensemble average lands exactly on the intended temperature.
const LOW_OFFSETS = [-0.9, 0.4, 1.1, -0.6];
const HIGH_OFFSETS = [0.7, -1.2, 0.8, -0.3];

function dates(n) {
  const out = [];
  const start = new Date(TODAY + 'T12:00:00Z');
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

// ── Scenarios: [low, high] per day in °C ───────────────────────────────────

const SCENARIOS = {
  'tap-now': {
    label: 'Five-day excellent run starting today',
    current: { temperature: 4.2, summary: 'Partly Cloudy', icon: 'partly-cloudy-day' },
    temps: [[-5, 6], [-4, 7], [-6, 5], [-3, 9], [-2, 11], [1, 12], [-1, 8]],
    summaries: [
      'Partly cloudy throughout the day.',
      'Clear throughout the day.',
      'Light snow overnight.',
      'Sunny and mild.',
      'Mostly cloudy throughout the day.',
      'Rain in the afternoon.',
      'Clear throughout the day.',
    ],
  },
  upcoming: {
    label: 'Warm now, strong window opening Friday',
    current: { temperature: 7.8, summary: 'Mostly Cloudy', icon: 'cloudy' },
    temps: [[2, 8], [1, 6], [-1, 1], [-4, 5], [-6, 6], [-3, 8], [-8, 3]],
    summaries: [
      'Mostly cloudy throughout the day.',
      'Drizzle in the morning.',
      'Snow showers throughout the day.',
      'Clear throughout the day.',
      'Sunny and cold.',
      'Partly cloudy throughout the day.',
      'Cold with clear skies.',
    ],
  },
  marginal: {
    label: 'Only a brief one-day window — no real run',
    current: { temperature: -1.4, summary: 'Flurries', icon: 'snow' },
    temps: [[-9, 3], [-1, 3], [-4, 6], [-1, 2], [1, 5], [-10, 1], [-8, 3]],
    summaries: [
      'Flurries in the morning.',
      'Overcast throughout the day.',
      'Sunny and mild.',
      'Light snow in the evening.',
      'Rain throughout the day.',
      'Clear and very cold.',
      'Partly cloudy throughout the day.',
    ],
  },
  'too-cold': {
    label: 'Deep freeze — nothing thaws',
    current: { temperature: -16.3, summary: 'Clear', icon: 'clear-day' },
    temps: [[-18, -6], [-20, -8], [-15, -3], [-12, 0], [-14, -2], [-16, -5], [-11, 1]],
    summaries: [
      'Clear and frigid.',
      'Clear throughout the day.',
      'Partly cloudy throughout the day.',
      'Light snow in the afternoon.',
      'Mostly cloudy throughout the day.',
      'Clear and very cold.',
      'Flurries in the morning.',
    ],
  },
  'season-over': {
    label: 'Season done — no freezing nights left',
    current: { temperature: 13.1, summary: 'Sunny', icon: 'clear-day' },
    temps: [[3, 14], [4, 16], [5, 15], [6, 18], [4, 13], [5, 16], [7, 19]],
    summaries: [
      'Sunny throughout the day.',
      'Warm and clear.',
      'Partly cloudy throughout the day.',
      'Sunny and warm.',
      'Rain in the morning.',
      'Mostly sunny throughout the day.',
      'Warm with clear skies.',
    ],
  },
};

// ── Build a forecast response the same way handleForecast() does ───────────

function buildForecast(name) {
  const sc = SCENARIOS[name];
  const ds = dates(sc.temps.length);

  const namedSources = SOURCE_NAMES.map((sourceName, si) => ({
    name: sourceName,
    days: ds.map((date, di) => ({
      date,
      tempLow: sc.temps[di][0] + LOW_OFFSETS[si],
      tempHigh: sc.temps[di][1] + HIGH_OFFSETS[si],
    })),
  }));

  const ensembled = ensembleDaily(namedSources.map((s) => s.days));

  const sources = {};
  for (const { name: sourceName, days: sDays } of namedSources) {
    const byDate = {};
    for (const d of sDays) {
      byDate[d.date] = { tempHigh: d.tempHigh, tempLow: d.tempLow };
    }
    sources[sourceName] = byDate;
  }

  const days = ensembled.map(({ date, tempHigh, tempLow }, i) => {
    const { rating, score } = scoreDay(tempLow, tempHigh);
    return { date, tempHigh, tempLow, summary: sc.summaries[i] ?? '', icon: '', rating, score };
  });

  const bestWindow = findBestWindow(days);

  return {
    current: sc.current,
    today: days[0] ?? null,
    days,
    sources,
    bestWindow: bestWindow
      ? {
          startDate: bestWindow.start,
          endDate: bestWindow.end,
          length: bestWindow.days.length,
          avgScore: bestWindow.totalScore / bestWindow.days.length,
        }
      : null,
    recommendation: generateRecommendation(days, bestWindow),
    seasonInfo: getSeasonInfo(LAT, YEAR),
    cached: false,
  };
}

let active = 'tap-now';

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/_scenario/')) {
    const name = url.pathname.slice('/_scenario/'.length);
    if (!SCENARIOS[name]) {
      return json(res, { error: 'unknown scenario', known: Object.keys(SCENARIOS) }, 404);
    }
    active = name;
    const f = buildForecast(name);
    return json(res, { active, recommendation: f.recommendation, bestWindow: f.bestWindow });
  }

  if (url.pathname === '/_scenarios') {
    return json(
      res,
      Object.entries(SCENARIOS).map(([name, sc]) => {
        const f = buildForecast(name);
        return {
          name,
          label: sc.label,
          type: f.recommendation.type,
          message: f.recommendation.message,
          ratings: f.days.map((d) => d.rating),
        };
      }),
    );
  }

  if (url.pathname === '/api/forecast') {
    return json(res, buildForecast(active));
  }

  // Everything else — the frontend, /api/geocode — comes from the real worker.
  try {
    const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
      headers: { 'User-Agent': req.headers['user-agent'] ?? 'sapcast-demo' },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/html',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('upstream unavailable: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Sapcast demo on http://localhost:${PORT} (upstream ${UPSTREAM})`);
  console.log(`scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
});
