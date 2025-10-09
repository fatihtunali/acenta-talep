import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { dayData } = await request.json();

    const {
      dayNumber,
      location,
      previousLocation,
      activities,
      accommodation,
      meals,
      transfers,
      transportation,
      transportLocation,
      isFirstDay,
      isLastDay,
      isCityChange,
      transferMode,
      hasAirportTransfer,
      tourType,
      tourName
    } = dayData;

    // Create a context-aware prompt for OpenAI
    let contextInstructions = '';
    const isSIC = tourType === 'SIC';
    const hasActivities = activities && activities.length > 0;
    const tourTypeText = isSIC ? 'SIC (Group Tour)' : 'Private Tour';

    // Get transfer details
    const transferDetails = transfers?.map((t: any) => `${t.description} (${t.location || 'N/A'})`).join(', ') || 'No transfers';

    if (isFirstDay) {
      if (hasActivities) {
        contextInstructions = `This is DAY 1 (ARRIVAL DAY).
IMPORTANT: Start with "Upon arrival at ${location} Airport" and mention "met and privately transferred to your hotel". Then describe the scheduled ${tourTypeText} activities if any are scheduled for later in the day.`;
      } else {
        contextInstructions = `This is DAY 1 (ARRIVAL DAY).
IMPORTANT: Start with "Upon arrival at ${location} Airport" and mention "met and privately transferred to your hotel". This is a rest day with no scheduled activities - mention guests can relax and explore at leisure after check-in.`;
      }
    } else if (isLastDay) {
      if (hasActivities) {
        contextInstructions = `This is the LAST DAY (DEPARTURE DAY). Describe any morning ${tourTypeText} activities if scheduled, then MUST end with "private transfer to the airport for your departure flight."`;
      } else {
        contextInstructions = `This is the LAST DAY (DEPARTURE DAY). Mention guests can enjoy a leisurely morning, then MUST mention "private transfer to the airport for your departure flight."`;
      }
    } else if (isCityChange) {
      if (transferMode === 'flight') {
        contextInstructions = `INTERCITY TRANSFER DAY: Start with "After breakfast, fly from ${previousLocation} to ${location}" or "take a domestic flight to ${location}".`;
      } else {
        contextInstructions = `INTERCITY TRANSFER DAY: Start with "After breakfast, drive from ${previousLocation} to ${location}" or "enjoy a scenic drive to ${location}".`;
      }

      if (hasActivities) {
        contextInstructions += ` After arrival and hotel check-in, describe the ${tourTypeText} activities scheduled for the day.`;
      } else {
        contextInstructions += ` After arrival and hotel check-in, the rest of the day is free for guests to relax.`;
      }
    } else {
      if (hasActivities) {
        contextInstructions = `REGULAR DAY in ${location}. Start with "After breakfast" and describe the ${tourTypeText} activities and sightseeing.`;
      } else {
        contextInstructions = `REST DAY in ${location}. Start with "After breakfast" and mention this is a day at leisure for guests to explore independently or relax at the hotel.`;
      }
    }

    const prompt = `Write a professional tour itinerary description for Day ${dayNumber} of a tour package in Turkey.

CONTEXT: ${contextInstructions}

DETAILS:
- Current Location: ${location}
- Previous Location: ${previousLocation || 'N/A'}
- Accommodation: Hotel in ${location}
- Activities/Sightseeing: ${activities?.join(', ') || 'Rest day - no scheduled activities'}
- Meals Included: ${meals?.join(', ') || 'Not specified'}
- Transfers/Transportation: ${transferDetails}

TOUR TYPE: ${tourTypeText}
${tourName ? `SPECIFIC TOUR: ${tourName}` : ''}

CRITICAL WRITING GUIDELINES:
1. ALWAYS mention transfers explicitly:
   - Arrival day: "Upon arrival at [City] Airport, met and privately transferred to your hotel" (ALL airport transfers are PRIVATE, not shared)
   - Departure day: "Private transfer to the airport for your departure flight" (ALL airport transfers are PRIVATE, not shared)
   - Intercity: "Fly from [City A] to [City B]" or "Drive from [City A] to [City B]"
2. For SIC tours, mention it's a "group tour" or "shared tour" experience
3. For rest days, clearly state "day at leisure" or "free day" for independent exploration
4. Mention key activities and attractions with brief context
5. Use professional tour operator language
6. Be engaging but concise (2-4 sentences)
7. End with "Overnight in ${location}" (UNLESS it's departure day)
8. Make it flow naturally and sound professional
9. Do NOT mention specific hotel names, just say "hotel"

Write the description now:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert tour itinerary writer for a professional tour operator. Your writing style is:
- Clear and specific about transfers (airport pickups, flights between cities, road journeys)
- ALL airport transfers (arrival and departure) are PRIVATE transfers, not shared - always mention "privately transferred"
- For SIC (group) tours, mention they are shared/group tour experiences for sightseeing activities
- For rest days with no activities, clearly state it's a "day at leisure" for independent exploration
- Informative about attractions and activities
- Professional yet engaging
- Concise (2-4 sentences per day)
- Always mentions transfer modes explicitly (fly, drive, private airport transfer)
- Highlights key experiences without being overly promotional
- Differentiates between scheduled tour activities and free time

Write as if you're creating a premium tour package itinerary for clients.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const description = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary description' },
      { status: 500 }
    );
  }
}
