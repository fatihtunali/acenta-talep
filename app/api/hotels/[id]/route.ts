import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

// PUT - Update hotel
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
    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE hotels
       SET city = ?, hotel_name = ?, category = ?, start_date = ?, end_date = ?, pp_dbl_rate = ?,
           single_supplement = ?, child_0to2 = ?, child_3to5 = ?, child_6to11 = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.city,
        data.hotelName,
        data.category,
        data.startDate || null,
        data.endDate || null,
        data.ppDblRate,
        data.singleSupplement || null,
        data.child0to2 || null,
        data.child3to5 || null,
        data.child6to11 || null,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Hotel updated successfully'
    });
  } catch (error) {
    console.error('Error updating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel' },
      { status: 500 }
    );
  }
}

// DELETE - Delete hotel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id, 10);

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM hotels WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return NextResponse.json(
      { error: 'Failed to delete hotel' },
      { status: 500 }
    );
  }
}
