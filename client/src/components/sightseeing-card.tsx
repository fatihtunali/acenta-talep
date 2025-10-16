import { Clock, MapPin, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Sightseeing } from "@shared/schema";

interface SightseeingCardProps {
  activity: Sightseeing;
}

const categoryColors: Record<string, string> = {
  cultural: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  adventure: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  relaxation: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  entertainment: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
  nature: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

export function SightseeingCard({ activity }: SightseeingCardProps) {
  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`card-sightseeing-${activity.id}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-1">{activity.name}</CardTitle>
          <Badge className={categoryColors[activity.category] || "bg-muted"} variant="outline">
            {activity.category}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{activity.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="w-4 h-4" />
            <span className="font-semibold text-primary">${activity.price}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2">{activity.description}</CardDescription>
        
        {activity.bestTimeToVisit && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Best Time to Visit</p>
              <p className="text-xs text-muted-foreground">{activity.bestTimeToVisit}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
