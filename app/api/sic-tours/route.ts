import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List all SIC tours with their pricing periods
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    let query = `
      SELECT
        st.id as tour_id,
        st.city,
        st.tour_name,
        st.created_at as tour_created_at,
        stp.id as pricing_id,
        stp.start_date,
        stp.end_date,
        stp.pp_dbl_rate,
        stp.single_supplement,
        stp.child_0to2,
        stp.child_3to5,
        stp.child_6to11,
        stp.created_at as pricing_created_at
      FROM sic_tours st
      LEFT JOIN sic_tour_pricing stp ON st.id = stp.tour_id
      WHERE st.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND st.city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY st.city, st.tour_name, stp.start_date`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Group pricing periods by tour
    const toursMap = new Map();

    rows.forEach((row) => {
      const tourId = row.tour_id;

      if (!toursMap.has(tourId)) {
        toursMap.set(tourId, {
          id: tourId,
          city: row.city,
          tour_name: row.tour_name,
          created_at: row.tour_created_at,
          pricing: []
        });
      }

      // Add pricing period if it exists
      if (row.pricing_id) {
        toursMap.get(tourId).pricing.push({
          id: row.pricing_id,
          start_date: row.start_date,
          end_date: row.end_date,
          pp_dbl_rate: parseFloat(row.pp_dbl_rate),
          single_supplement: row.single_supplement ? parseFloat(row.single_supplement) : null,
          child_0to2: row.child_0to2 ? parseFloat(row.child_0to2) : null,
          child_3to5: row.child_3to5 ? parseFloat(row.child_3to5) : null,
          child_6to11: row.child_6to11 ? parseFloat(row.child_6to11) : null,
          created_at: row.pricing_created_at
        });
      }
    });

    const sicTours = Array.from(toursMap.values());

    return NextResponse.json({ sicTours });
  } catch (error) {
    console.error('Error fetching SIC tours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SIC tours' },
      { status: 500 }
    );
  }
}

// POST - Create new SIC tour (without pricing initially)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sic_tours (user_id, city, tour_name)
       VALUES (?, ?, ?)`,
      [userId, data.city, data.tourName]
    );

    return NextResponse.json({
      success: true,
      sicTourId: result.insertId,
      message: 'SIC tour created successfully'
    });
  } catch (error) {
    console.error('Error creating SIC tour:', error);
    return NextResponse.json(
      { error: 'Failed to create SIC tour' },
      { status: 500 }
    );
  }
}
