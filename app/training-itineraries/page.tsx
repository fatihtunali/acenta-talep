'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface TrainingItinerary {
  id: number;
  title: string;
  tour_type: 'Private' | 'SIC';
  days: number;
  cities: string;
  content: string;
  created_at: string;
}

export default function TrainingItinerariesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [itineraries, setItineraries] = useState<TrainingItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [tourType, setTourType] = useState<'Private' | 'SIC'>('Private');
  const [days, setDays] = useState(7);
  const [cities, setCities] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadItineraries();
    }
  }, [session]);

  const loadItineraries = async () => {
    try {
      const response = await fetch('/api/training-itineraries');
      if (response.ok) {
        const data = await response.json();
        setItineraries(data);
      }
    } catch (error) {
      console.error('Error loading training itineraries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/training-itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          tour_type: tourType,
          days,
          cities,
          content
        })
      });

      if (response.ok) {
        setMessage('Training itinerary added successfully!');
        setTitle('');
        setTourType('Private');
        setDays(7);
        setCities('');
        setContent('');
        setShowForm(false);
        loadItineraries();
      } else {
        setMessage('Failed to add training itinerary');
      }
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Error saving training itinerary');
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Training Itineraries
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Training Itineraries</h2>
            <p className="text-gray-600 mt-1">
              Upload your ready-made itineraries for Funny AI to learn from
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md"
          >
            {showForm ? 'Cancel' : '+ Add Training Itinerary'}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Training Itinerary</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Highlights of Turkey: Istanbul to Cappadocia"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tour Type
                  </label>
                  <select
                    value={tourType}
                    onChange={(e) => setTourType(e.target.value as 'Private' | 'SIC')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Private">Private</option>
                    <option value="SIC">SIC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={cities}
                    onChange={(e) => setCities(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Istanbul, Cappadocia"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Itinerary Content (paste full itinerary text)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  rows={15}
                  placeholder="Day 1 - Istanbul&#10;Upon arrival at Istanbul Airport...&#10;&#10;Day 2 - Istanbul&#10;After breakfast..."
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Training Itinerary'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Uploaded Itineraries ({itineraries.length})</h3>
          </div>

          {itineraries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No training itineraries uploaded yet. Click &quot;+ Add Training Itinerary&quot; to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {itineraries.map((itinerary) => (
                <div key={itinerary.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{itinerary.title}</h4>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {itinerary.tour_type}
                        </span>
                        <span>{itinerary.days} days</span>
                        {itinerary.cities && <span>{itinerary.cities}</span>}
                        <span>Added {new Date(itinerary.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {itinerary.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
