// server/server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';

// ---------- Quotes (mock) ----------
const QUOTES = [
  { text: "The best way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill" },
  { text: "Don’t let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "You learn more from failure than from success. Don’t let it stop you. Failure builds character.", author: "Unknown" },
  { text: "It’s not whether you get knocked down, it’s whether you get up.", author: "Vince Lombardi" }
];

// ---------- Root ----------
app.get('/', (req, res) => {
  res.json({ message: 'InfoHub API is running.' });
});

// ---------- Quote API ----------
app.get('/api/quote', (req, res) => {
  try {
    const idx = Math.floor(Math.random() * QUOTES.length);
    res.json({ quote: QUOTES[idx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch quote.' });
  }
});

// weather api
// ---------- TODAY Weather (Open-Meteo only: current + today's min/max/POP) ----------
app.get('/api/weather_today', async (req, res) => {
  try {
    const city = (req.query.city || 'London').trim();
    if (!city) return res.status(400).json({ error: 'City is required.' });

    // 1) Geocode via Open-Meteo (free, no key)
    const geoResp = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: city, count: 1, language: 'en', format: 'json' },
      timeout: 8000
    });
    const g = geoResp.data?.results?.[0];
    if (!g) return res.status(404).json({ error: 'City not found.' });

    const { latitude, longitude, name, country_code } = g;

    // 2) Fetch current + today's daily summary
    const meteoResp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude, longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_mean',
        timezone: 'auto'
      },
      timeout: 8000
    });

    const current = meteoResp.data?.current;
    const daily = meteoResp.data?.daily;
    if (!current || !daily) return res.status(502).json({ error: 'Could not fetch today weather.' });

    // Map WMO code -> simple text
    const code = current.weather_code;
    const toText = (c) => {
      if ([0].includes(c)) return 'Clear';
      if ([1,2,3].includes(c)) return 'Partly cloudy';
      if ([45,48].includes(c)) return 'Fog';
      if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)) return 'Rain';
      if ([71,73,75,77,85,86].includes(c)) return 'Snow';
      if ([95,96,99].includes(c)) return 'Thunderstorm';
      return 'Clouds';
    };

    // Take the first (today) from daily arrays
    const today = {
      tmax: Math.round(daily.temperature_2m_max?.[0]),
      tmin: Math.round(daily.temperature_2m_min?.[0]),
      pop: daily.precipitation_probability_mean?.[0] ?? null,
      wmo: daily.weathercode?.[0] ?? null
    };

    return res.json({
      location: { city: name, countryCode: (country_code || '').toUpperCase() },
      current: {
        tempC: Math.round(current.temperature_2m),
        feels_like: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        condition: toText(code),
        wmo: code
      },
      today
    });
  } catch (err) {
    console.error('Weather-today error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Could not fetch today weather.' });
  }
});




// ---------- Currency API (with base/symbols & caching) ----------
const currencyCache = {}; // { "<base>|<symbols>": { ts, rates } }
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const ALLOW = new Set([
  "USD","EUR","GBP","INR","JPY","AUD","CAD","SGD","CHF","CNY","AED","NZD","ZAR","SEK","NOK","DKK","HKD","KRW","THB","MYR","PHP","IDR","BRL","RUB","PLN","MXN","TWD"
]);

app.get('/api/currency', async (req, res) => {
  try {
    // 1) Normalize & validate
    const amountParam = req.query.amount;
    const amount = amountParam ? parseFloat(amountParam) : 1;
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount. Provide a positive number.' });
    }
    const base = (req.query.base || 'INR').toUpperCase();
    let symbolsParam = (req.query.symbols || 'USD,EUR').toUpperCase();

    let symbolsList = symbolsParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Filter to allowed codes (avoid provider errors)
    symbolsList = symbolsList.filter(s => ALLOW.has(s));
    if (!ALLOW.has(base)) {
      return res.status(400).json({ error: `Base currency '${base}' not supported.` });
    }
    if (symbolsList.length === 0) {
      return res.status(400).json({ error: 'No valid target currencies were provided.' });
    }
    // Prevent base in targets
    symbolsList = symbolsList.filter(s => s !== base);

    const cacheKey = `${base}|${symbolsList.join(',')}`;
    const now = Date.now();
    if (currencyCache[cacheKey] && (now - currencyCache[cacheKey].ts) < CACHE_TTL_MS) {
      const rates = currencyCache[cacheKey].rates;
      const conversions = {};
      for (const k of Object.keys(rates)) conversions[k] = +(amount * rates[k]).toFixed(6);
      return res.json({ base, amount, conversions, source: 'cache', cachedAt: currencyCache[cacheKey].ts });
    }

    // 2) Helper to compute + cache response
    const respondWithRates = (providerName, ratesObj) => {
      // Keep only requested symbols (some providers return more)
      const rates = {};
      for (const s of symbolsList) {
        if (ratesObj[s] == null) continue;
        rates[s] = ratesObj[s];
      }
      if (Object.keys(rates).length === 0) {
        return res.status(502).json({ error: 'Provider returned no usable rates.' });
      }
      currencyCache[cacheKey] = { ts: now, rates };
      const conversions = {};
      for (const k of Object.keys(rates)) conversions[k] = +(amount * rates[k]).toFixed(6);
      return res.json({ base, amount, conversions, source: providerName });
    };

    // 3) Provider #1 — exchangerate.host
    try {
      const resp = await axios.get('https://api.exchangerate.host/latest', {
        params: { base, symbols: symbolsList.join(',') },
        timeout: 8000,
      });
      if (resp.data && resp.data.rates) {
        return respondWithRates('exchangerate.host', resp.data.rates);
      }
      // fall through to next provider
    } catch (e) {
      // continue to fallback
    }

    // 4) Provider #2 — Frankfurter (slightly different param names)
    try {
      const resp2 = await axios.get('https://api.frankfurter.app/latest', {
        params: { from: base, to: symbolsList.join(',') },
        timeout: 8000,
      });
      if (resp2.data && resp2.data.rates) {
        return respondWithRates('frankfurter', resp2.data.rates);
      }
    } catch (e) {
      // continue to fallback
    }

    // 5) Provider #3 — Open ER API (returns full table for base)
    try {
      const resp3 = await axios.get(`https://open.er-api.com/v6/latest/${base}`, { timeout: 8000 });
      if (resp3.data && resp3.data.result === 'success' && resp3.data.rates) {
        // pick only targets
        const picked = {};
        for (const s of symbolsList) {
          if (resp3.data.rates[s] != null) picked[s] = resp3.data.rates[s];
        }
        if (Object.keys(picked).length > 0) {
          return respondWithRates('open.er-api.com', picked);
        }
      }
    } catch (e) {
      // exhausted
    }

    // 6) All providers failed
    return res.status(502).json({ error: 'Bad response from currency provider.' });
  } catch (err) {
    console.error('Currency error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Could not fetch currency data.' });
  }
});


// ---------- Start ----------
module.exports = app;
