'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { signOut } from 'next-auth/react';

interface ExpenseItem {
  id: string;
  location: string; // City/Location (e.g., Istanbul, Cappadocia)
  description: string; // Hotel/Restaurant name or description
  price: number; // Adult per person rate
  singleSupplement?: number; // Single supplement (mainly for hotels)
  child0to2?: number; // Child 0-2.99 years rate
  child3to5?: number; // Child 3-5.99 years rate
  child6to11?: number; // Child 6-11.99 years rate
  vehicleCount?: number; // For vehicle-based pricing
  pricePerVehicle?: number; // Price per vehicle
}

interface DayExpenses {
  dayNumber: number;
  date: string;
  // Per Person Expenses
  hotelAccommodation: ExpenseItem[];
  meals: ExpenseItem[];
  entranceFees: ExpenseItem[];
  sicTourCost: ExpenseItem[];
  tips: ExpenseItem[];
  // General Expenses
  transportation: ExpenseItem[];
  guide: ExpenseItem[];
  guideDriverAccommodation: ExpenseItem[];
  parking: ExpenseItem[];
}

interface LoadedExpenseItem {
  location: string;
  description: string;
  price: number;
  singleSupplement?: number;
  child0to2?: number;
  child3to5?: number;
  child6to11?: number;
  vehicleCount?: number;
  pricePerVehicle?: number;
}

interface LoadedDayExpenses {
  dayNumber: number;
  date: string;
  hotelAccommodation: LoadedExpenseItem[];
  meals: LoadedExpenseItem[];
  entranceFees: LoadedExpenseItem[];
  sicTourCost: LoadedExpenseItem[];
  tips: LoadedExpenseItem[];
  transportation: LoadedExpenseItem[];
  guide: LoadedExpenseItem[];
  guideDriverAccommodation: LoadedExpenseItem[];
  parking: LoadedExpenseItem[];
}

let idCounter = 0;
const generateId = () => {
  idCounter++;
  return `item-${Date.now()}-${idCounter}`;
};

// ExpenseTable component - defined outside to prevent recreation
const ExpenseTable = ({
  title,
  items,
  dayIndex,
  category,
  isGeneral = false,
  color = 'blue',
  isTransportation = false,
  showChildRates = false,
  pax,
  transportPricingMode,
  hotels = [],
  sightseeing = [],
  sicTours = [],
  meals = [],
  transfers = [],
  onAddRow,
  onDeleteRow,
  onUpdateItem,
  onUpdateVehicleCount,
  onUpdatePricePerVehicle,
  onSelectHotel,
  onSelectSightseeing,
  onSelectSicTour,
  onSelectMeal,
  onSelectTransfer
}: {
  title: string;
  items: ExpenseItem[];
  dayIndex: number;
  category: keyof DayExpenses;
  isGeneral?: boolean;
  color?: string;
  isTransportation?: boolean;
  showChildRates?: boolean;
  pax: number;
  transportPricingMode: 'total' | 'vehicle';
  hotels?: Array<{
    id: string; // Composite ID: hotelId-pricingId
    hotel_id: number;
    pricing_id: number;
    city: string;
    hotel_name: string;
    category: string;
    start_date: string | null;
    end_date: string | null;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }>;
  sightseeing?: Array<{
    id: number;
    city: string;
    place_name: string;
    price: number;
  }>;
  sicTours?: Array<{
    id: string;
    tour_id: number;
    pricing_id: number;
    city: string;
    tour_name: string;
    start_date: string | null;
    end_date: string | null;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }>;
  meals?: Array<{
    id: string;
    restaurant_id: number;
    menu_id: number;
    city: string;
    restaurant_name: string;
    menu_option: string;
    price: number;
    start_date: string | null;
    end_date: string | null;
  }>;
  transfers?: Array<{
    id: number;
    city: string;
    transfer_type: string;
    price: number;
  }>;
  onAddRow: (dayIndex: number, category: keyof DayExpenses) => void;
  onDeleteRow: (dayIndex: number, category: keyof DayExpenses, itemId: string) => void;
  onUpdateItem: (dayIndex: number, category: keyof DayExpenses, itemId: string, field: 'location' | 'description' | 'price' | 'singleSupplement' | 'child0to2' | 'child3to5' | 'child6to11', value: string | number) => void;
  onUpdateVehicleCount: (dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => void;
  onUpdatePricePerVehicle: (dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => void;
  onSelectHotel?: (dayIndex: number, category: keyof DayExpenses, itemId: string, hotel: {
    city: string;
    hotel_name: string;
    category: string;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }) => void;
  onSelectSightseeing?: (dayIndex: number, category: keyof DayExpenses, itemId: string, place: {
    city: string;
    place_name: string;
    price: number;
  }) => void;
  onSelectSicTour?: (dayIndex: number, category: keyof DayExpenses, itemId: string, tour: {
    city: string;
    tour_name: string;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }) => void;
  onSelectMeal?: (dayIndex: number, category: keyof DayExpenses, itemId: string, meal: {
    city: string;
    restaurant_name: string;
    menu_option: string;
    price: number;
  }) => void;
  onSelectTransfer?: (dayIndex: number, category: keyof DayExpenses, itemId: string, transfer: {
    city: string;
    transfer_type: string;
    price: number;
  }) => void;
}) => {
  const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
  const [filteredHotels, setFilteredHotels] = useState<typeof hotels>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [filteredSightseeing, setFilteredSightseeing] = useState<typeof sightseeing>([]);
  const [filteredSicTours, setFilteredSicTours] = useState<typeof sicTours>([]);
  const [filteredMeals, setFilteredMeals] = useState<typeof meals>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<typeof transfers>([]);
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-500',
    red: 'bg-red-50 text-red-700 ring-red-500',
    green: 'bg-green-50 text-green-700 ring-green-500',
    orange: 'bg-orange-50 text-orange-700 ring-orange-500',
    purple: 'bg-purple-50 text-purple-700 ring-purple-500'
  }[color];

  const isVehicleMode = isTransportation && transportPricingMode === 'vehicle';

  // Get unique cities from all sources
  const hotelCities = Array.from(new Set(hotels.map(h => h.city)));
  const sightseeingCities = Array.from(new Set(sightseeing.map(s => s.city)));
  const sicTourCities = Array.from(new Set(sicTours.map(t => t.city)));
  const mealCities = Array.from(new Set(meals.map(m => m.city)));
  const transferCities = Array.from(new Set(transfers.map(t => t.city)));
  const allCities = Array.from(new Set([...hotelCities, ...sightseeingCities, ...sicTourCities, ...mealCities, ...transferCities])).sort();

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className={`text-xs font-bold ${colorClasses}`}>{title}</h4>
        <button
          onClick={() => onAddRow(dayIndex, category)}
          className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
        >
          +
        </button>
      </div>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {items.map((item) => {
            const calculatedPrice = isVehicleMode
              ? (item.vehicleCount || 0) * (item.pricePerVehicle || 0)
              : item.price || 0;

            const isHotelCategory = category === 'hotelAccommodation';
            const isEntranceFeesCategory = category === 'entranceFees';
            const isMealsCategory = category === 'meals';
            const isSicTourCategory = category === 'sicTourCost';
            const isTransportationCategory = category === 'transportation';
            const showCityAutocomplete = (isHotelCategory || isEntranceFeesCategory || isMealsCategory || isSicTourCategory || isTransportationCategory) && activeAutocomplete === `${item.id}-city` && filteredCities.length > 0;
            const showHotelAutocomplete = isHotelCategory && activeAutocomplete === `${item.id}-hotel` && filteredHotels.length > 0;
            const showSightseeingAutocomplete = isEntranceFeesCategory && activeAutocomplete === `${item.id}-sightseeing` && filteredSightseeing.length > 0;
            const showMealsAutocomplete = isMealsCategory && activeAutocomplete === `${item.id}-meals` && filteredMeals.length > 0;
            const showSicTourAutocomplete = isSicTourCategory && activeAutocomplete === `${item.id}-sictour` && filteredSicTours.length > 0;
            const showTransfersAutocomplete = isTransportationCategory && activeAutocomplete === `${item.id}-transfer` && filteredTransfers.length > 0;

            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-0 w-32 relative">
                  <input
                    type="text"
                    value={item.location}
                    onChange={(e) => {
                      onUpdateItem(dayIndex, category, item.id, 'location', e.target.value);
                      if ((isHotelCategory || isEntranceFeesCategory || isMealsCategory || isSicTourCategory || isTransportationCategory) && e.target.value.length > 0) {
                        // Filter cities for hotel, entrance fees, meals, SIC tours, and transportation categories
                        const citiesToFilter = isHotelCategory ? hotelCities : isEntranceFeesCategory ? sightseeingCities : isMealsCategory ? mealCities : isSicTourCategory ? sicTourCities : isTransportationCategory ? transferCities : allCities;
                        const filtered = citiesToFilter.filter(city =>
                          city.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredCities(filtered);
                        setActiveAutocomplete(`${item.id}-city`);
                      } else {
                        setFilteredCities([]);
                        setFilteredSightseeing([]);
                        setFilteredMeals([]);
                        setFilteredSicTours([]);
                        setFilteredTransfers([]);
                        setActiveAutocomplete(null);
                      }
                    }}
                    onFocus={() => {
                      if ((isHotelCategory || isEntranceFeesCategory || isMealsCategory || isSicTourCategory || isTransportationCategory) && item.location.length > 0) {
                        const citiesToFilter = isHotelCategory ? hotelCities : isEntranceFeesCategory ? sightseeingCities : isMealsCategory ? mealCities : isSicTourCategory ? sicTourCities : isTransportationCategory ? transferCities : allCities;
                        const filtered = citiesToFilter.filter(city =>
                          city.toLowerCase().includes(item.location.toLowerCase())
                        );
                        setFilteredCities(filtered);
                        setActiveAutocomplete(`${item.id}-city`);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow clicking on dropdown
                      setTimeout(() => {
                        setActiveAutocomplete(null);
                        setFilteredCities([]);
                        setFilteredHotels([]);
                        setFilteredSightseeing([]);
                        setFilteredMeals([]);
                        setFilteredSicTours([]);
                      }, 200);
                    }}
                    placeholder="City/Location"
                    className="w-full px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {showCityAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-48 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredCities.map((city, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            onUpdateItem(dayIndex, category, item.id, 'location', city);
                            setActiveAutocomplete(null);
                            setFilteredCities([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{city}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 p-0 relative">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      onUpdateItem(dayIndex, category, item.id, 'description', e.target.value);
                      if (isHotelCategory && item.location && e.target.value.length > 0) {
                        // Filter hotels by selected city and typed text
                        const filtered = hotels.filter(hotel =>
                          hotel.city.trim() === item.location.trim() &&
                          hotel.hotel_name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredHotels(filtered);
                        setActiveAutocomplete(`${item.id}-hotel`);
                      } else if (isEntranceFeesCategory && item.location && e.target.value.length > 0) {
                        // Filter sightseeing by selected city and typed text
                        const filtered = sightseeing.filter(place =>
                          place.city.trim() === item.location.trim() &&
                          place.place_name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredSightseeing(filtered);
                        setActiveAutocomplete(`${item.id}-sightseeing`);
                      } else if (isMealsCategory && item.location && e.target.value.length > 0) {
                        // Filter meals/restaurants by selected city and typed text
                        const filtered = meals.filter(meal =>
                          meal.city.trim() === item.location.trim() &&
                          (meal.restaurant_name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                           meal.menu_option.toLowerCase().includes(e.target.value.toLowerCase()))
                        );
                        setFilteredMeals(filtered);
                        setActiveAutocomplete(`${item.id}-meals`);
                      } else if (isSicTourCategory && item.location && e.target.value.length > 0) {
                        // Filter SIC tours by selected city and typed text
                        const filtered = sicTours.filter(tour =>
                          tour.city.trim() === item.location.trim() &&
                          tour.tour_name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredSicTours(filtered);
                        setActiveAutocomplete(`${item.id}-sictour`);
                      } else if (isTransportationCategory && item.location && e.target.value.length > 0) {
                        // Filter transfers by selected city and typed text
                        const filtered = transfers.filter(transfer =>
                          transfer.city.trim() === item.location.trim() &&
                          transfer.transfer_type.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredTransfers(filtered);
                        setActiveAutocomplete(`${item.id}-transfer`);
                      } else {
                        setFilteredHotels([]);
                        setFilteredSightseeing([]);
                        setFilteredMeals([]);
                        setFilteredSicTours([]);
                        setFilteredTransfers([]);
                        setActiveAutocomplete(null);
                      }
                    }}
                    onFocus={() => {
                      if (isHotelCategory && item.location && item.description.length > 0) {
                        const filtered = hotels.filter(hotel =>
                          hotel.city.trim() === item.location.trim() &&
                          hotel.hotel_name.toLowerCase().includes(item.description.toLowerCase())
                        );
                        setFilteredHotels(filtered);
                        setActiveAutocomplete(`${item.id}-hotel`);
                      } else if (isEntranceFeesCategory && item.location && item.description.length > 0) {
                        const filtered = sightseeing.filter(place =>
                          place.city.trim() === item.location.trim() &&
                          place.place_name.toLowerCase().includes(item.description.toLowerCase())
                        );
                        setFilteredSightseeing(filtered);
                        setActiveAutocomplete(`${item.id}-sightseeing`);
                      } else if (isMealsCategory && item.location && item.description.length > 0) {
                        const filtered = meals.filter(meal =>
                          meal.city.trim() === item.location.trim() &&
                          (meal.restaurant_name.toLowerCase().includes(item.description.toLowerCase()) ||
                           meal.menu_option.toLowerCase().includes(item.description.toLowerCase()))
                        );
                        setFilteredMeals(filtered);
                        setActiveAutocomplete(`${item.id}-meals`);
                      } else if (isSicTourCategory && item.location && item.description.length > 0) {
                        const filtered = sicTours.filter(tour =>
                          tour.city.trim() === item.location.trim() &&
                          tour.tour_name.toLowerCase().includes(item.description.toLowerCase())
                        );
                        setFilteredSicTours(filtered);
                        setActiveAutocomplete(`${item.id}-sictour`);
                      } else if (isTransportationCategory && item.location && item.description.length > 0) {
                        const filtered = transfers.filter(transfer =>
                          transfer.city.trim() === item.location.trim() &&
                          transfer.transfer_type.toLowerCase().includes(item.description.toLowerCase())
                        );
                        setFilteredTransfers(filtered);
                        setActiveAutocomplete(`${item.id}-transfer`);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (activeAutocomplete === `${item.id}-hotel` || activeAutocomplete === `${item.id}-sightseeing` || activeAutocomplete === `${item.id}-meals` || activeAutocomplete === `${item.id}-sictour` || activeAutocomplete === `${item.id}-transfer`) {
                          setActiveAutocomplete(null);
                          setFilteredHotels([]);
                          setFilteredSightseeing([]);
                          setFilteredMeals([]);
                          setFilteredSicTours([]);
                          setFilteredTransfers([]);
                        }
                      }, 200);
                    }}
                    placeholder="Hotel/Restaurant/Activity Name"
                    className="w-full px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {showHotelAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredHotels.map((hotel) => (
                        <div
                          key={hotel.id}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            if (onSelectHotel) {
                              onSelectHotel(dayIndex, category, item.id, {
                                city: hotel.city,
                                hotel_name: hotel.hotel_name,
                                category: hotel.category,
                                pp_dbl_rate: hotel.pp_dbl_rate,
                                single_supplement: hotel.single_supplement,
                                child_0to2: hotel.child_0to2,
                                child_3to5: hotel.child_3to5,
                                child_6to11: hotel.child_6to11
                              });
                            }
                            setActiveAutocomplete(null);
                            setFilteredHotels([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{hotel.hotel_name}</div>
                          <div className="text-gray-600">
                            {hotel.category} - €{hotel.pp_dbl_rate}
                            {hotel.start_date && hotel.end_date && (
                              <span className="ml-2 text-blue-600">
                                ({hotel.start_date} to {hotel.end_date})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showSightseeingAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredSightseeing.map((place) => (
                        <div
                          key={place.id}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            if (onSelectSightseeing) {
                              onSelectSightseeing(dayIndex, category, item.id, {
                                city: place.city,
                                place_name: place.place_name,
                                price: place.price
                              });
                            }
                            setActiveAutocomplete(null);
                            setFilteredSightseeing([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{place.place_name}</div>
                          <div className="text-gray-600">
                            €{place.price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showMealsAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            if (onSelectMeal) {
                              onSelectMeal(dayIndex, category, item.id, {
                                city: meal.city,
                                restaurant_name: meal.restaurant_name,
                                menu_option: meal.menu_option,
                                price: meal.price
                              });
                            }
                            setActiveAutocomplete(null);
                            setFilteredMeals([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{meal.restaurant_name}</div>
                          <div className="text-gray-600">
                            {meal.menu_option} - €{meal.price.toFixed(2)}
                            {meal.start_date && meal.end_date && (
                              <span className="ml-2 text-blue-600">
                                ({meal.start_date} to {meal.end_date})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showSicTourAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-80 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredSicTours.map((tour) => (
                        <div
                          key={tour.id}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            if (onSelectSicTour) {
                              onSelectSicTour(dayIndex, category, item.id, {
                                city: tour.city,
                                tour_name: tour.tour_name,
                                pp_dbl_rate: tour.pp_dbl_rate,
                                single_supplement: tour.single_supplement,
                                child_0to2: tour.child_0to2,
                                child_3to5: tour.child_3to5,
                                child_6to11: tour.child_6to11
                              });
                            }
                            setActiveAutocomplete(null);
                            setFilteredSicTours([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{tour.tour_name}</div>
                          <div className="text-gray-600">
                            PP DBL: €{tour.pp_dbl_rate.toFixed(2)}
                            {tour.single_supplement && (
                              <span className="ml-2">Single: €{tour.single_supplement.toFixed(2)}</span>
                            )}
                            {tour.start_date && tour.end_date && (
                              <span className="ml-2 text-blue-600">
                                ({tour.start_date} to {tour.end_date})
                              </span>
                            )}
                          </div>
                          {(tour.child_0to2 || tour.child_3to5 || tour.child_6to11) && (
                            <div className="text-purple-600 text-[10px]">
                              {tour.child_0to2 && `0-2: €${tour.child_0to2.toFixed(2)} `}
                              {tour.child_3to5 && `3-5: €${tour.child_3to5.toFixed(2)} `}
                              {tour.child_6to11 && `6-11: €${tour.child_6to11.toFixed(2)}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showTransfersAutocomplete && (
                    <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto">
                      {filteredTransfers.map((transfer) => (
                        <div
                          key={transfer.id}
                          className="px-2 py-1 hover:bg-indigo-100 cursor-pointer text-xs"
                          onMouseDown={() => {
                            if (onSelectTransfer) {
                              onSelectTransfer(dayIndex, category, item.id, {
                                city: transfer.city,
                                transfer_type: transfer.transfer_type,
                                price: transfer.price
                              });
                            }
                            setActiveAutocomplete(null);
                            setFilteredTransfers([]);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{transfer.transfer_type}</div>
                          <div className="text-gray-600">
                            €{transfer.price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                {isVehicleMode ? (
                  <>
                    <td className="border border-gray-300 p-0 w-16">
                      <input
                        type="number"
                        min="0"
                        value={!item.vehicleCount || item.vehicleCount === 0 ? '' : item.vehicleCount}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          onUpdateVehicleCount(dayIndex, category, item.id, value);
                        }}
                        placeholder="Qty"
                        className="w-full px-1.5 py-1 text-xs text-center text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-0 w-20">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={!item.pricePerVehicle || item.pricePerVehicle === 0 ? '' : item.pricePerVehicle}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          onUpdatePricePerVehicle(dayIndex, category, item.id, value);
                        }}
                        placeholder="Price"
                        className="w-full px-1.5 py-1 text-xs text-right text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-1.5 py-1 text-right text-xs font-bold text-gray-900 bg-gray-100 w-20">
                      €{calculatedPrice.toFixed(2)}
                    </td>
                  </>
                ) : (
                  <td className="border border-gray-300 p-0 w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price === 0 ? '' : item.price}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        onUpdateItem(dayIndex, category, item.id, 'price', value);
                      }}
                      placeholder="Adult"
                      className="w-full px-1.5 py-1 text-xs text-right text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                )}
                {showChildRates && (
                  <>
                    <td className="border border-gray-300 p-0 w-20">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={!item.singleSupplement || item.singleSupplement === 0 ? '' : item.singleSupplement}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          onUpdateItem(dayIndex, category, item.id, 'singleSupplement', value);
                        }}
                        placeholder="SGL"
                        className="w-full px-1.5 py-1 text-xs text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-0 w-20">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={!item.child0to2 || item.child0to2 === 0 ? '' : item.child0to2}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          onUpdateItem(dayIndex, category, item.id, 'child0to2', value);
                        }}
                        placeholder="0-2"
                        className="w-full px-1.5 py-1 text-xs text-right text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-0 w-20">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={!item.child3to5 || item.child3to5 === 0 ? '' : item.child3to5}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          onUpdateItem(dayIndex, category, item.id, 'child3to5', value);
                        }}
                        placeholder="3-5"
                        className="w-full px-1.5 py-1 text-xs text-right text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-0 w-20">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={!item.child6to11 || item.child6to11 === 0 ? '' : item.child6to11}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          onUpdateItem(dayIndex, category, item.id, 'child6to11', value);
                        }}
                        placeholder="6-11"
                        className="w-full px-1.5 py-1 text-xs text-right text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                  </>
                )}
                {isGeneral && (
                  <td className="border border-gray-300 px-1.5 py-1 text-right text-xs font-semibold text-red-700 bg-red-50 w-20">
                    €{(calculatedPrice / pax).toFixed(2)}
                  </td>
                )}
                <td className="border border-gray-300 p-0 text-center w-8">
                  <button
                    onClick={() => onDeleteRow(dayIndex, category, item.id)}
                    disabled={items.length === 1}
                    className="text-red-600 hover:text-red-800 px-1.5 py-1 disabled:opacity-30 text-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

function PricingPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pax, setPax] = useState<number>(2);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tourType, setTourType] = useState<'SIC' | 'Private'>('Private');
  const [transportPricingMode, setTransportPricingMode] = useState<'total' | 'vehicle'>('total');
  const [markup, setMarkup] = useState<number>(0); // Markup percentage
  const [tax, setTax] = useState<number>(0); // Tax percentage
  const [days, setDays] = useState<DayExpenses[]>([]);
  const [quoteName, setQuoteName] = useState<string>(''); // Quote name/reference
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [loadedQuoteId, setLoadedQuoteId] = useState<number | null>(null); // Track loaded quote for updates
  const [showPricingTable, setShowPricingTable] = useState<boolean>(false);
  const [hotels, setHotels] = useState<Array<{
    id: string; // Composite ID: hotelId-pricingId
    hotel_id: number;
    pricing_id: number;
    city: string;
    hotel_name: string;
    category: string;
    start_date: string | null;
    end_date: string | null;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }>>([]);

  const [sightseeing, setSightseeing] = useState<Array<{
    id: number;
    city: string;
    place_name: string;
    price: number;
  }>>([]);

  const [transfers, setTransfers] = useState<Array<{
    id: number;
    city: string;
    transfer_type: string;
    price: number;
  }>>([]);

  const [sicTours, setSicTours] = useState<Array<{
    id: string; // Composite ID: tourId-pricingId
    tour_id: number;
    pricing_id: number;
    city: string;
    tour_name: string;
    start_date: string | null;
    end_date: string | null;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }>>([]);

  const [meals, setMeals] = useState<Array<{
    id: string; // Composite ID: restaurantId-menuId
    restaurant_id: number;
    menu_id: number;
    city: string;
    restaurant_name: string;
    menu_option: string;
    price: number;
    start_date: string | null;
    end_date: string | null;
  }>>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Load all data when authenticated
      loadHotels();
      loadSightseeing();
      loadTransfers();
      loadSicTours();
      loadMeals();
    }
  }, [status, router]);

  const loadHotels = async () => {
    try {
      const response = await fetch('/api/hotels');
      const data = await response.json();
      if (response.ok) {
        // Flatten the nested structure: each hotel with each pricing period becomes a separate entry
        const flattenedHotels = data.hotels.flatMap((hotel: any) =>
          hotel.pricing.map((pricing: any) => ({
            id: `${hotel.id}-${pricing.id}`, // Composite ID
            hotel_id: hotel.id,
            pricing_id: pricing.id,
            city: hotel.city,
            hotel_name: hotel.hotel_name,
            category: hotel.category,
            start_date: pricing.start_date,
            end_date: pricing.end_date,
            pp_dbl_rate: pricing.pp_dbl_rate,
            single_supplement: pricing.single_supplement,
            child_0to2: pricing.child_0to2,
            child_3to5: pricing.child_3to5,
            child_6to11: pricing.child_6to11
          }))
        );
        setHotels(flattenedHotels);
      }
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
  };

  const loadSightseeing = async () => {
    try {
      const response = await fetch('/api/sightseeing');
      const data = await response.json();
      if (response.ok) {
        setSightseeing(data.sightseeing);
      }
    } catch (error) {
      console.error('Error loading sightseeing:', error);
    }
  };

  const loadTransfers = async () => {
    try {
      const response = await fetch('/api/transfers');
      const data = await response.json();
      if (response.ok) {
        setTransfers(data.transfers);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    }
  };

  const loadSicTours = async () => {
    try {
      const response = await fetch('/api/sic-tours');
      const data = await response.json();
      if (response.ok) {
        // Flatten the nested structure: each tour with each pricing period becomes a separate entry
        const flattenedTours = data.sicTours.flatMap((tour: any) =>
          tour.pricing.map((pricing: any) => ({
            id: `${tour.id}-${pricing.id}`, // Composite ID
            tour_id: tour.id,
            pricing_id: pricing.id,
            city: tour.city,
            tour_name: tour.tour_name,
            start_date: pricing.start_date,
            end_date: pricing.end_date,
            pp_dbl_rate: pricing.pp_dbl_rate,
            single_supplement: pricing.single_supplement,
            child_0to2: pricing.child_0to2,
            child_3to5: pricing.child_3to5,
            child_6to11: pricing.child_6to11
          }))
        );
        setSicTours(flattenedTours);
      }
    } catch (error) {
      console.error('Error loading SIC tours:', error);
    }
  };

  const loadMeals = async () => {
    try {
      const response = await fetch('/api/meals');
      const data = await response.json();
      if (response.ok) {
        // Flatten the nested structure: each restaurant with each menu becomes a separate entry
        const flattenedMeals = data.restaurants.flatMap((restaurant: any) =>
          restaurant.menu.map((menuItem: any) => ({
            id: `${restaurant.id}-${menuItem.id}`, // Composite ID
            restaurant_id: restaurant.id,
            menu_id: menuItem.id,
            city: restaurant.city,
            restaurant_name: restaurant.restaurant_name,
            menu_option: menuItem.menu_option,
            price: menuItem.price,
            start_date: menuItem.start_date,
            end_date: menuItem.end_date
          }))
        );
        setMeals(flattenedMeals);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
  };

  // Load quote if ?load=<id> or ?copy=<id> parameter is present
  useEffect(() => {
    const loadId = searchParams.get('load');
    const copyId = searchParams.get('copy');
    const quoteId = loadId || copyId;

    if (quoteId && status === 'authenticated') {
      loadQuoteData(parseInt(quoteId), !!copyId);
    }
  }, [searchParams, status]);

  const loadQuoteData = async (quoteId: number, isCopy: boolean) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();

      if (response.ok) {
        setPax(data.pax);
        setStartDate(data.startDate.split('T')[0]); // Format date
        setEndDate(data.endDate.split('T')[0]); // Format date
        setTourType(data.tourType);
        setTransportPricingMode(data.transportPricingMode);
        setMarkup(data.markup);
        setTax(data.tax);

        // Load days with new IDs
        const loadedDays = (data.days as LoadedDayExpenses[]).map((day: LoadedDayExpenses) => ({
          ...day,
          hotelAccommodation: day.hotelAccommodation.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          meals: day.meals.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          entranceFees: day.entranceFees.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          sicTourCost: day.sicTourCost.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          tips: day.tips.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          transportation: day.transportation.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          guide: day.guide.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          guideDriverAccommodation: day.guideDriverAccommodation.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() })),
          parking: day.parking.map((item: LoadedExpenseItem) => ({ ...item, id: generateId() }))
        }));

        setDays(loadedDays);

        if (isCopy) {
          // For copy, add "-Copy" suffix and clear the loaded ID
          setQuoteName(data.quoteName + ' - Copy');
          setLoadedQuoteId(null);
          setSaveMessage('📋 Quote copied! Edit and save as new quote.');
          setTimeout(() => setSaveMessage(''), 3000);
        } else {
          // For edit, keep the name and ID
          setQuoteName(data.quoteName);
          setLoadedQuoteId(quoteId);
          setSaveMessage('📝 Quote loaded for editing.');
          setTimeout(() => setSaveMessage(''), 3000);
        }
      } else {
        setSaveMessage('❌ Failed to load quote');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      setSaveMessage('❌ Error loading quote');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const createEmptyDay = (dayNum: number, dateStr: string): DayExpenses => ({
    dayNumber: dayNum,
    date: dateStr,
    hotelAccommodation: [{ id: generateId(), location: '', description: '', price: 0 }],
    meals: [{ id: generateId(), location: '', description: '', price: 0 }],
    entranceFees: [{ id: generateId(), location: '', description: '', price: 0 }],
    sicTourCost: [{ id: generateId(), location: '', description: '', price: 0 }],
    tips: [{ id: generateId(), location: '', description: '', price: 0 }],
    transportation: [{ id: generateId(), location: '', description: '', price: 0 }],
    guide: [{ id: generateId(), location: '', description: '', price: 0 }],
    guideDriverAccommodation: [{ id: generateId(), location: '', description: '', price: 0 }],
    parking: [{ id: generateId(), location: '', description: '', price: 0 }]
  });

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 0 && diffDays <= 365) {
        setDays(prevDays => {
          const newDays: DayExpenses[] = [];
          for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            newDays.push(prevDays[i] || createEmptyDay(i + 1, dateStr));
          }
          return newDays;
        });
      }
    }
  }, [startDate, endDate]);

  const addRow = useCallback((dayIndex: number, category: keyof DayExpenses) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      categoryArray.push({
        id: generateId(),
        location: '',
        description: '',
        price: 0
      });
      return newDays;
    });
  }, []);

  const deleteRow = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      if (categoryArray.length > 1) {
        (newDays[dayIndex][category] as ExpenseItem[]) = categoryArray.filter(e => e.id !== itemId);
      }
      return newDays;
    });
  }, []);

  const updateItem = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, field: 'location' | 'description' | 'price' | 'singleSupplement' | 'child0to2' | 'child3to5' | 'child6to11', value: string | number) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        if (field === 'location' || field === 'description') {
          item[field] = value as string;
        } else {
          item[field] = value as number;
        }
      }
      return newDays;
    });
  }, []);

  const handleSelectHotel = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, hotel: {
    city: string;
    hotel_name: string;
    category: string;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.location = hotel.city;
        item.description = `${hotel.hotel_name} (${hotel.category})`;
        item.price = hotel.pp_dbl_rate;
        item.singleSupplement = hotel.single_supplement || undefined;
        item.child0to2 = hotel.child_0to2 || undefined;
        item.child3to5 = hotel.child_3to5 || undefined;
        item.child6to11 = hotel.child_6to11 || undefined;
      }
      return newDays;
    });
  }, []);

  const handleSelectSightseeing = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, place: {
    city: string;
    place_name: string;
    price: number;
  }) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.location = place.city;
        item.description = place.place_name;
        item.price = place.price;
      }
      return newDays;
    });
  }, []);

  const handleSelectMeal = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, meal: {
    city: string;
    restaurant_name: string;
    menu_option: string;
    price: number;
  }) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.location = meal.city;
        item.description = `${meal.restaurant_name} - ${meal.menu_option}`;
        item.price = meal.price;
      }
      return newDays;
    });
  }, []);

  const handleSelectSicTour = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, tour: {
    city: string;
    tour_name: string;
    pp_dbl_rate: number;
    single_supplement: number | null;
    child_0to2: number | null;
    child_3to5: number | null;
    child_6to11: number | null;
  }) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.location = tour.city;
        item.description = tour.tour_name;
        item.price = tour.pp_dbl_rate;
        item.singleSupplement = tour.single_supplement || 0;
        item.child0to2 = tour.child_0to2 || 0;
        item.child3to5 = tour.child_3to5 || 0;
        item.child6to11 = tour.child_6to11 || 0;
      }
      return newDays;
    });
  }, []);

  const handleSelectTransfer = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, transfer: {
    city: string;
    transfer_type: string;
    price: number;
  }) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.location = transfer.city;
        item.description = transfer.transfer_type;
        item.price = transfer.price;
        // Also set vehicle pricing fields for vehicle mode
        item.pricePerVehicle = transfer.price;
        item.vehicleCount = item.vehicleCount || 1; // Default to 1 if not set
      }
      return newDays;
    });
  }, []);

  const updateVehicleCount = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.vehicleCount = value;
        item.price = (item.vehicleCount || 0) * (item.pricePerVehicle || 0);
      }
      return newDays;
    });
  }, []);

  const updatePricePerVehicle = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item.pricePerVehicle = value;
        item.price = (item.vehicleCount || 0) * (item.pricePerVehicle || 0);
      }
      return newDays;
    });
  }, []);

  const calculateDayTotals = (day: DayExpenses) => {
    const perPersonTotal =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.sicTourCost.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.tips.reduce((sum, e) => sum + (e.price || 0), 0);

    const singleSupplementTotal =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.singleSupplement || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.singleSupplement || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.singleSupplement || 0), 0);

    const child0to2Total =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.child0to2 || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.child0to2 || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.child0to2 || 0), 0);

    const child3to5Total =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.child3to5 || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.child3to5 || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.child3to5 || 0), 0);

    const child6to11Total =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.child6to11 || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.child6to11 || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.child6to11 || 0), 0);

    const generalTotal =
      day.transportation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guide.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guideDriverAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.parking.reduce((sum, e) => sum + (e.price || 0), 0);

    return { perPersonTotal, singleSupplementTotal, child0to2Total, child3to5Total, child6to11Total, generalTotal };
  };

  const saveQuote = async () => {
    console.log('Save button clicked');

    if (!quoteName.trim()) {
      setSaveMessage('Please enter a quote name');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (!startDate || !endDate) {
      setSaveMessage('Please select start and end dates');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (days.length === 0) {
      setSaveMessage('Please generate days by selecting dates');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    console.log('Validation passed, preparing to save...');
    console.log('Quote data:', { quoteName, startDate, endDate, tourType, pax, days: days.length });

    setIsSaving(true);
    setSaveMessage('');

    try {
      const isUpdate = loadedQuoteId !== null;
      const url = isUpdate ? `/api/quotes/${loadedQuoteId}` : '/api/quotes';
      const method = isUpdate ? 'PUT' : 'POST';

      console.log(`Sending ${method} request to ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteName,
          startDate,
          endDate,
          tourType,
          pax,
          markup,
          tax,
          transportPricingMode,
          days
        }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        if (isUpdate) {
          setSaveMessage('✅ Quote updated successfully!');
        } else {
          setSaveMessage('✅ Quote saved successfully!');
          setLoadedQuoteId(data.quoteId); // Set the ID for future updates
        }
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`❌ Error: ${data.error}`);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      setSaveMessage(`❌ Failed to save quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateGrandTotals = () => {
    let totalPerPerson = 0;
    let totalSingleSupplement = 0;
    let totalChild0to2 = 0;
    let totalChild3to5 = 0;
    let totalChild6to11 = 0;
    let totalGeneral = 0;

    days.forEach(day => {
      const dayTotals = calculateDayTotals(day);
      totalPerPerson += dayTotals.perPersonTotal;
      totalSingleSupplement += dayTotals.singleSupplementTotal;
      totalChild0to2 += dayTotals.child0to2Total;
      totalChild3to5 += dayTotals.child3to5Total;
      totalChild6to11 += dayTotals.child6to11Total;
      totalGeneral += dayTotals.generalTotal;
    });

    const generalPerPerson = pax > 0 ? totalGeneral / pax : 0;
    const costPerPerson = totalPerPerson + generalPerPerson;
    const subtotal = costPerPerson * pax;

    // Apply markup
    const markupAmount = subtotal * (markup / 100);
    const afterMarkup = subtotal + markupAmount;

    // Apply tax
    const taxAmount = afterMarkup * (tax / 100);
    const grandTotal = afterMarkup + taxAmount;

    const finalPerPerson = grandTotal / pax;

    return {
      totalPerPerson,
      totalSingleSupplement,
      totalChild0to2,
      totalChild3to5,
      totalChild6to11,
      totalGeneral,
      generalPerPerson,
      costPerPerson,
      subtotal,
      markupAmount,
      afterMarkup,
      taxAmount,
      grandTotal,
      finalPerPerson
    };
  };

  // Copy pricing table to clipboard
  const copyPricingTableToClipboard = () => {
    const tableData = calculatePricingTable();

    // Create tab-separated text for easy paste into Word/Excel
    let text = 'PAX\tPer Person (DBL)\tSingle Suppl.\tChild 0-2 yrs\tChild 3-5 yrs\tChild 6-11 yrs\n';

    tableData.forEach(row => {
      text += `${row.pax}\t€${row.adultPerPerson.toFixed(2)}\t€${row.singleSupplement.toFixed(2)}\t€${row.child0to2.toFixed(2)}\t€${row.child3to5.toFixed(2)}\t€${row.child6to11.toFixed(2)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setSaveMessage('✅ Pricing table copied to clipboard!');
      setTimeout(() => setSaveMessage(''), 3000);
    }).catch(() => {
      setSaveMessage('❌ Failed to copy table');
      setTimeout(() => setSaveMessage(''), 3000);
    });
  };

  // Calculate pricing for different PAX slabs
  const calculatePricingTable = () => {
    const paxSlabs = tourType === 'SIC' ? [2, 4, 6, 8] : [pax];

    let totalPerPerson = 0;
    let totalSingleSupplement = 0;
    let totalChild0to2 = 0;
    let totalChild3to5 = 0;
    let totalChild6to11 = 0;
    let totalGeneral = 0;

    days.forEach(day => {
      const dayTotals = calculateDayTotals(day);
      totalPerPerson += dayTotals.perPersonTotal;
      totalSingleSupplement += dayTotals.singleSupplementTotal;
      totalChild0to2 += dayTotals.child0to2Total;
      totalChild3to5 += dayTotals.child3to5Total;
      totalChild6to11 += dayTotals.child6to11Total;
      totalGeneral += dayTotals.generalTotal;
    });

    return paxSlabs.map(currentPax => {
      const generalPerPerson = currentPax > 0 ? totalGeneral / currentPax : 0;

      // Adult pricing
      const adultCost = totalPerPerson + generalPerPerson;
      const adultSubtotal = adultCost * currentPax;
      const adultWithMarkup = adultSubtotal * (1 + markup / 100);
      const adultFinal = adultWithMarkup * (1 + tax / 100);
      const adultPerPerson = adultFinal / currentPax;

      // Single supplement (total for trip, with markup and tax)
      const sglWithMarkup = totalSingleSupplement * (1 + markup / 100);
      const sglFinal = sglWithMarkup * (1 + tax / 100);

      // Child 0-2
      const child0to2Cost = totalChild0to2 + generalPerPerson;
      const child0to2Subtotal = child0to2Cost * currentPax;
      const child0to2WithMarkup = child0to2Subtotal * (1 + markup / 100);
      const child0to2Final = child0to2WithMarkup * (1 + tax / 100);
      const child0to2PerPerson = child0to2Final / currentPax;

      // Child 3-5
      const child3to5Cost = totalChild3to5 + generalPerPerson;
      const child3to5Subtotal = child3to5Cost * currentPax;
      const child3to5WithMarkup = child3to5Subtotal * (1 + markup / 100);
      const child3to5Final = child3to5WithMarkup * (1 + tax / 100);
      const child3to5PerPerson = child3to5Final / currentPax;

      // Child 6-11
      const child6to11Cost = totalChild6to11 + generalPerPerson;
      const child6to11Subtotal = child6to11Cost * currentPax;
      const child6to11WithMarkup = child6to11Subtotal * (1 + markup / 100);
      const child6to11Final = child6to11WithMarkup * (1 + tax / 100);
      const child6to11PerPerson = child6to11Final / currentPax;

      return {
        pax: currentPax,
        adultPerPerson: adultPerPerson,
        singleSupplement: sglFinal,
        child0to2: child0to2PerPerson,
        child3to5: child3to5PerPerson,
        child6to11: child6to11PerPerson
      };
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totals = calculateGrandTotals();
  const paxSlabs = [1, 2, 4, 6, 8, 10, 15, 20];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">Tour Pricing Calculator</h1>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/quotes" className="text-sm text-gray-600 hover:text-gray-900">Saved Quotes</a>
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

      <main className="max-w-full mx-auto px-4 py-3">
        {/* Quote Name and Save Section */}
        <div className="mb-3 bg-white shadow rounded-lg p-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quote Name / Reference (e.g., Company Code + Date)
              </label>
              <input
                type="text"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="e.g., ABC123-2025-03-15"
                className="w-full px-2 py-1.5 border-2 border-indigo-500 rounded text-gray-900 text-sm"
              />
            </div>
            <button
              onClick={saveQuote}
              disabled={isSaving}
              className={`px-6 py-1.5 font-semibold text-white rounded text-sm ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSaving ? 'Saving...' : '💾 Save Quote'}
            </button>
            {saveMessage && (
              <div className={`px-3 py-1.5 rounded text-sm font-medium ${
                saveMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Tour Details */}
        <div className="mb-3 bg-white shadow rounded-lg p-3">
          <div className="grid grid-cols-8 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border-2 border-indigo-500 rounded text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border-2 border-indigo-500 rounded text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tour Type</label>
              <select
                value={tourType}
                onChange={(e) => setTourType(e.target.value as 'SIC' | 'Private')}
                className="w-full px-2 py-1.5 border-2 border-indigo-500 rounded text-gray-900 text-sm font-semibold"
              >
                <option value="Private">Private</option>
                <option value="SIC">SIC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">PAX</label>
              <input
                type="number"
                min="1"
                value={pax}
                onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1.5 border-2 border-indigo-500 rounded text-gray-900 font-bold text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Transport Pricing</label>
              <select
                value={transportPricingMode}
                onChange={(e) => setTransportPricingMode(e.target.value as 'total' | 'vehicle')}
                className="w-full px-2 py-1.5 border-2 border-orange-500 rounded text-gray-900 text-sm font-semibold"
              >
                <option value="total">Total Cost</option>
                <option value="vehicle">Per Vehicle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Markup %</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 border-2 border-green-500 rounded text-gray-900 font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tax %</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 border-2 border-red-500 rounded text-gray-900 font-bold text-sm"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-gray-600">Days: </span>
                <span className="font-bold text-gray-900">{days.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Per Person: </span>
                <span className="font-bold text-indigo-600 text-base">€{totals.finalPerPerson.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Total: </span>
                <span className="font-bold text-gray-900 text-base">€{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Checklist Guide */}
        {tourType && (
          <div className={`mb-3 shadow rounded-lg p-3 ${tourType === 'Private' ? 'bg-orange-50 border-2 border-orange-300' : 'bg-purple-50 border-2 border-purple-300'}`}>
            <h3 className={`text-sm font-bold mb-2 ${tourType === 'Private' ? 'text-orange-900' : 'text-purple-900'}`}>
              📋 {tourType === 'Private' ? 'PRIVATE TOUR' : 'SIC TOUR'} - Required Expense Checklist (Per Day)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-blue-800 mb-1">✓ PER PERSON EXPENSES:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                  <li>🏨 Hotel Accommodation</li>
                  <li>🍽️ Meals (Breakfast, Lunch, Dinner)</li>
                  <li>🎫 Entrance Fees (All attractions)</li>
                  {tourType === 'SIC' && <li className="font-semibold text-purple-700">🚌 SIC Tour Cost</li>}
                  <li>💵 Tips</li>
                </ul>
              </div>
              <div>
                {tourType === 'Private' ? (
                  <>
                    <p className="font-semibold text-red-800 mb-1">✓ GENERAL EXPENSES (Divided by PAX):</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                      <li>🚗 Transportation (Specify: Transfer / Full Day / Half Day / Night)</li>
                      <li>👨‍🏫 Guide Fees</li>
                      <li>🅿️ Parking Fees (Sightseeing places + Airport transfers)</li>
                      <li>🛏️ Guide/Driver Accommodation (if applicable)</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-red-800 mb-1">✓ GENERAL EXPENSES (Divided by PAX):</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                      <li className="font-semibold text-red-700">🚗 Transfers (Arrival / Departure / Intercity / Between cities)</li>
                      <li className="text-gray-500">Multiple transfers per day allowed for different routes</li>
                    </ul>
                    <p className="font-semibold text-purple-800 mb-1 mt-2">ℹ️ SIC TOUR NOTES:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                      <li>SIC tours include transportation & guide in main tour cost</li>
                      <li>Entrance fees are separate per person</li>
                      <li>Transfers (airport/intercity) are separate general expenses</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Day by Day Expenses */}
        {days.map((day, dayIndex) => {
          const dayTotals = calculateDayTotals(day);
          return (
            <div key={day.dayNumber} className="mb-3 bg-white shadow rounded-lg p-3">
              <div className="mb-2 pb-2 border-b-2 border-indigo-500 flex justify-between items-center">
                <h2 className="text-base font-bold text-indigo-700">
                  Day {day.dayNumber} - {day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Set dates'}
                </h2>
                <div className="text-xs">
                  <span className="text-blue-700 font-semibold">Per Person: €{dayTotals.perPersonTotal.toFixed(2)}</span>
                  <span className="mx-2">|</span>
                  <span className="text-red-700 font-semibold">General: €{dayTotals.generalTotal.toFixed(2)} (€{(dayTotals.generalTotal / pax).toFixed(2)}/pax)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* PER PERSON EXPENSES - LEFT */}
                <div>
                  <h3 className="text-sm font-bold text-blue-700 mb-2 pb-1 border-b border-blue-300">PER PERSON EXPENSES</h3>

                  <ExpenseTable
                    title="🏨 Hotel Accommodation"
                    items={day.hotelAccommodation}
                    dayIndex={dayIndex}
                    category="hotelAccommodation"
                    color="blue"
                    showChildRates={true}
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    hotels={hotels}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                    onSelectHotel={handleSelectHotel}
                  />

                  <ExpenseTable
                    title="🍽️ Meals"
                    items={day.meals}
                    dayIndex={dayIndex}
                    category="meals"
                    showChildRates={true}
                    color="green"
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    meals={meals}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                    onSelectMeal={handleSelectMeal}
                  />

                  <ExpenseTable
                    title="🎫 Entrance Fees"
                    items={day.entranceFees}
                    dayIndex={dayIndex}
                    category="entranceFees"
                    color="orange"
                    showChildRates={true}
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    sightseeing={sightseeing}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                    onSelectSightseeing={handleSelectSightseeing}
                  />

                  {tourType === 'SIC' && (
                    <ExpenseTable
                      title="🚌 SIC Tour Cost"
                      items={day.sicTourCost}
                      dayIndex={dayIndex}
                      category="sicTourCost"
                      showChildRates={true}
                      color="purple"
                      pax={pax}
                      transportPricingMode={transportPricingMode}
                      sicTours={sicTours}
                      onAddRow={addRow}
                      onDeleteRow={deleteRow}
                      onUpdateItem={updateItem}
                      onUpdateVehicleCount={updateVehicleCount}
                      onUpdatePricePerVehicle={updatePricePerVehicle}
                      onSelectSicTour={handleSelectSicTour}
                    />
                  )}

                  <ExpenseTable
                    title="💵 Tips"
                    items={day.tips}
                    dayIndex={dayIndex}
                    category="tips"
                    color="green"
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                  />

                  <div className="mt-2 p-2 bg-blue-100 rounded">
                    <div className="text-xs font-bold text-blue-900">
                      Day {day.dayNumber} Per Person Total: €{dayTotals.perPersonTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* GENERAL EXPENSES - RIGHT */}
                <div>
                  <h3 className="text-sm font-bold text-red-700 mb-2 pb-1 border-b border-red-300">GENERAL EXPENSES (÷ {pax} PAX)</h3>

                  {/* Transportation - Shows for BOTH tour types */}
                  <ExpenseTable
                    title={tourType === 'Private'
                      ? "🚗 Transportation (Transfer/Full Day/Half Day/Night)"
                      : "🚗 Transfers (Arrival/Departure/Intercity)"}
                    items={day.transportation}
                    dayIndex={dayIndex}
                    category="transportation"
                    isGeneral={true}
                    isTransportation={true}
                    color="red"
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    transfers={transfers}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                    onSelectTransfer={handleSelectTransfer}
                  />

                  {/* Private Tour Only Expenses */}
                  {tourType === 'Private' && (
                    <>
                      <ExpenseTable
                        title="👨‍🏫 Guide"
                        items={day.guide}
                        dayIndex={dayIndex}
                        category="guide"
                        isGeneral={true}
                        color="blue"
                        pax={pax}
                        transportPricingMode={transportPricingMode}
                        onAddRow={addRow}
                        onDeleteRow={deleteRow}
                        onUpdateItem={updateItem}
                        onUpdateVehicleCount={updateVehicleCount}
                        onUpdatePricePerVehicle={updatePricePerVehicle}
                      />

                      <ExpenseTable
                        title="🅿️ Parking (Sightseeing + Airport Transfer)"
                        items={day.parking}
                        dayIndex={dayIndex}
                        category="parking"
                        isGeneral={true}
                        color="orange"
                        pax={pax}
                        transportPricingMode={transportPricingMode}
                        onAddRow={addRow}
                        onDeleteRow={deleteRow}
                        onUpdateItem={updateItem}
                        onUpdateVehicleCount={updateVehicleCount}
                        onUpdatePricePerVehicle={updatePricePerVehicle}
                      />

                      <ExpenseTable
                        title="🛏️ Guide/Driver Accommodation"
                        items={day.guideDriverAccommodation}
                        dayIndex={dayIndex}
                        category="guideDriverAccommodation"
                        isGeneral={true}
                        color="purple"
                        pax={pax}
                        transportPricingMode={transportPricingMode}
                        onAddRow={addRow}
                        onDeleteRow={deleteRow}
                        onUpdateItem={updateItem}
                        onUpdateVehicleCount={updateVehicleCount}
                        onUpdatePricePerVehicle={updatePricePerVehicle}
                      />
                    </>
                  )}

                  <div className="mt-2 p-2 bg-red-100 rounded">
                    <div className="text-xs font-bold text-red-900">
                      Day {day.dayNumber} General Total: €{dayTotals.generalTotal.toFixed(2)}
                      <span className="ml-2">= €{(dayTotals.generalTotal / pax).toFixed(2)} per person</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* COST BREAKDOWN */}
        {days.length > 0 && (
          <div className="bg-white shadow rounded-lg p-3 mb-3">
            <h2 className="text-base font-bold text-gray-900 mb-3">💰 Cost Breakdown</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per Person Expenses:</span>
                  <span className="font-semibold text-blue-700">€{totals.totalPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">General Expenses Total:</span>
                  <span className="font-semibold text-red-700">€{totals.totalGeneral.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">General Per Person ({pax} PAX):</span>
                  <span className="font-semibold text-red-700">€{totals.generalPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-700 font-semibold">Cost Per Person:</span>
                  <span className="font-bold text-gray-900">€{totals.costPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-semibold">Subtotal ({pax} PAX):</span>
                  <span className="font-bold text-gray-900">€{totals.subtotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Markup ({markup}%):</span>
                  <span className="font-semibold text-green-700">+€{totals.markupAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">After Markup:</span>
                  <span className="font-semibold text-gray-700">€{totals.afterMarkup.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({tax}%):</span>
                  <span className="font-semibold text-red-700">+€{totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t">
                  <span className="text-gray-900 font-bold">Grand Total:</span>
                  <span className="font-bold text-green-600">€{totals.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm bg-indigo-50 p-2 rounded">
                  <span className="text-indigo-700 font-semibold">Final Per Person:</span>
                  <span className="font-bold text-indigo-700">€{totals.finalPerPerson.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAX SLABS */}
        {days.length > 0 && (
          <div className="bg-white shadow rounded-lg p-3 mb-3">
            <h2 className="text-base font-bold text-gray-900 mb-3">PAX SLABS - Price Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">PAX</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">General/Person</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">Per Person Costs</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700 bg-green-50">Final Per Person</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700 bg-green-100">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {paxSlabs.map((slabPax) => {
                    const generalPerPerson = slabPax > 0 ? totals.totalGeneral / slabPax : 0;
                    const costPerPerson = totals.totalPerPerson + generalPerPerson;
                    const subtotal = costPerPerson * slabPax;
                    const markupAmount = subtotal * (markup / 100);
                    const afterMarkup = subtotal + markupAmount;
                    const taxAmount = afterMarkup * (tax / 100);
                    const total = afterMarkup + taxAmount;
                    const finalPerPerson = total / slabPax;
                    const isCurrentPax = slabPax === pax;

                    return (
                      <tr
                        key={slabPax}
                        className={`${isCurrentPax ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'}`}
                      >
                        <td className={`border border-gray-300 px-3 py-2 text-center ${isCurrentPax ? 'font-bold text-indigo-700' : ''}`}>
                          {slabPax} {isCurrentPax && '← CURRENT'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-red-700">
                          €{generalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-blue-700">
                          €{totals.totalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700 bg-green-50">
                          €{finalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 bg-green-100">
                          €{total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowPricingTable(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow"
          >
            📊 Generate Pricing Table
          </button>
          <button
            onClick={saveQuote}
            disabled={isSaving}
            className={`px-6 py-2 text-white font-bold rounded shadow ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSaving ? 'Saving...' : '💾 Save Quote'}
          </button>
        </div>

        {/* Pricing Table Modal */}
        {showPricingTable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Pricing Table for Word</h2>
                <button
                  onClick={() => setShowPricingTable(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {tourType === 'SIC' ? 'SIC Tour - Fixed PAX slabs (2, 4, 6, 8)' : `Private Tour - ${pax} PAX`}
                </p>
                <p className="text-xs text-gray-500">
                  Markup: {markup}% | Tax: {tax}%
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="border border-gray-300 px-4 py-2 text-left">PAX</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Per Person (DBL)</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Single Suppl.</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Child 0-2 yrs</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Child 3-5 yrs</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Child 6-11 yrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatePricingTable().map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-semibold">{row.pax}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-green-700">
                          €{row.adultPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-orange-700">
                          €{row.singleSupplement.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-purple-700">
                          €{row.child0to2.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-purple-700">
                          €{row.child3to5.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-purple-700">
                          €{row.child6to11.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={copyPricingTableToClipboard}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowPricingTable(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded shadow"
                >
                  Close
                </button>
              </div>

              {saveMessage && (
                <div className={`mt-4 px-4 py-2 rounded text-center ${
                  saveMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
