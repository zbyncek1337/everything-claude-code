#!/usr/bin/env node
/**
 * Scrapes business profiles from Google Places API.
 * Usage: node scrapeBusinesses.js --category <str> --location <str> [options]
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// ── CLI argument parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    }
  }
  return args
}

const args = parseArgs(process.argv)
const CATEGORY = args.category || args.c
const LOCATION = args.location || args.l
const FIELDS = (args.fields || 'name,address,phone,website,rating,reviews,hours,maps_url').split(',')
const OUTPUT = args.output || 'json'
const MAX = parseInt(args.max || '20', 10)
const INSTRUCTIONS = args.instructions || ''
const CACHE_DIR = args.cache ? path.join(__dirname, '.cache') : null
const API_KEY = process.env.GOOGLE_PLACES_API_KEY |AIzaSyDbQz49oRgUxB5IvVBDUKT0lxDns1YeQe0| ''

if (!CATEGORY || !LOCATION) {
  console.error('Usage: node scrapeBusinesses.js --category <str> --location <str> [--fields name,phone,...] [--output json|csv] [--max 20] [--instructions "..."] [--cache]')
  process.exit(1)
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`))
        }
      })
    }).on('error', reject)
  })
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function cacheGet(key) {
  if (!CACHE_DIR) return null
  const file = path.join(CACHE_DIR, `${key}.json`)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  return null
}

function cacheSet(key, data) {
  if (!CACHE_DIR) return
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data))
}

// ── Google Places API ─────────────────────────────────────────────────────────

const PLACE_DETAIL_FIELDS = [
  'place_id', 'name', 'formatted_address', 'formatted_phone_number',
  'website', 'rating', 'user_ratings_total', 'opening_hours',
  'geometry', 'types', 'url',
].join(',')

async function textSearch(query, pageToken) {
  const params = new URLSearchParams({
    query,
    key: API_KEY,
    language: 'cs',
  })
  if (pageToken) params.set('pagetoken', pageToken)
  return httpsGet(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`)
}

async function placeDetails(placeId) {
  const cached = cacheGet(placeId)
  if (cached) return cached

  const params = new URLSearchParams({
    place_id: placeId,
    fields: PLACE_DETAIL_FIELDS,
    key: API_KEY,
    language: 'cs',
  })
  const data = await httpsGet(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
  const result = data.result || {}
  cacheSet(placeId, result)
  return result
}

// ── Mock data (fallback when no API key) ──────────────────────────────────────

function mockResults(category, location) {
  return [
    {
      place_id: 'mock_1',
      name: `${category} Demo 1`,
      formatted_address: `Hlavní 1, ${location}`,
      formatted_phone_number: '+420 123 456 789',
      website: 'https://example.com',
      rating: 4.7,
      user_ratings_total: 142,
      opening_hours: { weekday_text: ['Pondělí: 8:00–18:00', 'Úterý: 8:00–18:00'] },
      geometry: { location: { lat: 49.195, lng: 16.608 } },
      types: ['car_repair'],
      url: 'https://maps.google.com/?cid=mock1',
    },
    {
      place_id: 'mock_2',
      name: `${category} Demo 2`,
      formatted_address: `Vedlejší 5, ${location}`,
      formatted_phone_number: '+420 987 654 321',
      website: '',
      rating: 3.9,
      user_ratings_total: 28,
      opening_hours: { weekday_text: ['Pondělí: 9:00–17:00'] },
      geometry: { location: { lat: 49.198, lng: 16.612 } },
      types: ['car_repair', 'establishment'],
      url: 'https://maps.google.com/?cid=mock2',
    },
    {
      place_id: 'mock_3',
      name: `${category} Demo 3`,
      formatted_address: `Nová 12, ${location}`,
      formatted_phone_number: '+420 555 000 111',
      website: 'https://demo3.cz',
      rating: 4.2,
      user_ratings_total: 67,
      opening_hours: null,
      geometry: { location: { lat: 49.201, lng: 16.600 } },
      types: ['establishment'],
      url: 'https://maps.google.com/?cid=mock3',
    },
  ]
}

// ── Field extraction ──────────────────────────────────────────────────────────

function extractFields(place, fields) {
  const hours = place.opening_hours?.weekday_text?.join(' | ') || ''
  const map = {
    place_id: place.place_id || '',
    name: place.name || '',
    address: place.formatted_address || '',
    phone: place.formatted_phone_number || '',
    website: place.website || '',
    rating: place.rating ?? '',
    reviews: place.user_ratings_total ?? '',
    hours,
    types: (place.types || []).join(', '),
    maps_url: place.url || '',
    lat: place.geometry?.location?.lat ?? '',
    lng: place.geometry?.location?.lng ?? '',
  }
  if (fields.includes('*') || fields[0] === '*') return map
  return Object.fromEntries(fields.map(f => [f, map[f] ?? '']))
}

// ── Output formatters ─────────────────────────────────────────────────────────

function toCsv(records) {
  if (!records.length) return ''
  const headers = Object.keys(records[0])
  const escape = v => `"${String(v).replace(/"/g, '""')}"`
  return [
    headers.join(','),
    ...records.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const query = `${CATEGORY} ${LOCATION}`
  let places = []

  if (!API_KEY) {
    process.stderr.write('[warn] GOOGLE_PLACES_API_KEY not set — using mock data\n')
    places = mockResults(CATEGORY, LOCATION)
  } else {
    let pageToken = undefined
    while (places.length < MAX) {
      const res = await textSearch(query, pageToken)
      if (res.status !== 'OK' && res.status !== 'ZERO_RESULTS') {
        process.stderr.write(`[error] Places API: ${res.status} — ${res.error_message || ''}\n`)
        process.exit(1)
      }
      const batch = res.results || []
      places.push(...batch)
      pageToken = res.next_page_token
      if (!pageToken || places.length >= MAX) break
      // API requires a short delay before using next_page_token
      await new Promise(r => setTimeout(r, 2000))
    }
    places = places.slice(0, MAX)

    // Fetch full details for each place
    const detailed = []
    for (const p of places) {
      try {
        const detail = await placeDetails(p.place_id)
        detailed.push(detail)
      } catch (e) {
        process.stderr.write(`[warn] Could not fetch details for ${p.name}: ${e.message}\n`)
        detailed.push(p)
      }
    }
    places = detailed
  }

  const records = places.map(p => extractFields(p, FIELDS))

  if (INSTRUCTIONS) {
    process.stderr.write(`\n[instructions] ${INSTRUCTIONS}\n`)
    process.stderr.write('[info] Pass the JSON output below to Claude with the instructions above for filtering/sorting.\n\n')
  }

  if (OUTPUT === 'csv') {
    process.stdout.write(toCsv(records) + '\n')
  } else {
    process.stdout.write(JSON.stringify({ query, total: records.length, instructions: INSTRUCTIONS, records }, null, 2) + '\n')
  }
}

main().catch(e => {
  process.stderr.write(`[fatal] ${e.message}\n`)
  process.exit(1)
})
