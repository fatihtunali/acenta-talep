'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Sightseeing {
  id: number;
  city: string;
  place_name: string;
  price: number;
}

export default function SightseeingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sightseeing, setSightseeing] = useState<Sightseeing[]>([]);
  const [filteredSightseeing, setFilteredSightseeing] = useState<Sightseeing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Sightseeing | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    city: '',
    placeName: '',
    price: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadSightseeing();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredSightseeing(
        sightseeing.filter(item =>
          item.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredSightseeing(sightseeing);
    }
  }, [searchCity, sightseeing]);

  const loadSightseeing = async () => {
    try {
      const response = await fetch('/api/sightseeing');
      const data = await response.json();
      setSightseeing(data.sightseeing);
      setFilteredSightseeing(data.sightseeing);
    } catch (error) {
      console.error('Error loading sightseeing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      city: '',
      placeName: '',
      price: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (item: Sightseeing) => {
    setEditingItem(item);
    setFormData({
      city: item.city,
      placeName: item.place_name,
      price: item.price.toString()
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingItem ? `/api/sightseeing/${editingItem.id}` : '/api/sightseeing';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          placeName: formData.placeName,
          price: parseFloat(formData.price)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`✅ Sightseeing ${editingItem ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddModal(false);
        loadSightseeing();
      } else {
        setSaveMessage('❌ Failed to save sightseeing');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving sightseeing:', error);
      setSaveMessage('❌ Error saving sightseeing');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sightseeing place?')) return;

    try {
      const response = await fetch(`/api/sightseeing/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('✅ Sightseeing deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadSightseeing();
      } else {
        setSaveMessage('❌ Failed to delete sightseeing');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting sightseeing:', error);
      setSaveMessage('❌ Error deleting sightseeing');
      setTimeout(() => setSaveMessage(''), 3000);
    }
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sightseeing & Entrance Fees</h1>
              <p className="text-gray-600 mt-1">Manage entrance fees and sightseeing places</p>
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
              onClick={handleAdd}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add New Place
            </button>
          </div>
        </div>

        {/* Sightseeing Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Place Name</th>
                  <th className="px-4 py-3 text-right">Price (€)</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSightseeing.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{item.city}</td>
                    <td className="px-4 py-3 text-gray-900">{item.place_name}</td>
                    <td className="px-4 py-3 text-right text-gray-900">€{item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSightseeing.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No sightseeing places found for this city' : 'No sightseeing places added yet. Click "Add New Place" to get started.'}
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
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Edit Sightseeing Place' : 'Add New Sightseeing Place'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Cappadocia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place Name *
                  </label>
                  <input
                    type="text"
                    value={formData.placeName}
                    onChange={(e) => setFormData({ ...formData, placeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Goreme Open Air Museum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingItem ? 'Update' : 'Add'} Place
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
