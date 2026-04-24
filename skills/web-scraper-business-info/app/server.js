const express = require('express')
const https = require('https')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Chyba pri parsovani odpovedi')) }
      })
    }).on('error', reject)
  })
}

function mockResults(category, location) {
  return [
    { name: category + ' Ukazka 1', address: 'Hlavni 1, ' + location, phone: '+420 123 456 789', website: 'https://example.com', rating: 4.7, reviews: 142, hours: 'Po-Pa: 8:00-18:00', maps_url: '#' },
    { name: category + ' Ukazka 2', address: 'Vedlejsi 5, ' + location, phone: '+420 987 654 321', website: '', rating: 3.9, reviews: 28, hours: 'Po-Pa: 9:00-17:00', maps_url: '#' },
    { name: category + ' Ukazka 3', address: 'Nova 12, ' + location, phone: '+420 555 000 111', website: 'https://demo3.cz', rating: 4.2, reviews: 67, hours: 'Po-So: 8:00-20:00', maps_url: '#' },
  ]
}

async function fetchPlaces(category, location, max) {
  const query = category + ' ' + location
  let places = []
  let pageToken = undefined
  while (places.length < max) {
    const params = new URLSearchParams({ query, key: API_KEY, language: 'cs' })
    if (pageToken) params.set('pagetoken', pageToken)
    const res = await httpsGet('https://maps.googleapis.com/maps/api/place/textsearch/json?' + params)
    if (res.status !== 'OK' && res.status !== 'ZERO_RESULTS') throw new Error('Google API chyba: ' + res.status + ' ' + (res.error_message || ''))
    places.push(...(res.results || []))
    pageToken = res.next_page_token
    if (!pageToken || places.length >= max) break
    await new Promise(r => setTimeout(r, 2000))
  }
  return places.slice(0, max)
}

async function fetchDetails(placeId) {
  const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,url'
  const params = new URLSearchParams({ place_id: placeId, fields, key: API_KEY, language: 'cs' })
  const res = await httpsGet('https://maps.googleapis.com/maps/api/place/details/json?' + params)
  return res.result || {}
}

app.post('/api/search', async (req, res) => {
  const { category, location, max = 20 } = req.body
  if (!category || !location) return res.status(400).json({ error: 'Vyplnte kategorii a lokalitu.' })
  try {
    let results
    if (!API_KEY) {
      results = mockResults(category, location)
    } else {
      const places = await fetchPlaces(category, location, parseInt(max))
      const detailed = []
      for (const p of places) {
        const d = await fetchDetails(p.place_id)
        detailed.push({
          name: d.name || p.name || '',
          address: d.formatted_address || '',
          phone: d.formatted_phone_number || '',
          website: d.website || '',
          rating: d.rating != null ? d.rating : '',
          reviews: d.user_ratings_total != null ? d.user_ratings_total : '',
          hours: d.opening_hours && d.opening_hours.weekday_text ? d.opening_hours.weekday_text.join(' | ') : '',
          maps_url: d.url || '',
        })
      }
      results = detailed
    }
    res.json({ results, mock: !API_KEY })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log('\nAplikace bezi na http://localhost:' + PORT)
  if (!API_KEY) console.log('GOOGLE_PLACES_API_KEY neni nastaven - zobrazuji se ukazkova data.')
})
