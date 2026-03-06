// ── Types ──────────────────────────────────────────────────────────────────

export interface DailyTemp {
  date: string; // YYYY-MM-DD
  tempHigh: number;
  tempLow: number;
}

// ── Open-Meteo parser ──────────────────────────────────────────────────────

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
}

export function parseOpenMeteoDaily(json: OpenMeteoResponse): DailyTemp[] {
  const { time, temperature_2m_max, temperature_2m_min } = json.daily;
  const result: DailyTemp[] = [];
  for (let i = 0; i < time.length; i++) {
    const tempHigh = temperature_2m_max[i];
    const tempLow = temperature_2m_min[i];
    if (tempHigh != null && tempLow != null) {
      result.push({ date: time[i], tempHigh, tempLow });
    }
  }
  return result;
}

// ── Pirate Weather parser ──────────────────────────────────────────────────

interface PirateWeatherDailyEntry {
  time: number;
  temperatureHigh?: number | null;
  temperatureMax?: number | null;
  temperatureLow?: number | null;
  temperatureMin?: number | null;
}

interface PirateWeatherResponse {
  daily?: {
    data?: PirateWeatherDailyEntry[];
  };
}

export function parsePirateWeatherDaily(json: PirateWeatherResponse): DailyTemp[] {
  const data = json.daily?.data ?? [];
  const result: DailyTemp[] = [];
  for (const d of data) {
    const date = new Date(d.time * 1000).toISOString().split('T')[0];
    const tempHigh = d.temperatureHigh ?? d.temperatureMax ?? null;
    const tempLow = d.temperatureLow ?? d.temperatureMin ?? null;
    if (tempHigh != null && tempLow != null) {
      result.push({ date, tempHigh, tempLow });
    }
  }
  return result;
}

// ── Ensemble ───────────────────────────────────────────────────────────────

export function ensembleDaily(sources: DailyTemp[][]): DailyTemp[] {
  // Collect all dates from all sources
  const byDate = new Map<string, { highSum: number; lowSum: number; count: number }>();

  for (const source of sources) {
    for (const d of source) {
      const entry = byDate.get(d.date);
      if (entry) {
        entry.highSum += d.tempHigh;
        entry.lowSum += d.tempLow;
        entry.count += 1;
      } else {
        byDate.set(d.date, { highSum: d.tempHigh, lowSum: d.tempLow, count: 1 });
      }
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { highSum, lowSum, count }]) => ({
      date,
      tempHigh: highSum / count,
      tempLow: lowSum / count,
    }));
}
