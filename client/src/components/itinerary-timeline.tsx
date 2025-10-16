import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Hotel, Compass, Car, Utensils, Sun } from "lucide-react";
import type { ItineraryDay } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ItineraryTimelineProps {
  itinerary: ItineraryDay[];
}

const activityIcons: Record<string, any> = {
  hotel: Hotel,
  sightseeing: Compass,
  transport: Car,
  meal: Utensils,
  "free-time": Sun,
};

const activityColors: Record<string, string> = {
  hotel: "bg-primary/10 text-primary border-primary/20",
  sightseeing: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  transport: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  meal: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  "free-time": "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

export function ItineraryTimeline({ itinerary }: ItineraryTimelineProps) {
  return (
    <Card className="shadow-xl border-card-border" data-testid="card-itinerary">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-serif flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Day-by-Day Itinerary
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Accordion type="multiple" defaultValue={itinerary.map((_, i) => `day-${i}`)} className="space-y-4">
          {itinerary.map((day, dayIndex) => {
            const Icon = activityIcons[day.activities[0]?.type] || Calendar;
            
            return (
              <AccordionItem 
                key={dayIndex} 
                value={`day-${dayIndex}`}
                className="border border-border rounded-xl overflow-hidden"
                data-testid={`accordion-day-${day.day}`}
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover-elevate">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Day {day.day}</h3>
                      <p className="text-sm text-muted-foreground">{day.date}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-4 pt-4 border-t border-border">
                    {day.activities.map((activity, activityIndex) => {
                      const ActivityIcon = activityIcons[activity.type] || Calendar;
                      
                      return (
                        <div 
                          key={activityIndex} 
                          className="flex gap-4 p-4 rounded-lg bg-muted/30 hover-elevate transition-all duration-200"
                          data-testid={`activity-${day.day}-${activityIndex}`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background shrink-0">
                              <ActivityIcon className="w-5 h-5 text-primary" />
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-foreground">{activity.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge 
                                      variant="outline" 
                                      className={`${activityColors[activity.type]} text-xs`}
                                    >
                                      {activity.type.replace('-', ' ')}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>{activity.time}</span>
                                    </div>
                                    {activity.duration && (
                                      <span className="text-xs text-muted-foreground">• {activity.duration}</span>
                                    )}
                                  </div>
                                </div>
                                {activity.price && activity.price > 0 && (
                                  <span className="text-sm font-semibold text-primary shrink-0">
                                    ${activity.price}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
