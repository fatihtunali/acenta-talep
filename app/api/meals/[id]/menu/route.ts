import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// POST - Add menu item to restaurant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: restaurantId } = await params;
    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    // Verify restaurant belongs to user
    const [restaurantRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM restaurants WHERE id = ? AND user_id = ?`,
      [restaurantId, userId]
    );

    if (restaurantRows.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO restaurant_menu_pricing (restaurant_id, menu_option, price, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        restaurantId,
        data.menuOption,
        data.price,
        data.startDate || null,
        data.endDate || null
      ]
    );

    return NextResponse.json({
      success: true,
      menuId: result.insertId,
      message: 'Menu item added successfully'
    });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return NextResponse.json(
      { error: 'Failed to add menu item' },
      { status: 500 }
    );
  }
}
