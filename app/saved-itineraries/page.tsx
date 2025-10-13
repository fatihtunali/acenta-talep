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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Saved Itineraries
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              All Saved Itineraries ({itineraries.length})
            </h2>
          </div>

          {itineraries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                No saved itineraries yet
              </p>
              <Link
                href="/quotes"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
              >
                Go to Quotes
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quote Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates / Season
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAX
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {itineraries.map((itinerary) => {
                    const isFixedDeparture = itinerary.category === 'Fixed Departures';
                    const validFrom = itinerary.validFrom
                      ? new Date(itinerary.validFrom).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '';
                    const validTo = itinerary.validTo
                      ? new Date(itinerary.validTo).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '';
                    const startDate = new Date(itinerary.startDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const endDate = new Date(itinerary.endDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const updatedAt = new Date(itinerary.updatedAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={itinerary.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {itinerary.quoteName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            itinerary.category === 'Fixed Departures'
                              ? 'bg-purple-100 text-purple-800'
                              : itinerary.category === 'Groups'
                              ? 'bg-blue-100 text-blue-800'
                              : itinerary.category === 'B2B'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {itinerary.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isFixedDeparture && itinerary.seasonName ? (
                            <div>
                              <div className="font-semibold text-blue-800 text-sm">
                                {itinerary.seasonName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {validFrom} - {validTo}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {startDate} - {endDate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            itinerary.tourType === 'SIC'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {itinerary.tourType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {itinerary.pax}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {updatedAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/itinerary?quote=${itinerary.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md mr-2"
                          >
                            View
                          </Link>
                          <Link
                            href={`/quotes/${itinerary.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                          >
                            Quote
                          </Link>
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
