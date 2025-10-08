import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// PUT - Update pricing period
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: hotelId, pricingId } = await params;
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
      `UPDATE hotel_pricing
       SET start_date = ?, end_date = ?, pp_dbl_rate = ?, single_supplement = ?,
           child_0to2 = ?, child_3to5 = ?, child_6to11 = ?
       WHERE id = ? AND hotel_id = ?`,
      [
        data.startDate || null,
        data.endDate || null,
        data.ppDblRate,
        data.singleSupplement || null,
        data.child0to2 || null,
        data.child3to5 || null,
        data.child6to11 || null,
        pricingId,
        hotelId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Pricing period not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing period updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing period' },
      { status: 500 }
    );
  }
}

// DELETE - Delete pricing period
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: hotelId, pricingId } = await params;
    const userId = parseInt(session.user.id, 10);

    // Verify hotel belongs to user
    const [hotelRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM hotels WHERE id = ? AND user_id = ?`,
      [hotelId, userId]
    );

    if (hotelRows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM hotel_pricing WHERE id = ? AND hotel_id = ?`,
      [pricingId, hotelId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Pricing period not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing period deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pricing:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing period' },
      { status: 500 }
    );
  }
}
