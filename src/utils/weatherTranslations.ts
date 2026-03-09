const WEATHER_TRANSLATIONS: Record<string, string> = {
  "clear sky": "Céu limpo",
  "few clouds": "Poucas nuvens",
  "scattered clouds": "Nuvens dispersas",
  "broken clouds": "Nuvens fragmentadas",
  "overcast clouds": "Nublado",
  "overcast": "Nublado",
  "light rain": "Chuva fraca",
  "moderate rain": "Chuva moderada",
  "heavy rain": "Chuva forte",
  "heavy intensity rain": "Chuva de forte intensidade",
  "very heavy rain": "Chuva muito forte",
  "extreme rain": "Chuva extrema",
  "freezing rain": "Chuva congelante",
  "light intensity shower rain": "Chuva leve",
  "shower rain": "Pancada de chuva",
  "heavy intensity shower rain": "Pancada forte",
  "ragged shower rain": "Pancada irregular",
  "light intensity drizzle": "Garoa leve",
  "drizzle": "Garoa",
  "heavy intensity drizzle": "Garoa intensa",
  "light intensity drizzle rain": "Garoa com chuva leve",
  "drizzle rain": "Garoa com chuva",
  "heavy intensity drizzle rain": "Garoa com chuva forte",
  "shower drizzle": "Garoa com pancada",
  "thunderstorm": "Tempestade",
  "thunderstorm with light rain": "Tempestade com chuva leve",
  "thunderstorm with rain": "Tempestade com chuva",
  "thunderstorm with heavy rain": "Tempestade com chuva forte",
  "light thunderstorm": "Tempestade leve",
  "heavy thunderstorm": "Tempestade forte",
  "ragged thunderstorm": "Tempestade irregular",
  "thunderstorm with light drizzle": "Tempestade com garoa",
  "thunderstorm with drizzle": "Tempestade com garoa",
  "thunderstorm with heavy drizzle": "Tempestade com garoa forte",
  "snow": "Neve",
  "light snow": "Neve leve",
  "heavy snow": "Neve forte",
  "sleet": "Granizo",
  "mist": "Névoa",
  "smoke": "Fumaça",
  "haze": "Neblina",
  "fog": "Nevoeiro",
  "sand": "Areia",
  "dust": "Poeira",
  "volcanic ash": "Cinza vulcânica",
  "squalls": "Rajadas",
  "tornado": "Tornado",
  "sunny": "Ensolarado",
  "partly cloudy": "Parcialmente nublado",
  "cloudy": "Nublado",
  "mainly clear": "Predominantemente limpo",
  "mainly sunny": "Predominantemente ensolarado",
  "partly sunny": "Parcialmente ensolarado",
  "rain": "Chuva",
  "patchy rain possible": "Possibilidade de chuva",
  "patchy rain nearby": "Chuva isolada próxima",
  "light drizzle": "Garoa leve",
};

export function translateWeatherDescription(description: string): string {
  const lower = description.toLowerCase().trim();
  
  // Exact match
  if (WEATHER_TRANSLATIONS[lower]) {
    return WEATHER_TRANSLATIONS[lower];
  }
  
  // Partial match - find the longest matching key
  let bestMatch = "";
  let bestTranslation = "";
  for (const [key, value] of Object.entries(WEATHER_TRANSLATIONS)) {
    if (lower.includes(key) && key.length > bestMatch.length) {
      bestMatch = key;
      bestTranslation = value;
    }
  }
  
  if (bestTranslation) return bestTranslation;
  
  // Return original capitalized if no translation found
  return description.charAt(0).toUpperCase() + description.slice(1);
}
