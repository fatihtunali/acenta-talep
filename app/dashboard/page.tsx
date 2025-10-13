'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [itineraryCount, setItineraryCount] = useState<number>(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch saved itineraries count
  useEffect(() => {
    if (session) {
      fetch('/api/itineraries')
        .then((res) => res.json())
        .then((data) => {
          if (data.itineraries) {
            setItineraryCount(data.itineraries.length);
          }
        })
        .catch((err) => console.error('Error fetching itineraries count:', err));
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Tour Operator Pricing
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.name} ({session.user.email})
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pricing Management Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 Pricing & Quotes
          </h2>
          <p className="text-gray-600 mb-6">
            Create and manage your tour pricing quotes
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-lg"
            >
              ➕ Create New Quote
            </Link>
            <Link
              href="/quotes"
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-lg"
            >
              📂 View Saved Quotes
            </Link>
            <Link
              href="/saved-itineraries"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-lg relative"
            >
              📄 Saved Itineraries
              {itineraryCount > 0 && (
                <span className="ml-2 px-2.5 py-0.5 bg-white text-blue-600 rounded-full text-sm font-bold">
                  {itineraryCount}
                </span>
              )}
            </Link>
            <Link
              href="/itinerary"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md text-lg"
            >
              📋 Create Itinerary
            </Link>
          </div>
        </div>

        {/* AI Training Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🤖 AI Training
          </h2>
          <p className="text-gray-600 mb-6">
            Upload your ready-made itineraries for Funny AI to learn from
          </p>
          <div className="flex gap-4">
            <Link
              href="/training-itineraries"
              className="inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md text-lg"
            >
              📚 Training Itineraries
            </Link>
          </div>
        </div>

        {/* Database Management Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🗄️ Database Management
          </h2>
          <p className="text-gray-600 mb-6">
            Manage your pricing databases for hotels, tours, meals, transfers, and entrance fees
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Link
              href="/hotels"
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-colors"
            >
              <div className="text-4xl mb-3">🏨</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Hotels</h3>
              <p className="text-sm text-gray-600 text-center">Manage hotel pricing by city</p>
            </Link>

            <Link
              href="/sic-tours"
              className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg transition-colors"
            >
              <div className="text-4xl mb-3">🚌</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">SIC Tours</h3>
              <p className="text-sm text-gray-600 text-center">Shared in-coach tour pricing</p>
            </Link>

            <Link
              href="/meals"
              className="flex flex-col items-center justify-center p-6 bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-200 rounded-lg transition-colors"
            >
              <div className="text-4xl mb-3">🍽️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Meals</h3>
              <p className="text-sm text-gray-600 text-center">Restaurant & menu pricing</p>
            </Link>

            <Link
              href="/transfers"
              className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors"
            >
              <div className="text-4xl mb-3">🚗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Transfers</h3>
              <p className="text-sm text-gray-600 text-center">Airport & city transfers</p>
            </Link>

            <Link
              href="/sightseeing"
              className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-lg transition-colors"
            >
              <div className="text-4xl mb-3">🎫</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Entrance Fees</h3>
              <p className="text-sm text-gray-600 text-center">Sightseeing & attractions</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
