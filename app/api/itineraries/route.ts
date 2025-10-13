import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Fetch all quotes with saved itineraries for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // Get quotes that have itinerary data (itinerary_data IS NOT NULL)
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        id,
        quote_name,
        category,
        season_name,
        valid_from,
        valid_to,
        start_date,
        end_date,
        tour_type,
        pax,
        created_at,
        updated_at
       FROM quotes
       WHERE user_id = ? AND itinerary_data IS NOT NULL
       ORDER BY updated_at DESC`,
      [userId]
    );

    // Format the response
    const itineraries = rows.map((row) => ({
      id: row.id,
      quoteName: row.quote_name,
      category: row.category,
      seasonName: row.season_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      startDate: row.start_date,
      endDate: row.end_date,
      tourType: row.tour_type,
      pax: row.pax,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ itineraries });
  } catch (error) {
    console.error('Error fetching itineraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    );
  }
}
