// We import the functions from the utils file
import { assemblePayload }  from '../weather-utils.js';

// Read the secret API key and location from Vercel's "Environment Variables"
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_KEY_SECRET;
const ACCUWEATHER_LOCATION_KEY = process.env.ACCUWEATHER_LOCATION_KEY || '202440';

// This is the main serverless function
export default async function handler(request, response) {
  if (!ACCUWEATHER_API_KEY) {
    return response.status(500).json({ message: 'API key not configured.' });
  }

  // Helper to build the URL with the secret key
  const buildApiUrl = (path, params = {}) => {
    const url = new URL(path, 'https://dataservice.accuweather.com');
    url.searchParams.set('apikey', ACCUWEATHER_API_KEY);
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  };

  try {
    // Build the URLs to fetch from AccuWeather
    const currentUrl = buildApiUrl(
      `/currentconditions/v1/${ACCUWEATHER_LOCATION_KEY}`,
      { details: 'true' }
    );
    const forecastUrl = buildApiUrl(
      `/forecasts/v1/daily/1day/${ACCUWEATHER_LOCATION_KEY}`,
      { details: 'true', metric: 'true' }
    );
    const locationUrl = buildApiUrl(
      `/locations/v1/${ACCUWEATHER_LOCATION_KEY}`,
      {}
    );

    // Fetch all three requests in parallel
    const [currentRes, forecastRes, locationRes] = await Promise.all([
      fetch(currentUrl, { cache: 'no-store' }),
      fetch(forecastUrl, { cache: 'no-store' }),
      fetch(locationUrl, { cache: 'no-store' })
    ]);

    if (!currentRes.ok || !forecastRes.ok || !locationRes.ok) {
      throw new Error(
        `AccuWeather request failed (${currentRes.status}/${forecastRes.status}/${locationRes.status})`
      );
    }

    const [currentJson, forecastJson, locationJson] = await Promise.all([
      currentRes.json(),
      forecastRes.json(),
      locationRes.json()
    ]);

    const currentConditions = Array.isArray(currentJson)
      ? currentJson[0]
      : currentJson;

    if (!currentConditions) {
      throw new Error('Incomplete AccuWeather payload');
    }

    // Use your own utility functions to format the data
    const payload = assemblePayload(
      currentConditions,
      forecastJson,
      locationJson
    );

    // Send the final, clean data back to the frontend
    // We also set cache headers to tell Vercel to cache this for 30 mins
    response.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    response.status(200).json(payload);
  
  } catch (error) {
    console.error('Weather fetch failed', error);
    response.status(500).json({ message: error.message || 'Failed to fetch weather' });
  }
}