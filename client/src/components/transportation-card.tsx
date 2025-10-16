import { Car, Plane, Bus, Train, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Transportation } from "@shared/schema";

interface TransportationCardProps {
  transport: Transportation;
}

const transportIcons: Record<string, any> = {
  "airport-transfer": Plane,
  "car-rental": Car,
  "local-transport": Bus,
  "intercity": Train,
};

const transportLabels: Record<string, string> = {
  "airport-transfer": "Airport Transfer",
  "car-rental": "Car Rental",
  "local-transport": "Local Transport",
  "intercity": "Inter-City",
};

export function TransportationCard({ transport }: TransportationCardProps) {
  const Icon = transportIcons[transport.type] || Car;
  
  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`card-transport-${transport.id}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{transport.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {transportLabels[transport.type]}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-xl font-bold text-primary">${transport.price}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <CardDescription>{transport.description}</CardDescription>
        
        {transport.duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{transport.duration}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
