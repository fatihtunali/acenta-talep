import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tripRequestSchema, type TripRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Wallet, Sparkles } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface TripFormProps {
  onSubmit: (data: TripRequest) => void;
  isLoading?: boolean;
}

export function TripForm({ onSubmit, isLoading = false }: TripFormProps) {
  const form = useForm<TripRequest>({
    resolver: zodResolver(tripRequestSchema),
    defaultValues: {
      destination: "",
      nights: 3,
      checkInDate: "",
      checkOutDate: "",
      travelers: 2,
      budget: "moderate",
      preferences: "",
    },
  });

  return (
    <Card className="shadow-xl border-card-border" data-testid="card-trip-form">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-serif">Plan Your Dream Trip</CardTitle>
        <CardDescription>
          Tell us about your travel plans and let AI create a personalized itinerary for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Destination
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Paris, Tokyo, New York"
                      {...field}
                      data-testid="input-destination"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Check-in Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-checkin-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-checkout-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Nights</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-nights"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="travelers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Number of Travelers
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-travelers"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Budget Range
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-budget">
                        <SelectValue placeholder="Select your budget" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="budget">Budget-Friendly</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Preferences (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Cultural experiences, adventure activities, food tours, family-friendly..."
                      className="resize-none h-24"
                      {...field}
                      data-testid="input-preferences"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent text-accent-foreground border-accent-border py-6 text-lg font-semibold"
              disabled={isLoading}
              data-testid="button-generate-itinerary"
            >
              {isLoading ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                  Generating Your Perfect Trip...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate AI Itinerary
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
