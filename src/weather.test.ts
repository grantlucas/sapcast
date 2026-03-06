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

  it('averages tempHigh and tempLow across two sources for matching dates', () => {
    const s1 = [
      { date: '2026-03-06', tempHigh: 8.0, tempLow: -4.0 },
      { date: '2026-03-07', tempHigh: 6.0, tempLow: -6.0 },
    ];
    const s2 = [
      { date: '2026-03-06', tempHigh: 10.0, tempLow: -2.0 },
      { date: '2026-03-07', tempHigh: 8.0,  tempLow: -4.0 },
    ];
    expect(ensembleDaily([s1, s2])).toEqual([
      { date: '2026-03-06', tempHigh: 9.0, tempLow: -3.0 },
      { date: '2026-03-07', tempHigh: 7.0, tempLow: -5.0 },
    ]);
  });

  it('averages across four sources for matching dates', () => {
    const sources = [
      [{ date: '2026-03-06', tempHigh: 8.0, tempLow: -4.0 }],
      [{ date: '2026-03-06', tempHigh: 10.0, tempLow: -2.0 }],
      [{ date: '2026-03-06', tempHigh: 6.0,  tempLow: -6.0 }],
      [{ date: '2026-03-06', tempHigh: 8.0,  tempLow: -4.0 }],
    ];
    expect(ensembleDaily(sources)).toEqual([
      { date: '2026-03-06', tempHigh: 8.0, tempLow: -4.0 },
    ]);
  });

  it('includes dates present in only some sources (union), using available data for that date', () => {
    // source1 has Mar 6 + Mar 7, source2 only has Mar 6
    const s1 = [
      { date: '2026-03-06', tempHigh: 8.0,  tempLow: -4.0 },
      { date: '2026-03-07', tempHigh: 6.0,  tempLow: -6.0 },
    ];
    const s2 = [
      { date: '2026-03-06', tempHigh: 10.0, tempLow: -2.0 },
    ];
    const result = ensembleDaily([s1, s2]);
    expect(result).toHaveLength(2);
    // Mar 6: averaged from both sources
    expect(result[0]).toEqual({ date: '2026-03-06', tempHigh: 9.0, tempLow: -3.0 });
    // Mar 7: only from s1, so passthrough
    expect(result[1]).toEqual({ date: '2026-03-07', tempHigh: 6.0, tempLow: -6.0 });
  });

  it('returns dates in ascending chronological order', () => {
    // Deliberately provide out-of-order sources
    const s1 = [{ date: '2026-03-08', tempHigh: 5.0, tempLow: -3.0 }];
    const s2 = [{ date: '2026-03-06', tempHigh: 8.0, tempLow: -4.0 }];
    const result = ensembleDaily([s1, s2]);
    expect(result.map(d => d.date)).toEqual(['2026-03-06', '2026-03-08']);
  });
});
