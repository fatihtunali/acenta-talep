import { NextRequest, NextResponse } from 'next/server';

// Custom AI API endpoint
const AI_API_URL = 'https://itinerary-ai.ruzgargucu.com/v1/generate';

export async function POST(request: NextRequest) {
  try {
    const { dayData, customPrompt } = await request.json();

    // If custom prompt is provided, use it directly
    if (customPrompt) {
      const systemMessage = "You are a professional tour package copywriter. Generate concise, attractive titles and descriptions for tour packages.";
      const fullPrompt = `${systemMessage}\n\n${customPrompt}`;

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      const description = data.result?.trim() || '';
      return NextResponse.json({ description });
    }

    const {
      dayNumber,
      location,
      previousLocation,
      activities,
      meals,
      transfers,
      isFirstDay,
      isLastDay,
      isCityChange,
      transferMode,
      tourType,
      tourName
    } = dayData;

    interface TransferInfo {
      description: string;
      location?: string | null;
    }

    const normalizedTransfers: TransferInfo[] = Array.isArray(transfers)
      ? transfers.filter(
          (transfer: TransferInfo | null | undefined): transfer is TransferInfo =>
            typeof transfer?.description === 'string' && transfer.description.trim().length > 0
        )
      : [];

    // Create a context-aware prompt for OpenAI
    let contextInstructions = '';
    const isSIC = tourType === 'SIC';
    const hasActivities = activities && activities.length > 0;
    const tourTypeText = isSIC ? 'SIC (Group Tour)' : 'Private Tour';

    // Get transfer details
    const transferDetails =
      normalizedTransfers.map(transfer => `${transfer.description} (${transfer.location || 'N/A'})`).join(', ') ||
      'No transfers';

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
        contextInstructions = `This is the LAST DAY (DEPARTURE DAY). Do NOT start with "Departure Day from [city]" as this is already in the title. Simply describe any morning ${tourTypeText} activities if scheduled, then MUST end with "private transfer to the airport for your departure flight."`;
      } else {
        contextInstructions = `This is the LAST DAY (DEPARTURE DAY). Do NOT start with "Departure Day from [city]" as this is already in the title. Simply start with "After breakfast" and mention check-out, then MUST end with "private transfer to the airport for your departure flight."`;
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

    const systemMessage = `You are an expert tour itinerary writer for a professional tour operator. Your writing style is:
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

Write as if you're creating a premium tour package itinerary for clients.`;

    const fullPrompt = `${systemMessage}\n\n${prompt}`;

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const description = data.result?.trim() || '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary description' },
      { status: 500 }
    );
  }
}
