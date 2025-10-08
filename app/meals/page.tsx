'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface MenuItem {
  id: number;
  menu_option: string;
  price: number;
  start_date: string | null;
  end_date: string | null;
}

interface Restaurant {
  id: number;
  cityId: number;
  city: string;
  restaurant_name: string;
  menu: MenuItem[];
}

interface CityOption {
  id: number;
  name: string;
}

export default function MealsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [cities, setCities] = useState<CityOption[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [selectedRestaurantForMenu, setSelectedRestaurantForMenu] = useState<Restaurant | null>(null);
  const [expandedRestaurantId, setExpandedRestaurantId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [restaurantFormData, setRestaurantFormData] = useState({
    city: '',
    cityId: null as number | null,
    restaurantName: ''
  });

  const [menuItemFormData, setMenuItemFormData] = useState({
    menuOption: '',
    price: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadCities();
      loadRestaurants();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchCity) {
      setFilteredRestaurants(
        restaurants.filter(restaurant =>
          restaurant.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    } else {
      setFilteredRestaurants(restaurants);
    }
  }, [searchCity, restaurants]);

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

  const loadRestaurants = async () => {
    try {
      const response = await fetch('/api/meals');
      const data = await response.json();
      setRestaurants(data.restaurants);
      setFilteredRestaurants(data.restaurants);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeCityLabel = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();

  const handleRestaurantCityChange = (value: string) => {
    const normalizedInput = normalizeCityLabel(value);
    const matchedCity = cities.find(
      (city) => normalizeCityLabel(city.name) === normalizedInput
    );

    setRestaurantFormData((prev) => ({
      ...prev,
      city: value,
      cityId: matchedCity ? matchedCity.id : null
    }));
  };

  const handleAddRestaurant = () => {
    setEditingRestaurant(null);
    setRestaurantFormData({
      city: '',
      cityId: null,
      restaurantName: ''
    });
    setShowAddRestaurantModal(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setRestaurantFormData({
      city: restaurant.city,
      cityId: restaurant.cityId,
      restaurantName: restaurant.restaurant_name
    });
    setShowAddRestaurantModal(true);
  };

  const handleSaveRestaurant = async () => {
    try {
      const url = editingRestaurant ? `/api/meals/${editingRestaurant.id}` : '/api/meals';
      const method = editingRestaurant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: restaurantFormData.city,
          cityId: restaurantFormData.cityId,
          restaurantName: restaurantFormData.restaurantName
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Restaurant ${editingRestaurant ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddRestaurantModal(false);
        loadCities();
        loadRestaurants();
      } else {
        setSaveMessage('Failed to save restaurant');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setSaveMessage('Error saving restaurant');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: number) => {
    if (!confirm('Are you sure you want to delete this restaurant? This will also delete all associated menu items.')) return;

    try {
      const response = await fetch(`/api/meals/${restaurantId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Restaurant deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadRestaurants();
      } else {
        setSaveMessage('Failed to delete restaurant');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setSaveMessage('Error deleting restaurant');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleAddMenuItem = (restaurant: Restaurant) => {
    setSelectedRestaurantForMenu(restaurant);
    setEditingMenuItem(null);
    setMenuItemFormData({
      menuOption: '',
      price: '',
      startDate: '',
      endDate: ''
    });
    setShowAddMenuItemModal(true);
  };

  const handleEditMenuItem = (restaurant: Restaurant, menuItem: MenuItem) => {
    setSelectedRestaurantForMenu(restaurant);
    setEditingMenuItem(menuItem);
    setMenuItemFormData({
      menuOption: menuItem.menu_option,
      price: menuItem.price.toString(),
      startDate: menuItem.start_date || '',
      endDate: menuItem.end_date || ''
    });
    setShowAddMenuItemModal(true);
  };

  const handleSaveMenuItem = async () => {
    if (!selectedRestaurantForMenu) return;

    try {
      const url = editingMenuItem
        ? `/api/meals/${selectedRestaurantForMenu.id}/menu/${editingMenuItem.id}`
        : `/api/meals/${selectedRestaurantForMenu.id}/menu`;
      const method = editingMenuItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuOption: menuItemFormData.menuOption,
          price: parseFloat(menuItemFormData.price),
          startDate: menuItemFormData.startDate || null,
          endDate: menuItemFormData.endDate || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage(`Menu item ${editingMenuItem ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSaveMessage(''), 3000);
        setShowAddMenuItemModal(false);
        loadRestaurants();
      } else {
        setSaveMessage('Failed to save menu item');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSaveMessage('Error saving menu item');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteMenuItem = async (restaurantId: number, menuItemId: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const response = await fetch(`/api/meals/${restaurantId}/menu/${menuItemId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Menu item deleted successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        loadRestaurants();
      } else {
        setSaveMessage('Failed to delete menu item');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setSaveMessage('Error deleting menu item');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  const toggleExpandRestaurant = (restaurantId: number) => {
    setExpandedRestaurantId(expandedRestaurantId === restaurantId ? null : restaurantId);
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
              <p className="text-gray-600 mt-1">Manage your restaurant listings and menu pricing</p>
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
              onClick={handleAddRestaurant}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add New Restaurant
            </button>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Restaurant Name</th>
                  <th className="px-4 py-3 text-center">Menu Items</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRestaurants.map((restaurant) => (
                  <>
                    <tr key={restaurant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpandRestaurant(restaurant.id)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-lg"
                        >
                          {expandedRestaurantId === restaurant.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{restaurant.city}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{restaurant.restaurant_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {restaurant.menu.length} item{restaurant.menu.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAddMenuItem(restaurant)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                        >
                          Add Menu Item
                        </button>
                        <button
                          onClick={() => handleEditRestaurant(restaurant)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(restaurant.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedRestaurantId === restaurant.id && (
                      <tr key={`${restaurant.id}-menu`}>
                        <td colSpan={5} className="px-4 py-4 bg-gray-50">
                          <div className="pl-12">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Menu Items</h3>
                            {restaurant.menu.length === 0 ? (
                              <p className="text-gray-500 italic">No menu items defined yet. Click &quot;Add Menu Item&quot; to add one.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200 rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Menu Option</th>
                                      <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">Price</th>
                                      <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">Start Date</th>
                                      <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">End Date</th>
                                      <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {restaurant.menu.map((menuItem) => (
                                      <tr key={menuItem.id} className="bg-white hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm text-gray-900">{menuItem.menu_option}</td>
                                        <td className="px-3 py-2 text-right text-sm text-gray-900">€{menuItem.price.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">{formatDate(menuItem.start_date)}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">{formatDate(menuItem.end_date)}</td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => handleEditMenuItem(restaurant, menuItem)}
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteMenuItem(restaurant.id, menuItem.id)}
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
                {filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {searchCity ? 'No restaurants found for this city' : 'No restaurants added yet. Click "Add New Restaurant" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Restaurant Modal */}
        {showAddRestaurantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    list="restaurant-city-options"
                    value={restaurantFormData.city}
                    onChange={(e) => handleRestaurantCityChange(e.target.value)}
                    onBlur={(e) => handleRestaurantCityChange(e.target.value.trim().replace(/\s+/g, ' '))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Istanbul"
                  />
                  <datalist id="restaurant-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={restaurantFormData.restaurantName}
                    onChange={(e) => setRestaurantFormData({ ...restaurantFormData, restaurantName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Restaurant Name"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveRestaurant}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingRestaurant ? 'Update Restaurant' : 'Add Restaurant'}
                </button>
                <button
                  onClick={() => setShowAddRestaurantModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Menu Item Modal */}
        {showAddMenuItemModal && selectedRestaurantForMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedRestaurantForMenu.restaurant_name} - {selectedRestaurantForMenu.city}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Option *
                  </label>
                  <input
                    type="text"
                    value={menuItemFormData.menuOption}
                    onChange={(e) => setMenuItemFormData({ ...menuItemFormData, menuOption: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="e.g., Breakfast, Lunch Set Menu, Dinner a la carte"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={menuItemFormData.price}
                    onChange={(e) => setMenuItemFormData({ ...menuItemFormData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date (optional for seasonal pricing)
                    </label>
                    <input
                      type="date"
                      value={menuItemFormData.startDate}
                      onChange={(e) => setMenuItemFormData({ ...menuItemFormData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional for seasonal pricing)
                    </label>
                    <input
                      type="date"
                      value={menuItemFormData.endDate}
                      onChange={(e) => setMenuItemFormData({ ...menuItemFormData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveMenuItem}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingMenuItem ? 'Update Menu Item' : 'Add Menu Item'}
                </button>
                <button
                  onClick={() => setShowAddMenuItemModal(false)}
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
