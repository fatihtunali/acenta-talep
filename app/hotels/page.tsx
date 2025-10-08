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

interface Hotel {
  id: number;
  city: string;
  hotel_name: string;
  category: string;
  pricing: Pricing[];
}

export default function HotelsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingPricing, setEditingPricing] = useState<Pricing | null>(null);
  const [selectedHotelForPricing, setSelectedHotelForPricing] = useState<Hotel | null>(null);
  const [expandedHotelId, setExpandedHotelId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [hotelFormData, setHotelFormData] = useState({
    city: '',
    hotelName: '',
    category: ''
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
      loadHotels();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredHotels(
        hotels.filter(hotel =>
          hotel.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredHotels(hotels);
    }
  }, [searchCity, hotels]);

  const loadHotels = async () => {
    try {
      const response = await fetch('/api/hotels');
      const data = await response.json();
      setHotels(data.hotels);
      setFilteredHotels(data.hotels);
    } catch (error) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHotel = () => {
    setEditingHotel(null);
    setHotelFormData({
      city: '',
      hotelName: '',
      category: ''
    });
    setShowAddHotelModal(true);
  };

  const handleEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setHotelFormData({
      city: hotel.city,
      hotelName: hotel.hotel_name,
      category: hotel.category
    });
    setShowAddHotelModal(true);
  };

  const handleSaveHotel = async () => {
    try {
      const url = editingHotel ? `/api/hotels/${editingHotel.id}` : '/api/hotels';
      const method = editingHotel ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: hotelFormData.city,
          hotelName: hotelFormData.hotelName,
          category: hotelFormData.category
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Hotel ${editingHotel ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddHotelModal(false);
        loadHotels();
      } else {
        setSaveMessage('Failed to save hotel');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving hotel:', error);
      setSaveMessage('Error saving hotel');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteHotel = async (hotelId: number) => {
    if (!confirm('Are you sure you want to delete this hotel? This will also delete all associated pricing periods.')) return;

    try {
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Hotel deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadHotels();
      } else {
        setSaveMessage('Failed to delete hotel');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting hotel:', error);
      setSaveMessage('Error deleting hotel');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleAddPricing = (hotel: Hotel) => {
    setSelectedHotelForPricing(hotel);
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

  const handleEditPricing = (hotel: Hotel, pricing: Pricing) => {
    setSelectedHotelForPricing(hotel);
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
    if (!selectedHotelForPricing) return;

    try {
      const url = editingPricing
        ? `/api/hotels/${selectedHotelForPricing.id}/pricing/${editingPricing.id}`
        : `/api/hotels/${selectedHotelForPricing.id}/pricing`;
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
        loadHotels();
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

  const handleDeletePricing = async (hotelId: number, pricingId: number) => {
    if (!confirm('Are you sure you want to delete this pricing period?')) return;

    try {
      const response = await fetch(`/api/hotels/${hotelId}/pricing/${pricingId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Pricing deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadHotels();
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

  const toggleExpandHotel = (hotelId: number) => {
    setExpandedHotelId(expandedHotelId === hotelId ? null : hotelId);
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
              <h1 className="text-3xl font-bold text-gray-900">Hotel Database</h1>
              <p className="text-gray-600 mt-1">Manage your hotel listings and pricing periods</p>
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
              onClick={handleAddHotel}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add New Hotel
            </button>
          </div>
        </div>

        {/* Hotels Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Hotel Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-center">Pricing Periods</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHotels.map((hotel) => (
                  <>
                    <tr key={hotel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpandHotel(hotel.id)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-lg"
                        >
                          {expandedHotelId === hotel.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{hotel.city}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{hotel.hotel_name}</td>
                      <td className="px-4 py-3 text-gray-900">{hotel.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {hotel.pricing.length} period{hotel.pricing.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAddPricing(hotel)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                        >
                          Add Pricing
                        </button>
                        <button
                          onClick={() => handleEditHotel(hotel)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteHotel(hotel.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedHotelId === hotel.id && (
                      <tr key={`${hotel.id}-pricing`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="pl-12">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Periods</h3>
                            {hotel.pricing.length === 0 ? (
                              <p className="text-gray-500 italic">No pricing periods defined yet. Click "Add Pricing" to add one.</p>
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
                                    {hotel.pricing.map((pricing) => (
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
                                            onClick={() => handleEditPricing(hotel, pricing)}
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeletePricing(hotel.id, pricing.id)}
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
                {filteredHotels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No hotels found for this city' : 'No hotels added yet. Click "Add New Hotel" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Hotel Modal */}
        {showAddHotelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={hotelFormData.city}
                      onChange={(e) => setHotelFormData({ ...hotelFormData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="Istanbul"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={hotelFormData.category}
                      onChange={(e) => setHotelFormData({ ...hotelFormData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="5 Star, Boutique, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotel Name *
                  </label>
                  <input
                    type="text"
                    value={hotelFormData.hotelName}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Hotel Name"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveHotel}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingHotel ? 'Update Hotel' : 'Add Hotel'}
                </button>
                <button
                  onClick={() => setShowAddHotelModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Pricing Modal */}
        {showAddPricingModal && selectedHotelForPricing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {editingPricing ? 'Edit Pricing Period' : 'Add Pricing Period'}
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedHotelForPricing.hotel_name} - {selectedHotelForPricing.city}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                      value={pricingFormData.ppDblRate}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, ppDblRate: e.target.value })}
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
                      value={pricingFormData.singleSupplement}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, singleSupplement: e.target.value })}
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
                      value={pricingFormData.child0to2}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child0to2: e.target.value })}
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
                      value={pricingFormData.child3to5}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child3to5: e.target.value })}
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
                      value={pricingFormData.child6to11}
                      onChange={(e) => setPricingFormData({ ...pricingFormData, child6to11: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSavePricing}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
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
