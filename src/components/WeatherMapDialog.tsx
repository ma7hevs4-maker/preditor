import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WeatherMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lon: number;
  baseName: string;
}

export const WeatherMapDialog = ({
  open,
  onOpenChange,
  lat,
  lon,
  baseName,
}: WeatherMapDialogProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem("mapbox_token") || ""
  );
  const [tempToken, setTempToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveToken = () => {
    if (tempToken.trim()) {
      localStorage.setItem("mapbox_token", tempToken.trim());
      setMapboxToken(tempToken.trim());
      setError(null);
    }
  };

  useEffect(() => {
    if (!open || !mapContainer.current || !mapboxToken) return;

    const initMap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");

        mapboxgl.accessToken = mapboxToken;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [lon, lat],
          zoom: 10,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Add marker for the base location
        new mapboxgl.Marker({ color: "#22d3ee" })
          .setLngLat([lon, lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(`<strong>${baseName}</strong><br/>Lat: ${lat}<br/>Lon: ${lon}`)
          )
          .addTo(map.current);

        // Add weather layer (OpenWeatherMap tiles)
        map.current.on("load", () => {
          // Rain layer
          map.current?.addSource("rain", {
            type: "raster",
            tiles: [
              `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY || ""}`,
            ],
            tileSize: 256,
          });

          map.current?.addLayer({
            id: "rain-layer",
            type: "raster",
            source: "rain",
            paint: {
              "raster-opacity": 0.6,
            },
          });

          // Cloud layer
          map.current?.addSource("clouds", {
            type: "raster",
            tiles: [
              `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY || ""}`,
            ],
            tileSize: 256,
          });

          map.current?.addLayer({
            id: "clouds-layer",
            type: "raster",
            source: "clouds",
            paint: {
              "raster-opacity": 0.4,
            },
          });
        });

        setIsLoading(false);
      } catch (err) {
        setError("Erro ao carregar o mapa. Verifique se o token do Mapbox é válido.");
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [open, mapboxToken, lat, lon, baseName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa Climático - {baseName}
          </DialogTitle>
        </DialogHeader>

        {!mapboxToken ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <AlertCircle className="w-12 h-12 text-warning" />
            <h3 className="text-lg font-semibold">Token do Mapbox Necessário</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Para visualizar o mapa, você precisa de um token público do Mapbox.
              Crie uma conta em{" "}
              <a
                href="https://mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>{" "}
              e copie seu token público.
            </p>
            <div className="flex gap-2 w-full max-w-md">
              <Input
                placeholder="Cole seu token do Mapbox aqui"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                className="flex-1"
              />
              <Button onClick={saveToken} disabled={!tempToken.trim()}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.removeItem("mapbox_token");
                    setMapboxToken("");
                    setTempToken("");
                  }}
                >
                  Redefinir Token
                </Button>
              </div>
            )}
            <div ref={mapContainer} className="w-full h-full" />
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-muted-foreground">Camadas:</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500/60" />
                <span>Precipitação</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-400/60" />
                <span>Nuvens</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
