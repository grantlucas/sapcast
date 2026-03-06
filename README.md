# Sapcast

Based on local weather forecasts; when should I tap my maple tree?

A simple web app that uses browser geolocation and an ensemble of weather forecasts to determine the optimal time to tap sugar maple trees for sap collection.

## How it works

The app analyses the 7-day forecast for freeze-thaw cycles — the key driver of maple sap flow. Each day is rated:

- **Excellent** — overnight low -7°C to -2°C, daytime high 4°C to 10°C
- **Good** — freezes at night, thaws above 2°C during the day
- **Fair** — marginal freeze-thaw activity
- **Poor** — no freeze-thaw cycle

It then identifies the best consecutive run of favorable days and gives a clear recommendation.

## Setup

1. **Get a Pirate Weather API key** (free): https://pirate-weather.apiable.io/
2. Copy `.dev.vars.example` to `.dev.vars` and add your API key
3. Install dependencies:
   ```
   npm install
   ```
4. Create a KV namespace and update `wrangler.toml` with the IDs:
   ```
   npx wrangler kv namespace create FORECAST_CACHE
   npx wrangler kv namespace create FORECAST_CACHE --preview
   ```
5. Run locally:
   ```
   npm run dev
   ```

## Deploy

```
npx wrangler secret put PIRATE_WEATHER_API_KEY
npm run deploy
```

## Tech stack

- Cloudflare Workers (single file, no build step)
- Ensemble weather forecasts (Pirate Weather + Open-Meteo ECMWF/GEM/GFS)
- Cloudflare KV (forecast caching, 3h TTL)
- Vanilla HTML/CSS/JS frontend

## Sources & further reading

The scoring model and temperature thresholds are informed by maple sap
flow research:

### Research papers

- Tyree, M.T. (1983). "Maple Sap Uptake, Exudation, and Pressure
  Changes Correlated with Freezing Exotherms and Thawing Endotherms."
  *Plant Physiology*, 73(2), 277–285.
  [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC1066453/)
  — foundational research on the freeze-thaw sap pressure mechanism
- Rapp, J.M. et al. (2019). "Finding the Sweet Spot: Shifting Optimal
  Climate for Maple Syrup Production in North America." *Forest Ecology
  and Management*.
  [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0378112719303019)
  — climate change impacts on tapping season timing
- Graf, I. et al. (2024). "Experimental and Computational Comparison of
  Freeze–Thaw-Induced Pressure Generation in Red and Sugar Maple."
  *Tree Physiology*, 44(4).
  [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11448476/)
  — mathematical modeling of sap exudation

### Extension programs & educational resources

- [UVM Proctor Maple Research Center](https://www.uvm.edu/cals/proctor-maple-research-center)
  — the world's oldest maple research center (est. 1946)
- [Cornell Sugar Maple Research & Extension Program](https://blogs.cornell.edu/cornellmaple/)
  — production research and real-time climate monitoring
- [Massachusetts Maple Producers Association](https://www.massmaple.org/about-maple-syrup/how-sugar-maple-trees-work/)
  — how sugar maple trees work
- [University of Maine: Making Sense of Maple Syrup](https://umaine.edu/ecologyandenvironmentalsciences/2014/02/19/making-sense-of-maple-syrup/)
  — accessible overview of sap flow science

### Weather data

Forecasts are ensembled (averaged) from four sources to improve
accuracy. Each day's high/low is the mean across all available models.
Click any day in the forecast to see per-source values.

- [Pirate Weather](https://pirateweather.net/) (US) — free, Dark
  Sky-compatible forecast API; also provides current conditions,
  summaries, and icons
- [Open-Meteo ECMWF](https://open-meteo.com/) (EU) — European Centre
  for Medium-Range Weather Forecasts model
- [Open-Meteo GEM](https://open-meteo.com/) (Canada) — Environment
  Canada's Global Environmental Multiscale model
- [Open-Meteo GFS](https://open-meteo.com/) (US) — NOAA's Global
  Forecast System model
