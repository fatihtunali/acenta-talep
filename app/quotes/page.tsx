'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Quote {
  id: number;
  quote_name: string;
  category: 'Fixed Departures' | 'Groups' | 'B2B' | 'B2C';
  season_name?: string;
  valid_from?: string;
  valid_to?: string;
  start_date: string;
  end_date: string;
  tour_type: 'SIC' | 'Private';
  pax: number;
  markup: number;
  tax: number;
  transport_pricing_mode: 'total' | 'vehicle';
  created_at: string;
  updated_at: string;
}

export default function QuotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchQuotes();
    }
  }, [status]);

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      const data = await response.json();
      if (response.ok) {
        setQuotes(data.quotes);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuote = async (id: number, quoteName: string) => {
    if (!confirm(`Are you sure you want to delete "${quoteName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteMessage(`✅ Quote "${quoteName}" deleted successfully`);
        setTimeout(() => setDeleteMessage(''), 3000);
        fetchQuotes(); // Refresh the list
      } else {
        setDeleteMessage('❌ Failed to delete quote');
        setTimeout(() => setDeleteMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      setDeleteMessage('❌ Error deleting quote');
      setTimeout(() => setDeleteMessage(''), 3000);
    }
  };

  const loadQuote = (id: number) => {
    router.push(`/pricing?load=${id}`);
  };

  const copyQuote = (id: number) => {
    router.push(`/pricing?copy=${id}`);
  };

  const viewQuote = (id: number) => {
    router.push(`/quotes/${id}`);
  };

  const createItinerary = (id: number) => {
    router.push(`/itinerary?quote=${id}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Filter quotes by selected category and sort by quote name
  const filteredQuotes = (selectedCategory === 'All'
    ? quotes
    : quotes.filter(q => q.category === selectedCategory)
  ).sort((a, b) => {
    // Natural sort to handle numbers correctly (01, 02, 03... before 1, 2, 3)
    return a.quote_name.localeCompare(b.quote_name, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Group quotes by category
  const categories: Array<'Fixed Departures' | 'Groups' | 'B2B' | 'B2C'> = ['Fixed Departures', 'Groups', 'B2B', 'B2C'];
  const groupedQuotes = categories.reduce((acc, cat) => {
    acc[cat] = quotes.filter(q => q.category === cat);
    return acc;
  }, {} as Record<string, Quote[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">Saved Quotes</h1>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">New Quote</a>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {deleteMessage && (
          <div className={`mb-4 px-4 py-3 rounded text-sm font-medium ${
            deleteMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {deleteMessage}
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-4 bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Filter by Category:</label>
            <div className="flex gap-2">
              {['All', 'Fixed Departures', 'Groups', 'B2B', 'B2C'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat} {cat !== 'All' && `(${groupedQuotes[cat]?.length || 0})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCategory === 'All' ? 'All Quotes' : selectedCategory} ({filteredQuotes.length})
            </h2>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 text-lg mb-4">No quotes saved yet</p>
              <a
                href="/pricing"
                className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Create New Quote
              </a>
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
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">
                      Markup
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      Tax
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Created
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y-4 divide-blue-600">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50 border-b-4 border-blue-600">
                      <td className="px-2 py-2">
                        <div className="text-xs font-medium text-gray-900 truncate">{quote.quote_name}</div>
                        {quote.category === 'Fixed Departures' && quote.season_name && (
                          <div className="text-xs font-semibold text-blue-700 mt-0.5 truncate">
                            {quote.season_name}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 inline-flex text-xs font-semibold rounded ${
                          quote.category === 'Fixed Departures'
                            ? 'bg-blue-100 text-blue-800'
                            : quote.category === 'Groups'
                            ? 'bg-green-100 text-green-800'
                            : quote.category === 'B2B'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {quote.category === 'Fixed Departures' ? 'FD' : quote.category}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {quote.category === 'Fixed Departures' && quote.season_name ? (
                          <div className="text-xs">
                            <div className="font-semibold text-blue-800 truncate">{quote.season_name}</div>
                            <div className="text-gray-600 text-xs">
                              {quote.valid_from ? new Date(quote.valid_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''} - {quote.valid_to ? new Date(quote.valid_to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-900">
                            {new Date(quote.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(quote.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 inline-flex text-xs font-semibold rounded ${
                          quote.tour_type === 'Private'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {quote.tour_type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-900">
                        {quote.pax}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-900">
                        {quote.markup}%
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-900">
                        {quote.tax}%
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-2 py-2 text-xs font-medium">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => viewQuote(quote.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View full quote details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => loadQuote(quote.id)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Load and edit this quote"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => copyQuote(quote.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Create a copy of this quote"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => createItinerary(quote.id)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Create itinerary from this quote"
                          >
                            📄
                          </button>
                          <button
                            onClick={() => deleteQuote(quote.id, quote.quote_name)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete this quote"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
