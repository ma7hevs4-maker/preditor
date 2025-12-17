import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');

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

    if (!OPENWEATHERMAP_API_KEY) {
      console.error('OPENWEATHERMAP_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Weather API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather for lat: ${lat}, lon: ${lon}, hours: ${hours}`);

    // Use OpenWeatherMap 3.0 One Call API for hourly forecast (48h) + daily for extended
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&cnt=${Math.min(Math.ceil(hours / 3), 40)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenWeatherMap API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Weather API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Received ${data.list?.length || 0} forecast entries`);

    // Transform to hourly data (interpolate 3-hour forecasts)
    const hourlyForecast: WeatherHour[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    for (let i = 0; i < Math.min(hours, 72); i++) {
      const targetHour = (currentHour + i) % 24;
      const dayOffset = Math.floor((currentHour + i) / 24);
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(targetHour, 0, 0, 0);

      // Find closest forecast entry (3-hour intervals)
      const forecastIndex = Math.min(Math.floor(i / 3), (data.list?.length || 1) - 1);
      const forecast = data.list?.[forecastIndex];

      if (forecast) {
        hourlyForecast.push({
          hour: targetHour,
          datetime: targetDate.toISOString(),
          temp_c: Math.round(forecast.main.temp * 10) / 10,
          precip_mm: forecast.rain?.['3h'] ? Math.round(forecast.rain['3h'] / 3 * 100) / 100 : 0,
          wind_ms: Math.round(forecast.wind.speed * 10) / 10,
          humidity: forecast.main.humidity,
          description: forecast.weather[0]?.description || '',
          icon: forecast.weather[0]?.icon || '01d',
        });
      }
    }

    console.log(`Returning ${hourlyForecast.length} hourly forecasts`);

    return new Response(
      JSON.stringify({ 
        forecast: hourlyForecast,
        city: data.city?.name,
        country: data.city?.country 
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
