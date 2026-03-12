# Sap Collection Data

Daily sap yield records used to improve the tapping model over time.

## Schema

| Column | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Date of collection |
| `temp_low_c` | float | Overnight low (°C) — from forecast or observed |
| `temp_high_c` | float | Daytime high (°C) — from forecast or observed |
| `rating` | string | Model's rating for the day (`excellent`/`good`/`fair`/`poor`) |
| `buckets_collected` | float | Sap yield in standard blue maple tapping bucket equivalents |
| `litres_collected` | float | Sap yield in litres (more precise; use when measured directly) |
| `notes` | string | Optional free-text notes |

## Usage

Add a row after each collection day. `buckets_collected` is normalized to
standard blue maple tapping buckets (roughly 15–16 L each) so yields stay
comparable regardless of how many buckets are active. `litres_collected`
is the more precise measure when you have it; both can be recorded together.

Over time this data will let you correlate model ratings with actual flow
and calibrate thresholds (e.g. whether `poor` days still yield meaningful sap,
or what low/high combos produce the best runs).
