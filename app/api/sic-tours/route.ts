import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List all SIC tours for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    let query = `SELECT * FROM sic_tours WHERE user_id = ?`;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY city, tour_name`;

    const [sicTourRows] = await pool.execute<RowDataPacket[]>(query, params);

    const sicTours = sicTourRows.map(tour => ({
      id: tour.id,
      city: tour.city,
      tour_name: tour.tour_name,
      start_date: tour.start_date,
      end_date: tour.end_date,
      pp_dbl_rate: parseFloat(tour.pp_dbl_rate),
      single_supplement: tour.single_supplement ? parseFloat(tour.single_supplement) : null,
      child_0to2: tour.child_0to2 ? parseFloat(tour.child_0to2) : null,
      child_3to5: tour.child_3to5 ? parseFloat(tour.child_3to5) : null,
      child_6to11: tour.child_6to11 ? parseFloat(tour.child_6to11) : null,
      created_at: tour.created_at,
      updated_at: tour.updated_at
    }));

    return NextResponse.json({ sicTours });
  } catch (error) {
    console.error('Error fetching SIC tours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SIC tours' },
      { status: 500 }
    );
  }
}

// POST - Create new SIC tour
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sic_tours (user_id, city, tour_name, start_date, end_date, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.city,
        data.tourName,
        data.startDate || null,
        data.endDate || null,
        data.ppDblRate,
        data.singleSupplement || null,
        data.child0to2 || null,
        data.child3to5 || null,
        data.child6to11 || null
      ]
    );

    return NextResponse.json({
      success: true,
      sicTourId: result.insertId,
      message: 'SIC tour added successfully'
    });
  } catch (error) {
    console.error('Error creating SIC tour:', error);
    return NextResponse.json(
      { error: 'Failed to create SIC tour' },
      { status: 500 }
    );
  }
}
