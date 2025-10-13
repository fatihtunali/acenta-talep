'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SavedItinerary {
  id: number;
  quoteName: string;
  category: 'Fixed Departures' | 'Groups' | 'B2B' | 'B2C';
  seasonName?: string;
  validFrom?: string;
  validTo?: string;
  startDate: string;
  endDate: string;
  tourType: 'SIC' | 'Private';
  pax: number;
  createdAt: string;
  updatedAt: string;
}

export default function SavedItinerariesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch('/api/itineraries')
        .then((res) => res.json())
        .then((data) => {
          if (data.itineraries) {
            setItineraries(data.itineraries);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching itineraries:', err);
          setIsLoading(false);
        });
    }
  }, [session]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Sort itineraries by quote name
  const sortedItineraries = [...itineraries].sort((a, b) => {
    return a.quoteName.localeCompare(b.quoteName, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">Saved Itineraries</h1>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/quotes" className="text-sm text-gray-600 hover:text-gray-900">Quotes</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Saved Itineraries ({sortedItineraries.length})
            </h2>
          </div>

          {sortedItineraries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                No saved itineraries yet
              </p>
              <Link
                href="/quotes"
                className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Go to Quotes
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Quote Name
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Category
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Tour Dates
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                      Type
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      PAX
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Updated
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y-4 divide-blue-600">
                  {sortedItineraries.map((itinerary) => {
                    return (
                      <tr key={itinerary.id} className="hover:bg-gray-50 border-b-4 border-blue-600">
                        <td className="px-2 py-2 border-r-4 border-blue-500 border-t-4 border-l-4">
                          <div className="text-xs font-medium text-gray-900 truncate">{itinerary.quoteName}</div>
                          {itinerary.category === 'Fixed Departures' && itinerary.seasonName && (
                            <div className="text-xs font-semibold text-blue-700 mt-0.5 truncate">
                              {itinerary.seasonName}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 border-r-4 border-blue-500 border-t-4">
                          <span className={`px-1.5 py-0.5 inline-flex text-xs font-semibold rounded ${
                            itinerary.category === 'Fixed Departures'
                              ? 'bg-blue-100 text-blue-800'
                              : itinerary.category === 'Groups'
                              ? 'bg-green-100 text-green-800'
                              : itinerary.category === 'B2B'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {itinerary.category === 'Fixed Departures' ? 'FD' : itinerary.category}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r-4 border-blue-500 border-t-4">
                          {itinerary.category === 'Fixed Departures' && itinerary.seasonName ? (
                            <div className="text-xs">
                              <div className="font-semibold text-blue-800 truncate">{itinerary.seasonName}</div>
                              <div className="text-gray-600 text-xs">
                                {itinerary.validFrom ? new Date(itinerary.validFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''} - {itinerary.validTo ? new Date(itinerary.validTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-900">
                              {new Date(itinerary.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(itinerary.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 border-r-4 border-blue-500 border-t-4">
                          <span className={`px-1.5 py-0.5 inline-flex text-xs font-semibold rounded ${
                            itinerary.tourType === 'Private'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {itinerary.tourType}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 border-r-4 border-blue-500 border-t-4">
                          {itinerary.pax}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500 border-r-4 border-blue-500 border-t-4">
                          {new Date(itinerary.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium border-t-4 border-blue-500 border-r-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/itinerary?quote=${itinerary.id}`}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="View itinerary"
                            >
                              👁️
                            </Link>
                            <Link
                              href={`/quotes/${itinerary.id}`}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              title="View quote details"
                            >
                              📊
                            </Link>
                            <Link
                              href={`/itinerary?quote=${itinerary.id}#download`}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Download and share"
                            >
                              📥
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
