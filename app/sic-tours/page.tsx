'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Pricing {
  id: number;
  start_date: string;
  end_date: string;
  pp_dbl_rate: number;
  single_supplement: number | null;
  child_0to2: number | null;
  child_3to5: number | null;
  child_6to11: number | null;
}

interface SicTour {
  id: number;
  city: string;
  tour_name: string;
  pricing: Pricing[];
}

export default function SicToursPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sicTours, setSicTours] = useState<SicTour[]>([]);
  const [filteredSicTours, setFilteredSicTours] = useState<SicTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddTourModal, setShowAddTourModal] = useState(false);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [editingTour, setEditingTour] = useState<SicTour | null>(null);
  const [editingPricing, setEditingPricing] = useState<Pricing | null>(null);
  const [selectedTourForPricing, setSelectedTourForPricing] = useState<SicTour | null>(null);
  const [expandedTourId, setExpandedTourId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [tourFormData, setTourFormData] = useState({
    city: '',
    tourName: ''
  });

  const [pricingFormData, setPricingFormData] = useState({
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

  const handleAddTour = () => {
    setEditingTour(null);
    setTourFormData({
      city: '',
      tourName: ''
    });
    setShowAddTourModal(true);
  };

  const handleEditTour = (tour: SicTour) => {
    setEditingTour(tour);
    setTourFormData({
      city: tour.city,
      tourName: tour.tour_name
    });
    setShowAddTourModal(true);
  };

  const handleSaveTour = async () => {
    try {
      const url = editingTour ? `/api/sic-tours/${editingTour.id}` : '/api/sic-tours';
      const method = editingTour ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: tourFormData.city,
          tourName: tourFormData.tourName
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Tour ${editingTour ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddTourModal(false);
        loadSicTours();
      } else {
        setSaveMessage('Failed to save tour');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      setSaveMessage('Error saving tour');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteTour = async (tourId: number) => {
    if (!confirm('Are you sure you want to delete this tour? This will also delete all associated pricing periods.')) return;

    try {
      const response = await fetch(`/api/sic-tours/${tourId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Tour deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadSicTours();
      } else {
        setSaveMessage('Failed to delete tour');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      setSaveMessage('Error deleting tour');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleAddPricing = (tour: SicTour) => {
    setSelectedTourForPricing(tour);
    setEditingPricing(null);
    setPricingFormData({
      startDate: '',
      endDate: '',
      ppDblRate: '',
      singleSupplement: '',
      child0to2: '',
      child3to5: '',
      child6to11: ''
    });
    setShowAddPricingModal(true);
  };

  const handleEditPricing = (tour: SicTour, pricing: Pricing) => {
    setSelectedTourForPricing(tour);
    setEditingPricing(pricing);
    setPricingFormData({
      startDate: pricing.start_date,
      endDate: pricing.end_date,
      ppDblRate: pricing.pp_dbl_rate.toString(),
      singleSupplement: pricing.single_supplement?.toString() || '',
      child0to2: pricing.child_0to2?.toString() || '',
      child3to5: pricing.child_3to5?.toString() || '',
      child6to11: pricing.child_6to11?.toString() || ''
    });
    setShowAddPricingModal(true);
  };

  const handleSavePricing = async () => {
    if (!selectedTourForPricing) return;

    try {
      const url = editingPricing
        ? `/api/sic-tours/${selectedTourForPricing.id}/pricing/${editingPricing.id}`
        : `/api/sic-tours/${selectedTourForPricing.id}/pricing`;
      const method = editingPricing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: pricingFormData.startDate,
          endDate: pricingFormData.endDate,
          ppDblRate: parseFloat(pricingFormData.ppDblRate),
          singleSupplement: pricingFormData.singleSupplement ? parseFloat(pricingFormData.singleSupplement) : null,
          child0to2: pricingFormData.child0to2 ? parseFloat(pricingFormData.child0to2) : null,
          child3to5: pricingFormData.child3to5 ? parseFloat(pricingFormData.child3to5) : null,
          child6to11: pricingFormData.child6to11 ? parseFloat(pricingFormData.child6to11) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Pricing ${editingPricing ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddPricingModal(false);
        loadSicTours();
      } else {
        setSaveMessage('Failed to save pricing');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      setSaveMessage('Error saving pricing');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeletePricing = async (tourId: number, pricingId: number) => {
    if (!confirm('Are you sure you want to delete this pricing period?')) return;

    try {
      const response = await fetch(`/api/sic-tours/${tourId}/pricing/${pricingId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Pricing deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadSicTours();
      } else {
        setSaveMessage('Failed to delete pricing');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting pricing:', error);
      setSaveMessage('Error deleting pricing');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  const toggleExpandTour = (tourId: number) => {
    setExpandedTourId(expandedTourId === tourId ? null : tourId);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SIC Tours Database</h1>
              <p className="text-gray-600 mt-1">Manage your shared in-coach tour listings and pricing periods</p>
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
            <button
              onClick={handleAddTour}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add New Tour
            </button>
          </div>
        </div>

        {/* Tours Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Tour Name</th>
                  <th className="px-4 py-3 text-center">Pricing Periods</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSicTours.map((tour) => (
                  <>
                    <tr key={tour.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpandTour(tour.id)}
                          className="text-purple-600 hover:text-purple-800 font-bold text-lg"
                        >
                          {expandedTourId === tour.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{tour.city}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{tour.tour_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {tour.pricing.length} period{tour.pricing.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAddPricing(tour)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                        >
                          Add Pricing
                        </button>
                        <button
                          onClick={() => handleEditTour(tour)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTour(tour.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedTourId === tour.id && (
                      <tr key={`${tour.id}-pricing`}>
                        <td colSpan={5} className="px-4 py-4 bg-gray-50">
                          <div className="pl-12">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Periods</h3>
                            {tour.pricing.length === 0 ? (
                              <p className="text-gray-500 italic">No pricing periods defined yet. Click &quot;Add Pricing&quot; to add one.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200 rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Start Date</th>
                                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">End Date</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">PP DBL</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">Single Suppl.</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">Child 0-2</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">Child 3-5</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">Child 6-11</th>
                                      <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {tour.pricing.map((pricing) => (
                                      <tr key={pricing.id} className="bg-white hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm text-gray-900">{formatDate(pricing.start_date)}</td>
                                        <td className="px-3 py-2 text-sm text-gray-900">{formatDate(pricing.end_date)}</td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">€{pricing.pp_dbl_rate.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                                          {pricing.single_supplement ? `€${pricing.single_supplement.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                                          {pricing.child_0to2 ? `€${pricing.child_0to2.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                                          {pricing.child_3to5 ? `€${pricing.child_3to5.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                                          {pricing.child_6to11 ? `€${pricing.child_6to11.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => handleEditPricing(tour, pricing)}
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeletePricing(tour.id, pricing.id)}
                                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filteredSicTours.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No tours found for this city' : 'No tours added yet. Click "Add New Tour" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Tour Modal */}
        {showAddTourModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingTour ? 'Edit Tour' : 'Add New Tour'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={tourFormData.city}
                      onChange={(e) => setTourFormData({ ...tourFormData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                      placeholder="Istanbul"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tour Name *
                    </label>
                    <input
                      type="text"
                      value={tourFormData.tourName}
                      onChange={(e) => setTourFormData({ ...tourFormData, tourName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                      placeholder="Tour Name"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveTour}
                  className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  {editingTour ? 'Update Tour' : 'Add Tour'}
                </button>
                <button
                  onClick={() => setShowAddTourModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Pricing Modal */}
        {showAddPricingModal && selectedTourForPricing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {editingPricing ? 'Edit Pricing Period' : 'Add Pricing Period'}
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedTourForPricing.tour_name} - {selectedTourForPricing.city}
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={pricingFormData.startDate}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={pricingFormData.endDate}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                      value={pricingFormData.ppDblRate}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, ppDblRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                      value={pricingFormData.singleSupplement}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, singleSupplement: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                      value={pricingFormData.child0to2}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child0to2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                      value={pricingFormData.child3to5}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child3to5: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                      value={pricingFormData.child6to11}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child6to11: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSavePricing}
                  className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  {editingPricing ? 'Update Pricing' : 'Add Pricing'}
                </button>
                <button
                  onClick={() => setShowAddPricingModal(false)}
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
