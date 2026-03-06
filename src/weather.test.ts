import { describe, it, expect } from 'vitest';
import { parseOpenMeteoDaily, parsePirateWeatherDaily, ensembleDaily, type DailyTemp } from './weather';

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
});
