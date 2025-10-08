'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface SicTour {
  id: number;
  city: string;
  tour_name: string;
  start_date: string | null;
  end_date: string | null;
  pp_dbl_rate: number;
  single_supplement: number | null;
  child_0to2: number | null;
  child_3to5: number | null;
  child_6to11: number | null;
}

export default function SicToursPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sicTours, setSicTours] = useState<SicTour[]>([]);
  const [filteredSicTours, setFilteredSicTours] = useState<SicTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSicTour, setEditingSicTour] = useState<SicTour | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    city: '',
    tourName: '',
    startDate: '',
    endDate: '',
    ppDblRate: '',
    singleSupplement: '',
    child0to2: '',
    child3to5: '',
    child6to11: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadSicTours();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredSicTours(
        sicTours.filter(tour =>
          tour.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredSicTours(sicTours);
    }
  }, [searchCity, sicTours]);

  const loadSicTours = async () => {
    try {
      const response = await fetch('/api/sic-tours');
      const data = await response.json();
      setSicTours(data.sicTours);
      setFilteredSicTours(data.sicTours);
    } catch (error) {
      console.error('Error loading SIC tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSicTour = () => {
    setEditingSicTour(null);
    setFormData({
      city: '',
      tourName: '',
      startDate: '',
      endDate: '',
      ppDblRate: '',
      singleSupplement: '',
      child0to2: '',
      child3to5: '',
      child6to11: ''
    });
    setShowAddModal(true);
  };

  const handleEditSicTour = (tour: SicTour) => {
    setEditingSicTour(tour);
    setFormData({
      city: tour.city,
      tourName: tour.tour_name,
      startDate: tour.start_date || '',
      endDate: tour.end_date || '',
      ppDblRate: tour.pp_dbl_rate.toString(),
      singleSupplement: tour.single_supplement?.toString() || '',
      child0to2: tour.child_0to2?.toString() || '',
      child3to5: tour.child_3to5?.toString() || '',
      child6to11: tour.child_6to11?.toString() || ''
    });
    setShowAddModal(true);
  };

  const handleSaveSicTour = async () => {
    try {
      const url = editingSicTour ? `/api/sic-tours/${editingSicTour.id}` : '/api/sic-tours';
      const method = editingSicTour ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          tourName: formData.tourName,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          ppDblRate: parseFloat(formData.ppDblRate),
          singleSupplement: formData.singleSupplement ? parseFloat(formData.singleSupplement) : null,
          child0to2: formData.child0to2 ? parseFloat(formData.child0to2) : null,
          child3to5: formData.child3to5 ? parseFloat(formData.child3to5) : null,
          child6to11: formData.child6to11 ? parseFloat(formData.child6to11) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`SIC tour ${editingSicTour ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddModal(false);
        loadSicTours();
      } else {
        setSaveMessage('Failed to save SIC tour');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving SIC tour:', error);
      setSaveMessage('Error saving SIC tour');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteSicTour = async (tourId: number) => {
    if (!confirm('Are you sure you want to delete this SIC tour?')) return;

    try {
      const response = await fetch(`/api/sic-tours/${tourId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('SIC tour deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadSicTours();
      } else {
        setSaveMessage('Failed to delete SIC tour');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting SIC tour:', error);
      setSaveMessage('Error deleting SIC tour');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SIC Tours Database</h1>
              <p className="text-gray-600 mt-1">Manage shared in-coach tour pricing</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Pricing
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Dashboard
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
            {saveMessage}
          </div>
        )}

        {/* Search and Add */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by city..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
            />
            <button
              onClick={handleAddSicTour}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add New SIC Tour
            </button>
          </div>
        </div>

        {/* SIC Tours Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Tour Name</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-right">PP DBL</th>
                  <th className="px-4 py-3 text-right">Single Suppl.</th>
                  <th className="px-4 py-3 text-right">Child 0-2</th>
                  <th className="px-4 py-3 text-right">Child 3-5</th>
                  <th className="px-4 py-3 text-right">Child 6-11</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSicTours.map((tour) => (
                  <tr key={tour.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{tour.city}</td>
                    <td className="px-4 py-3 text-gray-900">{tour.tour_name}</td>
                    <td className="px-4 py-3 text-gray-900">{formatDate(tour.start_date)}</td>
                    <td className="px-4 py-3 text-gray-900">{formatDate(tour.end_date)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">€{tour.pp_dbl_rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {tour.single_supplement ? `€${tour.single_supplement.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {tour.child_0to2 ? `€${tour.child_0to2.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {tour.child_3to5 ? `€${tour.child_3to5.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {tour.child_6to11 ? `€${tour.child_6to11.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEditSicTour(tour)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSicTour(tour.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSicTours.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No SIC tours found for this city' : 'No SIC tours added yet. Click "Add New SIC Tour" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingSicTour ? 'Edit SIC Tour' : 'Add New SIC Tour'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="Istanbul"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tour Name *
                    </label>
                    <input
                      type="text"
                      value={formData.tourName}
                      onChange={(e) => setFormData({ ...formData, tourName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="Tour Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Per Person DBL Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ppDblRate}
                      onChange={(e) => setFormData({ ...formData, ppDblRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Single Supplement
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.singleSupplement}
                      onChange={(e) => setFormData({ ...formData, singleSupplement: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child 0-2 yrs
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.child0to2}
                      onChange={(e) => setFormData({ ...formData, child0to2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child 3-5 yrs
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.child3to5}
                      onChange={(e) => setFormData({ ...formData, child3to5: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child 6-11 yrs
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.child6to11}
                      onChange={(e) => setFormData({ ...formData, child6to11: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveSicTour}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingSicTour ? 'Update SIC Tour' : 'Add SIC Tour'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
