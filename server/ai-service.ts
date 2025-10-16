import type { TripRequest, TripPackage, Hotel, Sightseeing, Transportation, ItineraryDay } from "@shared/schema";
import { randomUUID } from "crypto";

// Custom AI endpoint configuration
const AI_ENDPOINT = process.env.AI_ENDPOINT || "https://itinerary-ai.ruzgargucu.com";

interface AIItineraryResponse {
  hotel: Omit<Hotel, "id">;
  sightseeing: Omit<Sightseeing, "id">[];
  transportation: Omit<Transportation, "id">[];
  itinerary: ItineraryDay[];
}

export async function generateItinerary(request: TripRequest): Promise<Omit<TripPackage, "id" | "createdAt">> {
  const prompt = `You are an expert travel planner. Create a detailed, personalized travel itinerary based on the following request:

Destination: ${request.destination}
Duration: ${request.nights} nights (${request.nights + 1} days)
Check-in: ${request.checkInDate}
Check-out: ${request.checkOutDate}
Number of Travelers: ${request.travelers}
Budget: ${request.budget}
Preferences: ${request.preferences || "General sightseeing and local experiences"}

Generate a comprehensive travel package including:

1. ONE hotel recommendation that matches the budget level:
   - budget: $50-100/night
   - moderate: $100-200/night  
   - luxury: $200-400/night

2. 3-4 sightseeing activities/attractions with:
   - Mix of categories: cultural, adventure, relaxation, entertainment, nature
   - Realistic pricing based on destination
   - Duration for each activity
   - Best time to visit

3. Transportation options including:
   - Airport transfer
   - Any local transport passes or rentals needed

4. Day-by-day itinerary with:
   - Specific times for each activity
   - Mix of hotel check-in/out, sightseeing, meals, and free time
   - Realistic scheduling

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "hotel": {
    "name": "string",
    "category": "budget" | "moderate" | "luxury",
    "rating": number (1-5),
    "pricePerNight": number,
    "totalPrice": number (nights × pricePerNight),
    "amenities": ["wifi", "parking", "breakfast", "gym", "pool"],
    "description": "string",
    "location": "string (neighborhood/area in destination)"
  },
  "sightseeing": [
    {
      "name": "string",
      "description": "string",
      "duration": "string (e.g., '2 hours', '3-4 hours')",
      "price": number,
      "category": "cultural" | "adventure" | "relaxation" | "entertainment" | "nature",
      "bestTimeToVisit": "string (optional)"
    }
  ],
  "transportation": [
    {
      "type": "airport-transfer" | "car-rental" | "local-transport" | "intercity",
      "name": "string",
      "description": "string",
      "price": number,
      "duration": "string (optional)"
    }
  ],
  "itinerary": [
    {
      "day": number (1 to ${request.nights + 1}),
      "date": "string (YYYY-MM-DD format)",
      "activities": [
        {
          "time": "string (e.g., '09:00 AM')",
          "title": "string",
          "description": "string",
          "type": "hotel" | "sightseeing" | "transport" | "meal" | "free-time",
          "duration": "string (optional)",
          "price": number (optional, 0 if included)
        }
      ]
    }
  ]
}`;

  try {
    // Call custom AI endpoint
    const response = await fetch(`${AI_ENDPOINT}/generate-itinerary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: request.destination,
        nights: request.nights,
        checkInDate: request.checkInDate,
        checkOutDate: request.checkOutDate,
        travelers: request.travelers,
        budget: request.budget,
        preferences: request.preferences || "General sightseeing and local experiences"
      })
    });

    if (!response.ok) {
      throw new Error(`AI API returned status ${response.status}`);
    }

    const responseText = await response.text();
    
    // Remove markdown code blocks if present
    let jsonText = responseText;
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const aiResponse: AIItineraryResponse = JSON.parse(jsonText);

    // Add IDs to generated items
    const hotel: Hotel = {
      id: randomUUID(),
      ...aiResponse.hotel,
    };

    const sightseeing: Sightseeing[] = aiResponse.sightseeing.map(activity => ({
      id: randomUUID(),
      ...activity,
    }));

    const transportation: Transportation[] = aiResponse.transportation.map(transport => ({
      id: randomUUID(),
      ...transport,
    }));

    // Calculate pricing
    const hotelTotal = hotel.totalPrice;
    const sightseeingTotal = sightseeing.reduce((sum, item) => sum + item.price, 0);
    const transportationTotal = transportation.reduce((sum, item) => sum + item.price, 0);
    const subtotal = hotelTotal + sightseeingTotal + transportationTotal;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const tripPackage: Omit<TripPackage, "id" | "createdAt"> = {
      tripRequest: request,
      hotel,
      sightseeing,
      transportation,
      itinerary: aiResponse.itinerary,
      pricing: {
        hotelTotal,
        sightseeingTotal,
        transportationTotal,
        subtotal,
        tax,
        total,
      },
    };

    return tripPackage;
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error("Failed to generate itinerary. Please try again.");
  }
}
