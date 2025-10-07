'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

interface ExpenseItem {
  id: string;
  description: string;
  price: number;
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

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pax, setPax] = useState<number>(2);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tourType, setTourType] = useState<'SIC' | 'Private'>('Private');
  const [transportPricingMode, setTransportPricingMode] = useState<'total' | 'vehicle'>('total');
  const [days, setDays] = useState<DayExpenses[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const createEmptyDay = (dayNum: number, dateStr: string): DayExpenses => ({
    dayNumber: dayNum,
    date: dateStr,
    hotelAccommodation: [{ id: `hotel-${Date.now()}`, description: '', price: 0 }],
    meals: [{ id: `meal-${Date.now()}`, description: '', price: 0 }],
    entranceFees: [{ id: `entrance-${Date.now()}`, description: '', price: 0 }],
    sicTourCost: [{ id: `sic-${Date.now()}`, description: '', price: 0 }],
    tips: [{ id: `tip-${Date.now()}`, description: '', price: 0 }],
    transportation: [{ id: `transport-${Date.now()}`, description: '', price: 0 }],
    guide: [{ id: `guide-${Date.now()}`, description: '', price: 0 }],
    guideDriverAccommodation: [{ id: `gdaccom-${Date.now()}`, description: '', price: 0 }],
    parking: [{ id: `parking-${Date.now()}`, description: '', price: 0 }]
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

  const addRow = (dayIndex: number, category: keyof DayExpenses) => {
    const newDays = [...days];
    const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
    categoryArray.push({
      id: `${category}-${Date.now()}`,
      description: '',
      price: 0
    });
    setDays(newDays);
  };

  const deleteRow = (dayIndex: number, category: keyof DayExpenses, itemId: string) => {
    const newDays = [...days];
    const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
    if (categoryArray.length > 1) {
      newDays[dayIndex][category] = categoryArray.filter(e => e.id !== itemId) as any;
      setDays(newDays);
    }
  };

  const updateItem = (dayIndex: number, category: keyof DayExpenses, itemId: string, field: 'description' | 'price', value: any) => {
    const newDays = [...days];
    const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
    const item = categoryArray.find(e => e.id === itemId);
    if (item) {
      item[field] = value;
      setDays(newDays);
    }
  };

  const calculateDayTotals = (day: DayExpenses) => {
    const perPersonTotal =
      day.hotelAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.meals.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.entranceFees.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.sicTourCost.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.tips.reduce((sum, e) => sum + (e.price || 0), 0);

    const generalTotal =
      day.transportation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guide.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guideDriverAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.parking.reduce((sum, e) => sum + (e.price || 0), 0);

    return { perPersonTotal, generalTotal };
  };

  const calculateGrandTotals = () => {
    let totalPerPerson = 0;
    let totalGeneral = 0;

    days.forEach(day => {
      const dayTotals = calculateDayTotals(day);
      totalPerPerson += dayTotals.perPersonTotal;
      totalGeneral += dayTotals.generalTotal;
    });

    const generalPerPerson = pax > 0 ? totalGeneral / pax : 0;
    const finalPerPerson = totalPerPerson + generalPerPerson;

    return {
      totalPerPerson,
      totalGeneral,
      generalPerPerson,
      finalPerPerson,
      grandTotal: finalPerPerson * pax
    };
  };

  const ExpenseTable = ({
    title,
    items,
    dayIndex,
    category,
    isGeneral = false,
    color = 'blue',
    isTransportation = false
  }: {
    title: string;
    items: ExpenseItem[];
    dayIndex: number;
    category: keyof DayExpenses;
    isGeneral?: boolean;
    color?: string;
    isTransportation?: boolean;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-700 ring-blue-500',
      red: 'bg-red-50 text-red-700 ring-red-500',
      green: 'bg-green-50 text-green-700 ring-green-500',
      orange: 'bg-orange-50 text-orange-700 ring-orange-500',
      purple: 'bg-purple-50 text-purple-700 ring-purple-500'
    }[color];

    const isVehicleMode = isTransportation && transportPricingMode === 'vehicle';

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className={`text-xs font-bold ${colorClasses}`}>{title}</h4>
          <button
            onClick={() => addRow(dayIndex, category)}
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

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-0">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(dayIndex, category, item.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  {isVehicleMode ? (
                    <>
                      <td className="border border-gray-300 p-0 w-16">
                        <input
                          type="number"
                          min="0"
                          value={!item.vehicleCount || item.vehicleCount === 0 ? '' : item.vehicleCount}
                          onChange={(e) => {
                            const newDays = [...days];
                            const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
                            const foundItem = categoryArray.find(i => i.id === item.id);
                            if (foundItem) {
                              const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                              foundItem.vehicleCount = value;
                              foundItem.price = (foundItem.vehicleCount || 0) * (foundItem.pricePerVehicle || 0);
                              setDays(newDays);
                            }
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
                            const newDays = [...days];
                            const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
                            const foundItem = categoryArray.find(i => i.id === item.id);
                            if (foundItem) {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              foundItem.pricePerVehicle = value;
                              foundItem.price = (foundItem.vehicleCount || 0) * (foundItem.pricePerVehicle || 0);
                              setDays(newDays);
                            }
                          }}
                          placeholder="Price"
                          className="w-full px-1.5 py-1 text-xs text-right text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right text-xs font-bold text-gray-900 bg-gray-100 w-20">
                        ${calculatedPrice.toFixed(2)}
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
                          updateItem(dayIndex, category, item.id, 'price', value);
                        }}
                        className="w-full px-1.5 py-1 text-xs text-right text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  {isGeneral && (
                    <td className="border border-gray-300 px-1.5 py-1 text-right text-xs font-semibold text-red-700 bg-red-50 w-20">
                      ${(calculatedPrice / pax).toFixed(2)}
                    </td>
                  )}
                  <td className="border border-gray-300 p-0 text-center w-8">
                    <button
                      onClick={() => deleteRow(dayIndex, category, item.id)}
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
        {/* Tour Details */}
        <div className="mb-3 bg-white shadow rounded-lg p-3">
          <div className="grid grid-cols-6 gap-3 items-end">
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
            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-gray-600">Days: </span>
                <span className="font-bold text-gray-900">{days.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Per Person: </span>
                <span className="font-bold text-indigo-600 text-base">${totals.finalPerPerson.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Total: </span>
                <span className="font-bold text-gray-900 text-base">${totals.grandTotal.toFixed(2)}</span>
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
                  <span className="text-blue-700 font-semibold">Per Person: ${dayTotals.perPersonTotal.toFixed(2)}</span>
                  <span className="mx-2">|</span>
                  <span className="text-red-700 font-semibold">General: ${dayTotals.generalTotal.toFixed(2)} (${(dayTotals.generalTotal / pax).toFixed(2)}/pax)</span>
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
                  />

                  <ExpenseTable
                    title="🍽️ Meals"
                    items={day.meals}
                    dayIndex={dayIndex}
                    category="meals"
                    color="green"
                  />

                  <ExpenseTable
                    title="🎫 Entrance Fees"
                    items={day.entranceFees}
                    dayIndex={dayIndex}
                    category="entranceFees"
                    color="orange"
                  />

                  {tourType === 'SIC' && (
                    <ExpenseTable
                      title="🚌 SIC Tour Cost"
                      items={day.sicTourCost}
                      dayIndex={dayIndex}
                      category="sicTourCost"
                      color="purple"
                    />
                  )}

                  <ExpenseTable
                    title="💵 Tips"
                    items={day.tips}
                    dayIndex={dayIndex}
                    category="tips"
                    color="green"
                  />

                  <div className="mt-2 p-2 bg-blue-100 rounded">
                    <div className="text-xs font-bold text-blue-900">
                      Day {day.dayNumber} Per Person Total: ${dayTotals.perPersonTotal.toFixed(2)}
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
                      />

                      <ExpenseTable
                        title="🅿️ Parking (Sightseeing + Airport Transfer)"
                        items={day.parking}
                        dayIndex={dayIndex}
                        category="parking"
                        isGeneral={true}
                        color="orange"
                      />

                      <ExpenseTable
                        title="🛏️ Guide/Driver Accommodation"
                        items={day.guideDriverAccommodation}
                        dayIndex={dayIndex}
                        category="guideDriverAccommodation"
                        isGeneral={true}
                        color="purple"
                      />
                    </>
                  )}

                  <div className="mt-2 p-2 bg-red-100 rounded">
                    <div className="text-xs font-bold text-red-900">
                      Day {day.dayNumber} General Total: ${dayTotals.generalTotal.toFixed(2)}
                      <span className="ml-2">= ${(dayTotals.generalTotal / pax).toFixed(2)} per person</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

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
                    const finalPerPerson = totals.totalPerPerson + generalPerPerson;
                    const total = finalPerPerson * slabPax;
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
                          ${generalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-blue-700">
                          ${totals.totalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700 bg-green-50">
                          ${finalPerPerson.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 bg-green-100">
                          ${total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow">
            Save Quote
          </button>
        </div>
      </main>
    </div>
  );
}
