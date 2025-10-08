import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// POST - Add pricing period to hotel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: hotelId } = await params;
    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    // Verify hotel belongs to user
    const [hotelRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM hotels WHERE id = ? AND user_id = ?`,
      [hotelId, userId]
    );

    if (hotelRows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO hotel_pricing (hotel_id, start_date, end_date, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hotelId,
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
      pricingId: result.insertId,
      message: 'Pricing period added successfully'
    });
  } catch (error) {
    console.error('Error adding pricing:', error);
    return NextResponse.json(
      { error: 'Failed to add pricing period' },
      { status: 500 }
    );
  }
}
