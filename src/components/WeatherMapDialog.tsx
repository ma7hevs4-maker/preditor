import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin } from "lucide-react";

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
  // Windy.com embed URL with coordinates
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=m/s&zoom=8&overlay=rain&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[700px] bg-card border-border p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa Climático - {baseName}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-full p-4 pt-2">
          <iframe
            src={windyUrl}
            className="w-full h-full rounded-lg border border-border"
            frameBorder="0"
            title={`Mapa climático de ${baseName}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
