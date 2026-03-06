import { describe, it, expect } from 'vitest';
import { parseOpenMeteoDaily, parsePirateWeatherDaily, ensembleDaily } from './weather';

// ── helpers ────────────────────────────────────────────────────────────────

function toUnix(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getTime() / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// parsePirateWeatherDaily
// ═══════════════════════════════════════════════════════════════════════════

describe('parsePirateWeatherDaily', () => {
  it('converts Pirate Weather daily data to DailyTemp array', () => {
    const json = {
      daily: {
        data: [
          { time: toUnix('2026-03-06'), temperatureHigh: 8.5, temperatureLow: -3.1 },
          { time: toUnix('2026-03-07'), temperatureHigh: 6.2, temperatureLow: -5.4 },
        ],
      },
    };
    expect(parsePirateWeatherDaily(json)).toEqual([
      { date: '2026-03-06', tempHigh: 8.5, tempLow: -3.1 },
      { date: '2026-03-07', tempHigh: 6.2, tempLow: -5.4 },
    ]);
  });

  it('falls back to temperatureMax/temperatureMin when High/Low absent', () => {
    const json = {
      daily: {
        data: [
          { time: toUnix('2026-03-06'), temperatureMax: 7.0, temperatureMin: -4.0 },
        ],
      },
    };
    expect(parsePirateWeatherDaily(json)).toEqual([
      { date: '2026-03-06', tempHigh: 7.0, tempLow: -4.0 },
    ]);
  });

  it('skips days where temperature values are null', () => {
    const json = {
      daily: {
        data: [
          { time: toUnix('2026-03-06'), temperatureHigh: null, temperatureLow: -3.1 },
          { time: toUnix('2026-03-07'), temperatureHigh: 6.2, temperatureLow: -5.4 },
        ],
      },
    };
    expect(parsePirateWeatherDaily(json)).toEqual([
      { date: '2026-03-07', tempHigh: 6.2, tempLow: -5.4 },
    ]);
  });

  it('returns empty array when daily data is missing', () => {
    expect(parsePirateWeatherDaily({})).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseOpenMeteoDaily
// ═══════════════════════════════════════════════════════════════════════════

describe('parseOpenMeteoDaily', () => {
  it('converts Open-Meteo daily JSON to DailyTemp array', () => {
    const json = {
      daily: {
        time: ['2026-03-06', '2026-03-07'],
        temperature_2m_max: [8.5, 6.2],
        temperature_2m_min: [-3.1, -5.4],
      },
    };
    expect(parseOpenMeteoDaily(json)).toEqual([
      { date: '2026-03-06', tempHigh: 8.5, tempLow: -3.1 },
      { date: '2026-03-07', tempHigh: 6.2, tempLow: -5.4 },
    ]);
  });

  it('skips days where temperature values are null', () => {
    const json = {
      daily: {
        time: ['2026-03-06', '2026-03-07', '2026-03-08'],
        temperature_2m_max: [8.5, null, 5.0],
        temperature_2m_min: [-3.1, -5.4, null],
      },
    };
    expect(parseOpenMeteoDaily(json)).toEqual([
      { date: '2026-03-06', tempHigh: 8.5, tempLow: -3.1 },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ensembleDaily
// ═══════════════════════════════════════════════════════════════════════════

describe('ensembleDaily', () => {
  it('returns empty array for empty sources', () => {
    expect(ensembleDaily([])).toEqual([]);
  });

  it('returns the single source unchanged', () => {
    const source = [
      { date: '2026-03-06', tempHigh: 8.5, tempLow: -3.1 },
      { date: '2026-03-07', tempHigh: 6.2, tempLow: -5.4 },
    ];
    expect(ensembleDaily([source])).toEqual(source);
  });
});
