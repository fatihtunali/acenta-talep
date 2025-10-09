'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Quote {
  id: number;
  quote_name: string;
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

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Quotes ({quotes.length})</h2>
          </div>

          {quotes.length === 0 ? (
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
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quote Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tour Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAX
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Markup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{quote.quote_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(quote.start_date).toLocaleDateString()} - {new Date(quote.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          quote.tour_type === 'Private'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {quote.tour_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quote.pax}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quote.markup}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quote.tax}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => viewQuote(quote.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View full quote details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => loadQuote(quote.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Load and edit this quote"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => copyQuote(quote.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Create a copy of this quote"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => createItinerary(quote.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Create itinerary from this quote"
                        >
                          Itinerary
                        </button>
                        <button
                          onClick={() => deleteQuote(quote.id, quote.quote_name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete this quote"
                        >
                          Delete
                        </button>
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
