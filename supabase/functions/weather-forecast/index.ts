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

// Map WMO weather codes to descriptions and icons
function getWeatherInfo(code: number, isDay: boolean): { description: string; icon: string } {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, hours = 72 } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'lat and lon are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather from Open-Meteo for lat: ${lat}, lon: ${lon}, hours: ${hours}`);

    // Open-Meteo API - free, no API key required
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&forecast_days=4&timezone=auto`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Open-Meteo API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Weather API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Received ${data.hourly?.time?.length || 0} hourly entries from Open-Meteo`);

    // Transform Open-Meteo data to our format
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
        const weatherInfo = getWeatherInfo(hourlyData.weather_code[i], isDay);
        
        hourlyForecast.push({
          hour: datetime.getHours(),
          datetime: datetime.toISOString(),
          temp_c: Math.round(hourlyData.temperature_2m[i] * 10) / 10,
          precip_mm: Math.round(hourlyData.precipitation[i] * 100) / 100,
          wind_ms: Math.round((hourlyData.wind_speed_10m[i] / 3.6) * 10) / 10, // km/h to m/s
          humidity: hourlyData.relative_humidity_2m[i],
          description: weatherInfo.description,
          icon: weatherInfo.icon,
        });
      }
    }

    console.log(`Returning ${hourlyForecast.length} hourly forecasts`);

    return new Response(
      JSON.stringify({ 
        forecast: hourlyForecast,
        city: data.timezone?.split('/').pop()?.replace('_', ' ') || 'Unknown',
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
