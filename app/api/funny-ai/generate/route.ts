import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Log request for debugging
    console.log('Funny AI request:', {
      days: body.days,
      cities: body.cities,
      tour_type: body.tour_type,
      day_details_count: body.day_details?.length || 0,
      first_day_sample: body.day_details?.[0] || 'N/A'
    });

    // Forward request to Funny AI service with LONG timeout
    const funnyAiUrl = process.env.FUNNY_AI_URL || 'http://localhost:8000';
    console.log('Using Funny AI URL:', funnyAiUrl);

    // Create AbortController with 5-minute timeout for slow AI processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const response = await fetch(`${funnyAiUrl}/funny-ai/generate-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Funny AI error:', errorText);
        return NextResponse.json(
          { error: `Funny AI request failed: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Funny AI request timed out after 5 minutes');
        return NextResponse.json(
          { error: 'AI generation timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error calling Funny AI:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate itinerary', details: message },
      { status: 500 }
    );
  }
}
