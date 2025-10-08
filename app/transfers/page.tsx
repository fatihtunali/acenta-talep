'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Transfer {
  id: number;
  cityId: number;
  city: string;
  transfer_type: string;
  price: number;
}

interface CityOption {
  id: number;
  name: string;
}

const transferTypes = [
  'Airport to Hotel',
  'Hotel to Airport',
  'Hotel to Hotel',
  'Airport to City',
  'City to Airport',
  'Hotel to Attraction',
  'Attraction to Hotel',
  'Intercity Transfer'
];

export default function TransfersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [cities, setCities] = useState<CityOption[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    city: '',
    cityId: null as number | null,
    transferType: '',
    price: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadCities();
      loadTransfers();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredTransfers(
        transfers.filter(transfer =>
          transfer.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredTransfers(transfers);
    }
  }, [searchCity, transfers]);

  const loadCities = async () => {
    try {
      const response = await fetch('/api/cities');
      const data = await response.json();
      if (response.ok) {
        setCities(data.cities);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadTransfers = async () => {
    try {
      const response = await fetch('/api/transfers');
      const data = await response.json();
      setTransfers(data.transfers);
      setFilteredTransfers(data.transfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeCityLabel = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();

  const handleCityChange = (value: string) => {
    const normalizedInput = normalizeCityLabel(value);
    const matchedCity = cities.find(
      (city) => normalizeCityLabel(city.name) === normalizedInput
    );

    setFormData((prev) => ({
      ...prev,
      city: value,
      cityId: matchedCity ? matchedCity.id : null
    }));
  };

  const handleAdd = () => {
    setEditingTransfer(null);
    setFormData({
      city: '',
      cityId: null,
      transferType: '',
      price: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      city: transfer.city,
      cityId: transfer.cityId,
      transferType: transfer.transfer_type,
      price: transfer.price.toString()
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingTransfer ? `/api/transfers/${editingTransfer.id}` : '/api/transfers';
      const method = editingTransfer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          cityId: formData.cityId,
          transferType: formData.transferType,
          price: parseFloat(formData.price)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Transfer ${editingTransfer ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddModal(false);
        loadCities();
        loadTransfers();
      } else {
        setSaveMessage('Failed to save transfer');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving transfer:', error);
      setSaveMessage('Error saving transfer');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transfer?')) return;

    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('✅ Transfer deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadTransfers();
      } else {
        setSaveMessage('❌ Failed to delete transfer');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      setSaveMessage('❌ Error deleting transfer');
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
              <h1 className="text-3xl font-bold text-gray-900">Transfers Database</h1>
              <p className="text-gray-600 mt-1">Manage transportation and transfer pricing</p>
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
              + Add New Transfer
            </button>
          </div>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Transfer Type</th>
                  <th className="px-4 py-3 text-right">Price (€)</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{transfer.city}</td>
                    <td className="px-4 py-3 text-gray-900">{transfer.transfer_type}</td>
                    <td className="px-4 py-3 text-right text-gray-900">€{transfer.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEdit(transfer)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(transfer.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No transfers found for this city' : 'No transfers added yet. Click "Add New Transfer" to get started.'}
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
                {editingTransfer ? 'Edit Transfer' : 'Add New Transfer'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    list="transfer-city-options"
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    onBlur={(e) => handleCityChange(e.target.value.trim().replace(/\s+/g, ' '))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Istanbul"
                  />
                  <datalist id="transfer-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Type *
                  </label>
                  <select
                    value={formData.transferType}
                    onChange={(e) => setFormData({ ...formData, transferType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  >
                    <option value="">Select transfer type...</option>
                    {transferTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
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
                  {editingTransfer ? 'Update' : 'Add'} Transfer
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
