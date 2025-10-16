import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { TripForm } from "@/components/trip-form";
import { HotelCard } from "@/components/hotel-card";
import { SightseeingCard } from "@/components/sightseeing-card";
import { TransportationCard } from "@/components/transportation-card";
import { PriceBreakdown } from "@/components/price-breakdown";
import { ItineraryTimeline } from "@/components/itinerary-timeline";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, MapPin, Calendar, DollarSign, CheckCircle, Star, Users } from "lucide-react";
import type { TripRequest, TripPackage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import heroImage from "@assets/generated_images/Tropical_beach_sunset_hero_image_9cfd60e8.png";

export default function Home() {
  const [tripPackage, setTripPackage] = useState<TripPackage | null>(null);
  const { toast } = useToast();

  const generateItinerary = useMutation({
    mutationFn: async (data: TripRequest) => {
      const response = await apiRequest("POST", "/api/generate-itinerary", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.package) {
        setTripPackage(data.package);
        toast({
          title: "Itinerary Generated!",
          description: "Your personalized travel plan is ready.",
        });
        
        setTimeout(() => {
          const resultsSection = document.getElementById("results");
          if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to generate itinerary. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Download",
      description: "Your itinerary is being prepared for download.",
    });
  };

  const handleBookNow = () => {
    toast({
      title: "Booking",
      description: "Redirecting to booking confirmation...",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Tropical paradise destination"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <Badge className="mb-4 bg-white/20 backdrop-blur-md border-white/30 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Travel Planning
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-6">
            Your Dream Trip, Perfectly Planned
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            Let AI create personalized itineraries with hotels, sightseeing, and transportation—all with instant pricing
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent text-accent-foreground border-accent-border text-lg px-8 py-6 font-semibold"
            onClick={() => {
              const plannerSection = document.getElementById("trip-planner");
              if (plannerSection) {
                plannerSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            data-testid="button-hero-cta"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start Planning Now
          </Button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to your perfect vacation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-serif">1. Share Your Details</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Tell us your destination, dates, budget, and preferences
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-serif">2. AI Creates Your Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our AI generates personalized recommendations and itineraries
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-serif">3. Book & Enjoy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Review, customize, and book your perfect trip with confidence
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trip Planner Form Section */}
      <section id="trip-planner" className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">
              Create Your Itinerary
            </h2>
            <p className="text-lg text-muted-foreground">
              Fill in the details and let AI do the rest
            </p>
          </div>

          <TripForm 
            onSubmit={(data) => generateItinerary.mutate(data)} 
            isLoading={generateItinerary.isPending}
          />
        </div>
      </section>

      {/* Results Section */}
      {generateItinerary.isPending && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <LoadingSkeleton />
          </div>
        </section>
      )}

      {tripPackage && (
        <section id="results" className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4" variant="outline">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">
                Your Personalized Trip Package
              </h2>
              <p className="text-lg text-muted-foreground">
                {tripPackage.tripRequest.destination} • {tripPackage.tripRequest.nights} Nights • {tripPackage.tripRequest.travelers} Travelers
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Hotel */}
                <div>
                  <h3 className="text-2xl font-semibold font-serif mb-4 flex items-center gap-2">
                    <Star className="w-6 h-6 text-primary" />
                    Your Accommodation
                  </h3>
                  <HotelCard hotel={tripPackage.hotel} nights={tripPackage.tripRequest.nights} />
                </div>

                {/* Sightseeing */}
                <div>
                  <h3 className="text-2xl font-semibold font-serif mb-4 flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    Sightseeing & Activities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tripPackage.sightseeing.map((activity) => (
                      <SightseeingCard key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>

                {/* Transportation */}
                <div>
                  <h3 className="text-2xl font-semibold font-serif mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-primary" />
                    Transportation
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {tripPackage.transportation.map((transport) => (
                      <TransportationCard key={transport.id} transport={transport} />
                    ))}
                  </div>
                </div>

                {/* Itinerary */}
                <div>
                  <ItineraryTimeline itinerary={tripPackage.itinerary} />
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="lg:col-span-1">
                <PriceBreakdown
                  tripPackage={tripPackage}
                  onDownload={handleDownloadPDF}
                  onBook={handleBookNow}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">What Travelers Say</h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of happy travelers who planned with us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Sarah Johnson</CardTitle>
                    <CardDescription>Honeymooner • Bali Trip</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  "The AI-generated itinerary was absolutely perfect! Every detail was thoughtfully planned, and we discovered places we would have never found on our own. Best vacation ever!"
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Michael Chen</CardTitle>
                    <CardDescription>Family Vacation • Tokyo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  "Saved us hours of planning! The recommendations were spot-on for our family with kids. The pricing was transparent and the itinerary was easy to follow. Highly recommend!"
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-semibold">TravelAI</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered travel planning that makes your dream trips a reality.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Destinations</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Trust & Security</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">SSL Secured</Badge>
                <Badge variant="outline">PCI Compliant</Badge>
                <Badge variant="outline">24/7 Support</Badge>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2024 TravelAI. All rights reserved. Powered by Advanced AI Technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
