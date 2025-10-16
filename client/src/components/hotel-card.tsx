import { Star, MapPin, Wifi, Car, Coffee, Dumbbell } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Hotel } from "@shared/schema";

interface HotelCardProps {
  hotel: Hotel;
  nights: number;
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  gym: Dumbbell,
};

export function HotelCard({ hotel, nights }: HotelCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-200" data-testid={`card-hotel-${hotel.id}`}>
      <div className="relative h-48 bg-muted overflow-hidden">
        {hotel.imageUrl ? (
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <MapPin className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1.5 rounded-lg font-semibold shadow-lg">
          ${hotel.pricePerNight}/night
        </div>
      </div>
      
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl font-semibold line-clamp-1">{hotel.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">{hotel.category}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < hotel.rating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted"
              }`}
            />
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{hotel.rating}.0</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{hotel.location}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2">{hotel.description}</CardDescription>
        
        <div className="flex flex-wrap gap-2">
          {hotel.amenities.slice(0, 4).map((amenity, index) => {
            const Icon = amenityIcons[amenity.toLowerCase()] || Wifi;
            return (
              <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className="w-3 h-3" />
                <span className="capitalize">{amenity}</span>
              </div>
            );
          })}
          {hotel.amenities.length > 4 && (
            <span className="text-xs text-primary font-medium">+{hotel.amenities.length - 4} more</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <p className="text-sm text-muted-foreground">Total ({nights} nights)</p>
          <p className="text-2xl font-bold text-primary">${hotel.totalPrice}</p>
        </div>
      </CardFooter>
    </Card>
  );
}
