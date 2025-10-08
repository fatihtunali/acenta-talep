import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// PUT - Update menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; menuId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: restaurantId, menuId } = await params;
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
      `UPDATE restaurant_menu_pricing
       SET menu_option = ?, price = ?, start_date = ?, end_date = ?
       WHERE id = ? AND restaurant_id = ?`,
      [
        data.menuOption,
        data.price,
        data.startDate || null,
        data.endDate || null,
        menuId,
        restaurantId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; menuId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: restaurantId, menuId } = await params;
    const userId = parseInt(session.user.id, 10);

    // Verify restaurant belongs to user
    const [restaurantRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM restaurants WHERE id = ? AND user_id = ?`,
      [restaurantId, userId]
    );

    if (restaurantRows.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM restaurant_menu_pricing WHERE id = ? AND restaurant_id = ?`,
      [menuId, restaurantId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
