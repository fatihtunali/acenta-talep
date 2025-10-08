import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureCity, getCitiesForUser } from '@/lib/cities';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const cities = await getCitiesForUser(userId);

    return NextResponse.json({
      cities: cities.map(city => ({
        id: city.id,
        name: city.name
      }))
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    if (!data?.name || typeof data.name !== 'string') {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      );
    }

    const city = await ensureCity(userId, data.name);

    return NextResponse.json({
      success: true,
      city: {
        id: city.id,
        name: city.name
      }
    });
  } catch (error) {
    console.error('Error creating city:', error);
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    );
  }
}
