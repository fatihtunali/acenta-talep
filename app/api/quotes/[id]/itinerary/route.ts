import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface SavedItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  mealCode: string;
  description: string;
}

interface SavedItineraryPayload {
  tourName: string;
  duration: string;
  days: SavedItineraryDay[];
  inclusions: string;
  exclusions: string;
  information: string;
}

const isString = (value: unknown): value is string =>
  typeof value === 'string';

const isSavedItineraryDay = (value: unknown): value is SavedItineraryDay => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const day = value as Partial<SavedItineraryDay>;
  return (
    typeof day.dayNumber === 'number' &&
    Number.isFinite(day.dayNumber) &&
    isString(day.date) &&
    isString(day.title) &&
    isString(day.mealCode) &&
    isString(day.description)
  );
};

const isSavedItineraryPayload = (value: unknown): value is SavedItineraryPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<SavedItineraryPayload>;
  return (
    isString(payload.tourName) &&
    isString(payload.duration) &&
    Array.isArray(payload.days) &&
    payload.days.every(isSavedItineraryDay) &&
    isString(payload.inclusions) &&
    isString(payload.exclusions) &&
    isString(payload.information)
  );
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quoteId = Number.parseInt(id, 10);

    if (!Number.isFinite(quoteId)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }

    const body = await request.json();
    if (!isSavedItineraryPayload(body)) {
      return NextResponse.json({ error: 'Invalid itinerary payload' }, { status: 400 });
    }

    const userId = Number.parseInt(session.user.id, 10);
    const serializedPayload = JSON.stringify(body);

    const executeUpdate = async () =>
      pool.execute<ResultSetHeader>(
        `UPDATE quotes
         SET itinerary_data = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [serializedPayload, quoteId, userId]
      );

    let result: ResultSetHeader | null = null;

    try {
      const [initialResult] = await executeUpdate();
      result = initialResult;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'ER_BAD_FIELD_ERROR'
      ) {
        await pool.execute(
          'ALTER TABLE quotes ADD COLUMN itinerary_data LONGTEXT NULL'
        );
        const [retryResult] = await executeUpdate();
        result = retryResult;
      } else {
        throw error;
      }
    }

    if (!result || result.affectedRows === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      itineraryData: body
    });
  } catch (error) {
    console.error('Error saving itinerary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save itinerary', details: message },
      { status: 500 }
    );
  }
}
