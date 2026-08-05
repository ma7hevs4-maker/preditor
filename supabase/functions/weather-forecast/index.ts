import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherHour {
  hour: number;
  datetime: string;
  temp_c: number;
  precip_mm: number;
  wind_kmh: number;
  gust_kmh: number;
  humidity: number;
  description: string;
  icon: string;
}

// Format Date as local datetime string without timezone suffix (YYYY-MM-DDTHH:mm:ss)
function formatLocalDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

// Map WMO weather codes to descriptions and icons (for Open-Meteo)
function getWeatherInfoFromWMO(code: number, isDay: boolean): { description: string; icon: string } {
  const dayNight = isDay ? 'd' : 'n';
  
  const weatherMap: Record<number, { description: string; icon: string }> = {
    0: { description: 'clear sky', icon: `01${dayNight}` },
    1: { description: 'mainly clear', icon: `01${dayNight}` },
    2: { description: 'partly cloudy', icon: `02${dayNight}` },
    3: { description: 'overcast', icon: `04${dayNight}` },
    45: { description: 'fog', icon: `50${dayNight}` },
    48: { description: 'depositing rime fog', icon: `50${dayNight}` },
    51: { description: 'light drizzle', icon: `09${dayNight}` },
    53: { description: 'moderate drizzle', icon: `09${dayNight}` },
    55: { description: 'dense drizzle', icon: `09${dayNight}` },
    56: { description: 'light freezing drizzle', icon: `09${dayNight}` },
    57: { description: 'dense freezing drizzle', icon: `09${dayNight}` },
    61: { description: 'slight rain', icon: `10${dayNight}` },
    63: { description: 'moderate rain', icon: `10${dayNight}` },
    65: { description: 'heavy rain', icon: `10${dayNight}` },
    66: { description: 'light freezing rain', icon: `13${dayNight}` },
    67: { description: 'heavy freezing rain', icon: `13${dayNight}` },
    71: { description: 'slight snow', icon: `13${dayNight}` },
    73: { description: 'moderate snow', icon: `13${dayNight}` },
    75: { description: 'heavy snow', icon: `13${dayNight}` },
    77: { description: 'snow grains', icon: `13${dayNight}` },
    80: { description: 'slight rain showers', icon: `09${dayNight}` },
    81: { description: 'moderate rain showers', icon: `09${dayNight}` },
    82: { description: 'violent rain showers', icon: `09${dayNight}` },
    85: { description: 'slight snow showers', icon: `13${dayNight}` },
    86: { description: 'heavy snow showers', icon: `13${dayNight}` },
    95: { description: 'thunderstorm', icon: `11${dayNight}` },
    96: { description: 'thunderstorm with slight hail', icon: `11${dayNight}` },
    99: { description: 'thunderstorm with heavy hail', icon: `11${dayNight}` },
  };

  return weatherMap[code] || { description: 'unknown', icon: `01${dayNight}` };
}

// Fetch from Open-Meteo (free, no API key)
async function fetchFromOpenMeteo(lat: number, lon: number, hours: number): Promise<WeatherHour[]> {
  console.log(`Fetching from Open-Meteo for lat: ${lat}, lon: ${lon}`);
  
  // One extra day is required because the rolling horizon starts at the
  // current local hour instead of midnight.
  const forecastDays = Math.min(Math.ceil(hours / 24) + 1, 16);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day&forecast_days=${forecastDays}&timezone=auto`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Open-Meteo API error:', errorText);
    throw new Error(`Open-Meteo API error: ${errorText}`);
  }

  const data = await response.json();
  const hourlyForecast: WeatherHour[] = [];
  const hourlyData = data.hourly;
  
  if (hourlyData && hourlyData.time) {
    const utcOffsetSeconds = Number(data.utc_offset_seconds ?? 0);
    const localNow = new Date(Date.now() + utcOffsetSeconds * 1000);
    const currentLocalHour = formatLocalDateTime(localNow).slice(0, 13);
    const startIndex = Math.max(0, hourlyData.time.findIndex((time: string) => time.slice(0, 13) >= currentLocalHour));
    const endIndex = Math.min(startIndex + hours, hourlyData.time.length);

    for (let i = startIndex; i < endIndex; i++) {
      const isDay = hourlyData.is_day[i] === 1;
      const weatherInfo = getWeatherInfoFromWMO(hourlyData.weather_code[i], isDay);
      
      hourlyForecast.push({
        hour: Number(hourlyData.time[i].slice(11, 13)),
        datetime: `${hourlyData.time[i]}:00`,
        temp_c: Math.round(hourlyData.temperature_2m[i] * 10) / 10,
        precip_mm: Math.round(hourlyData.precipitation[i] * 100) / 100,
        wind_kmh: Math.round(hourlyData.wind_speed_10m[i] * 10) / 10, // Already in km/h from Open-Meteo
        gust_kmh: Math.round((hourlyData.wind_gusts_10m?.[i] || hourlyData.wind_speed_10m[i] * 1.5) * 10) / 10, // Gusts in km/h
        humidity: hourlyData.relative_humidity_2m[i],
        description: weatherInfo.description,
        icon: weatherInfo.icon,
      });
    }
  }

  console.log(`Open-Meteo returned ${hourlyForecast.length} hourly forecasts`);
  return hourlyForecast;
}

// Fetch from OpenWeatherMap (requires API key)
async function fetchFromOpenWeatherMap(lat: number, lon: number, hours: number, apiKey: string): Promise<WeatherHour[]> {
  console.log(`Fetching from OpenWeatherMap for lat: ${lat}, lon: ${lon}`);
  
  // Use the 5-day/3-hour forecast endpoint (free tier)
  // For hourly data, we'd need the One Call API 3.0 which requires subscription
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=${Math.min(Math.ceil(hours / 3) + 2, 40)}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenWeatherMap API error:', errorText);
    throw new Error(`OpenWeatherMap API error: ${errorText}`);
  }

  const data = await response.json();
  const hourlyForecast: WeatherHour[] = [];
  
  if (data.list && data.list.length > 0) {
    const timezoneOffsetSeconds = data.city?.timezone ?? 0;
    // We'll interpolate to create hourly data
    for (let i = 0; i < data.list.length - 1 && hourlyForecast.length < hours; i++) {
      const current = data.list[i];
      const next = data.list[i + 1];
      
      // Create 3 hourly entries by interpolating between current and next
      for (let h = 0; h < 3 && hourlyForecast.length < hours; h++) {
        const factor = h / 3;
        const localUnixSeconds = current.dt + timezoneOffsetSeconds + (h * 60 * 60);
        const localDate = new Date(localUnixSeconds * 1000);
        
        const temp = current.main.temp + (next.main.temp - current.main.temp) * factor;
        const humidity = Math.round(current.main.humidity + (next.main.humidity - current.main.humidity) * factor);
        const windSpeed = current.wind.speed + (next.wind.speed - current.wind.speed) * factor;
        const gustSpeed = (current.wind.gust || current.wind.speed * 1.5) + ((next.wind.gust || next.wind.speed * 1.5) - (current.wind.gust || current.wind.speed * 1.5)) * factor;
        
        // Rain is accumulated over 3h, distribute it
        const rain3h = current.rain?.['3h'] || 0;
        const precipPerHour = rain3h / 3;
        
        const weather = current.weather[0];
        const localHour = localDate.getUTCHours();
        const isDay = localHour >= 6 && localHour < 18;
        const dayNight = isDay ? 'd' : 'n';
        
        hourlyForecast.push({
          hour: localHour,
          datetime: formatLocalDateTime(localDate),
          temp_c: Math.round(temp * 10) / 10,
          precip_mm: Math.round(precipPerHour * 100) / 100,
          wind_kmh: Math.round(windSpeed * 3.6 * 10) / 10, // OWM returns m/s, convert to km/h
          gust_kmh: Math.round(gustSpeed * 3.6 * 10) / 10, // OWM returns m/s, convert to km/h
          humidity: humidity,
          description: weather.description,
          icon: weather.icon.replace(/[dn]$/, dayNight), // Ensure correct day/night icon
        });
      }
    }
  }

  console.log(`OpenWeatherMap returned ${hourlyForecast.length} hourly forecasts`);
  return hourlyForecast;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, hours = 72, provider = 'openmeteo' } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'lat and lon are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Weather request - Provider: ${provider}, lat: ${lat}, lon: ${lon}, hours: ${hours}`);

    let forecast: WeatherHour[];
    let providerUsed = provider;

    if (provider === 'openweathermap') {
      const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
      
      if (!apiKey) {
        console.warn('OpenWeatherMap API key not found, falling back to Open-Meteo');
        forecast = await fetchFromOpenMeteo(lat, lon, hours);
        providerUsed = 'openmeteo';
      } else {
        try {
          forecast = await fetchFromOpenWeatherMap(lat, lon, hours, apiKey);
        } catch (error) {
          console.error('OpenWeatherMap failed, falling back to Open-Meteo:', error);
          forecast = await fetchFromOpenMeteo(lat, lon, hours);
          providerUsed = 'openmeteo';
        }
      }
    } else {
      forecast = await fetchFromOpenMeteo(lat, lon, hours);
    }

    return new Response(
      JSON.stringify({ 
        forecast,
        provider: providerUsed,
        city: 'Unknown',
        country: 'BR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in weather-forecast function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
