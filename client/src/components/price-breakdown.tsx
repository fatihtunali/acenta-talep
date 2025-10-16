import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, CreditCard } from "lucide-react";
import type { TripPackage } from "@shared/schema";

interface PriceBreakdownProps {
  tripPackage: TripPackage;
  onDownload?: () => void;
  onBook?: () => void;
}

export function PriceBreakdown({ tripPackage, onDownload, onBook }: PriceBreakdownProps) {
  const { pricing } = tripPackage;

  return (
    <Card className="sticky top-20 shadow-xl border-card-border" data-testid="card-price-breakdown">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-serif">Price Summary</CardTitle>
        <CardDescription>Complete cost breakdown for your trip</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Accommodation</span>
            <span className="font-semibold" data-testid="text-hotel-total">${pricing.hotelTotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sightseeing & Activities</span>
            <span className="font-semibold" data-testid="text-sightseeing-total">${pricing.sightseeingTotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transportation</span>
            <span className="font-semibold" data-testid="text-transport-total">${pricing.transportationTotal.toFixed(2)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-semibold">${pricing.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Taxes & Fees</span>
          <span className="font-semibold">${pricing.tax.toFixed(2)}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-3xl font-bold text-primary" data-testid="text-total-price">${pricing.total.toFixed(2)}</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-6 border-t border-border">
        <Button
          className="w-full bg-accent hover:bg-accent text-accent-foreground border-accent-border font-semibold"
          size="lg"
          onClick={onBook}
          data-testid="button-book-now"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Book Now
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onDownload}
          data-testid="button-download-pdf"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Itinerary PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
