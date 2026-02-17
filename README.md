# tapping-time

Based on local weather forecasts; when should I tap my maple tree?

A simple web app that uses browser geolocation and the [Pirate Weather](https://pirateweather.net/) API to determine the optimal time to tap sugar maple trees for sap collection.

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
- Pirate Weather API (Dark Sky compatible, free tier)
- Cloudflare KV (forecast caching, 3h TTL)
- Vanilla HTML/CSS/JS frontend
