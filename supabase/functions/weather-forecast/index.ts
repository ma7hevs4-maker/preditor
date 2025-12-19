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
  wind_ms: number;
  humidity: number;
  description: string;
  icon: string;
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
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&forecast_days=4&timezone=auto`;
  
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
    const now = new Date();
    const currentHourIndex = hourlyData.time.findIndex((time: string) => {
      const forecastTime = new Date(time);
      return forecastTime >= now;
    });

    const startIndex = Math.max(0, currentHourIndex);
    const endIndex = Math.min(startIndex + hours, hourlyData.time.length);

    for (let i = startIndex; i < endIndex; i++) {
      const datetime = new Date(hourlyData.time[i]);
      const isDay = hourlyData.is_day[i] === 1;
      const weatherInfo = getWeatherInfoFromWMO(hourlyData.weather_code[i], isDay);
      
      hourlyForecast.push({
        hour: datetime.getHours(),
        datetime: datetime.toISOString(),
        temp_c: Math.round(hourlyData.temperature_2m[i] * 10) / 10,
        precip_mm: Math.round(hourlyData.precipitation[i] * 100) / 100,
        wind_ms: Math.round((hourlyData.wind_speed_10m[i] / 3.6) * 10) / 10,
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
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=${Math.ceil(hours / 3) + 1}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenWeatherMap API error:', errorText);
    throw new Error(`OpenWeatherMap API error: ${errorText}`);
  }

  const data = await response.json();
  const hourlyForecast: WeatherHour[] = [];
  
  if (data.list && data.list.length > 0) {
    const now = new Date();
    
    // OpenWeatherMap 5-day forecast gives data every 3 hours
    // We'll interpolate to create hourly data
    for (let i = 0; i < data.list.length - 1 && hourlyForecast.length < hours; i++) {
      const current = data.list[i];
      const next = data.list[i + 1];
      
      const currentTime = new Date(current.dt * 1000);
      const nextTime = new Date(next.dt * 1000);
      
      // Skip if in the past
      if (nextTime < now && i < data.list.length - 2) continue;
      
      // Create 3 hourly entries by interpolating between current and next
      for (let h = 0; h < 3 && hourlyForecast.length < hours; h++) {
        const factor = h / 3;
        const interpTime = new Date(currentTime.getTime() + (h * 60 * 60 * 1000));
        
        // Skip if before current time
        if (interpTime < now && hourlyForecast.length === 0) continue;
        
        const temp = current.main.temp + (next.main.temp - current.main.temp) * factor;
        const humidity = Math.round(current.main.humidity + (next.main.humidity - current.main.humidity) * factor);
        const windSpeed = current.wind.speed + (next.wind.speed - current.wind.speed) * factor;
        
        // Rain is accumulated over 3h, distribute it
        const rain3h = current.rain?.['3h'] || 0;
        const precipPerHour = rain3h / 3;
        
        const weather = current.weather[0];
        const isDay = interpTime.getHours() >= 6 && interpTime.getHours() < 18;
        const dayNight = isDay ? 'd' : 'n';
        
        hourlyForecast.push({
          hour: interpTime.getHours(),
          datetime: interpTime.toISOString(),
          temp_c: Math.round(temp * 10) / 10,
          precip_mm: Math.round(precipPerHour * 100) / 100,
          wind_ms: Math.round(windSpeed * 10) / 10, // OWM already returns m/s
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
