---
name: web-scraper-business-info
description: Collects business information from Google Maps / Google Places API. Searches for businesses by category and location (e.g. auto repair shops, cosmetics, hair salons), then extracts profile data based on custom instructions. Use when you need structured business data for outreach, research, or lead generation.
origin: custom
---

# Web Scraper – Business Info

Automatically collect business profiles from Google Maps for any category and area.

## When to Activate

- User wants to find businesses in a specific area by category
- User asks for auto repair shops, cosmetics, hair salons, restaurants, etc. near a location
- User wants to extract specific fields from Google business profiles
- Building a lead list or customer database from Google Maps
- User asks to "scrape Google Maps" or "collect business info"

## How It Works

1. Calls the **Google Places API** (Text Search + Place Details) — official, reliable, within ToS
2. Searches for businesses by `{category} in {location}`
3. For each result fetches a full Place Details record
4. Filters / formats output based on the user's custom instructions
5. Returns a structured JSON or CSV report

Requires a Google Places API key set as `GOOGLE_PLACES_API_KEY` in the environment.

## Setup

```bash
# Install dependencies
npm install

# Set your API key
export GOOGLE_PLACES_API_KEY="your-key-here"
```

Get a free API key at https://console.cloud.google.com → enable **Places API**.
The free tier covers ~5 000 requests/month.

## Usage

```bash
# Basic: find auto repair shops in Brno
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "autoopravna" \
  --location "Brno, Czech Republic" \
  --fields "name,address,phone,website,rating,hours"

# With custom instructions (passed as a string)
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "kosmetický salon" \
  --location "Praha" \
  --fields "name,address,phone,website,rating,reviews" \
  --instructions "Vypiš jen salony s hodnocením 4.0 a výše, seřaď podle počtu recenzí"

# Export to CSV
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "kadeřnictví" \
  --location "Ostrava" \
  --output csv > results.csv
```

## Available Fields

| Field | Description |
|-------|-------------|
| `name` | Business name |
| `address` | Formatted address |
| `phone` | Phone number |
| `website` | Website URL |
| `rating` | Average star rating (1–5) |
| `reviews` | Total review count |
| `hours` | Opening hours (all days) |
| `types` | Business category tags |
| `maps_url` | Direct Google Maps link |
| `place_id` | Unique Google Place ID |
| `lat` | Latitude |
| `lng` | Longitude |

## Examples

### Auto repair shops – full profile
```bash
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "autoopravna" \
  --location "Brno"
```

### Cosmetics – high-rated only
```bash
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "kosmetika" \
  --location "Praha" \
  --instructions "Pouze provozovny s ratingem >= 4.5"
```

### Hair salons – CSV export for outreach
```bash
node skills/web-scraper-business-info/scripts/scrapeBusinesses.js \
  --category "kadeřnictví" \
  --location "Plzeň" \
  --fields "name,phone,website,rating" \
  --output csv > kadernictvi_plzen.csv
```

## Claude Integration

When this skill is active, Claude will:
1. Ask the user for **category**, **location**, and optionally **custom instructions**
2. Run the script and read the raw JSON output
3. Apply the user's instructions (filter, sort, summarize) using its own reasoning
4. Present results in a clean table or list

## Notes

- Google Places API returns up to 60 results per search (3 pages × 20)
- Place Details cost ~$0.017 per call — keep `--max` low for testing
- For bulk scraping consider enabling caching (`--cache`) to avoid duplicate API calls
- If `GOOGLE_PLACES_API_KEY` is not set, the script falls back to a demo mock with 3 sample records
