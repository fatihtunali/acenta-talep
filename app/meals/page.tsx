'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Meal {
  id: number;
  city: string;
  restaurant_name: string;
  menu_option: string;
  price: number;
}

export default function MealsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    city: '',
    restaurantName: '',
    menuOption: '',
    price: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadMeals();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredMeals(
        meals.filter(meal =>
          meal.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredMeals(meals);
    }
  }, [searchCity, meals]);

  const loadMeals = async () => {
    try {
      const response = await fetch('/api/meals');
      const data = await response.json();
      setMeals(data.meals);
      setFilteredMeals(data.meals);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMeal(null);
    setFormData({
      city: '',
      restaurantName: '',
      menuOption: '',
      price: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      city: meal.city,
      restaurantName: meal.restaurant_name,
      menuOption: meal.menu_option,
      price: meal.price.toString()
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingMeal ? `/api/meals/${editingMeal.id}` : '/api/meals';
      const method = editingMeal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          restaurantName: formData.restaurantName,
          menuOption: formData.menuOption,
          price: parseFloat(formData.price)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`✅ Meal ${editingMeal ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddModal(false);
        loadMeals();
      } else {
        setSaveMessage('❌ Failed to save meal');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving meal:', error);
      setSaveMessage('❌ Error saving meal');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;

    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('✅ Meal deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadMeals();
      } else {
        setSaveMessage('❌ Failed to delete meal');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      setSaveMessage('❌ Error deleting meal');
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meals & Restaurants Database</h1>
              <p className="text-gray-600 mt-1">Manage restaurant and meal pricing by menu options</p>
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
              + Add New Meal
            </button>
          </div>
        </div>

        {/* Meals Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Restaurant Name</th>
                  <th className="px-4 py-3 text-left">Menu Option</th>
                  <th className="px-4 py-3 text-right">Price (€)</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMeals.map((meal) => (
                  <tr key={meal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{meal.city}</td>
                    <td className="px-4 py-3 text-gray-900">{meal.restaurant_name}</td>
                    <td className="px-4 py-3 text-gray-900">{meal.menu_option}</td>
                    <td className="px-4 py-3 text-right text-gray-900">€{meal.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEdit(meal)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(meal.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMeals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No meals found for this city' : 'No meals added yet. Click "Add New Meal" to get started.'}
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
                {editingMeal ? 'Edit Meal' : 'Add New Meal'}
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
                    placeholder="Istanbul"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Restaurant name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Option *
                  </label>
                  <input
                    type="text"
                    value={formData.menuOption}
                    onChange={(e) => setFormData({ ...formData, menuOption: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="e.g., Breakfast, Lunch Set Menu, Dinner à la carte"
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
                  {editingMeal ? 'Update' : 'Add'} Meal
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
