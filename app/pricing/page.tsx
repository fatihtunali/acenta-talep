'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, memo } from 'react';
import { signOut } from 'next-auth/react';

interface ExpenseItem {
  id: string;
  location: string; // City/Location (e.g., Istanbul, Cappadocia)
  description: string; // Hotel/Restaurant name or description
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
  pax,
  transportPricingMode,
  onAddRow,
  onDeleteRow,
  onUpdateItem,
  onUpdateVehicleCount,
  onUpdatePricePerVehicle
}: {
  title: string;
  items: ExpenseItem[];
  dayIndex: number;
  category: keyof DayExpenses;
  isGeneral?: boolean;
  color?: string;
  isTransportation?: boolean;
  pax: number;
  transportPricingMode: 'total' | 'vehicle';
  onAddRow: (dayIndex: number, category: keyof DayExpenses) => void;
  onDeleteRow: (dayIndex: number, category: keyof DayExpenses, itemId: string) => void;
  onUpdateItem: (dayIndex: number, category: keyof DayExpenses, itemId: string, field: 'location' | 'description' | 'price', value: any) => void;
  onUpdateVehicleCount: (dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => void;
  onUpdatePricePerVehicle: (dayIndex: number, category: keyof DayExpenses, itemId: string, value: number) => void;
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

            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-0 w-32">
                  <input
                    type="text"
                    value={item.location}
                    onChange={(e) => onUpdateItem(dayIndex, category, item.id, 'location', e.target.value)}
                    placeholder="City/Location"
                    className="w-full px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdateItem(dayIndex, category, item.id, 'description', e.target.value)}
                    placeholder="Hotel/Restaurant/Activity Name"
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
                        onUpdateItem(dayIndex, category, item.id, 'price', value);
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

export default function PricingPage() {
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
    setIsLoading(true);
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
        const loadedDays = data.days.map((day: any) => ({
          ...day,
          hotelAccommodation: day.hotelAccommodation.map((item: any) => ({ ...item, id: generateId() })),
          meals: day.meals.map((item: any) => ({ ...item, id: generateId() })),
          entranceFees: day.entranceFees.map((item: any) => ({ ...item, id: generateId() })),
          sicTourCost: day.sicTourCost.map((item: any) => ({ ...item, id: generateId() })),
          tips: day.tips.map((item: any) => ({ ...item, id: generateId() })),
          transportation: day.transportation.map((item: any) => ({ ...item, id: generateId() })),
          guide: day.guide.map((item: any) => ({ ...item, id: generateId() })),
          guideDriverAccommodation: day.guideDriverAccommodation.map((item: any) => ({ ...item, id: generateId() })),
          parking: day.parking.map((item: any) => ({ ...item, id: generateId() }))
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
    } finally {
      setIsLoading(false);
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
        newDays[dayIndex][category] = categoryArray.filter(e => e.id !== itemId) as any;
      }
      return newDays;
    });
  }, []);

  const updateItem = useCallback((dayIndex: number, category: keyof DayExpenses, itemId: string, field: 'location' | 'description' | 'price', value: any) => {
    setDays(prevDays => {
      const newDays = [...prevDays];
      const categoryArray = newDays[dayIndex][category] as ExpenseItem[];
      const item = categoryArray.find(e => e.id === itemId);
      if (item) {
        item[field] = value;
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

    const generalTotal =
      day.transportation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guide.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.guideDriverAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
      day.parking.reduce((sum, e) => sum + (e.price || 0), 0);

    return { perPersonTotal, generalTotal };
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
      setSaveMessage(`❌ Failed to save quote: ${error.message}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
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
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                  />

                  <ExpenseTable
                    title="🍽️ Meals"
                    items={day.meals}
                    dayIndex={dayIndex}
                    category="meals"
                    color="green"
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                  />

                  <ExpenseTable
                    title="🎫 Entrance Fees"
                    items={day.entranceFees}
                    dayIndex={dayIndex}
                    category="entranceFees"
                    color="orange"
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
                  />

                  {tourType === 'SIC' && (
                    <ExpenseTable
                      title="🚌 SIC Tour Cost"
                      items={day.sicTourCost}
                      dayIndex={dayIndex}
                      category="sicTourCost"
                      color="purple"
                      pax={pax}
                      transportPricingMode={transportPricingMode}
                      onAddRow={addRow}
                      onDeleteRow={deleteRow}
                      onUpdateItem={updateItem}
                      onUpdateVehicleCount={updateVehicleCount}
                      onUpdatePricePerVehicle={updatePricePerVehicle}
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
                    pax={pax}
                    transportPricingMode={transportPricingMode}
                    onAddRow={addRow}
                    onDeleteRow={deleteRow}
                    onUpdateItem={updateItem}
                    onUpdateVehicleCount={updateVehicleCount}
                    onUpdatePricePerVehicle={updatePricePerVehicle}
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
                      Day {day.dayNumber} General Total: ${dayTotals.generalTotal.toFixed(2)}
                      <span className="ml-2">= ${(dayTotals.generalTotal / pax).toFixed(2)} per person</span>
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
                  <span className="font-semibold text-blue-700">${totals.totalPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">General Expenses Total:</span>
                  <span className="font-semibold text-red-700">${totals.totalGeneral.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">General Per Person ({pax} PAX):</span>
                  <span className="font-semibold text-red-700">${totals.generalPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-700 font-semibold">Cost Per Person:</span>
                  <span className="font-bold text-gray-900">${totals.costPerPerson.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-semibold">Subtotal ({pax} PAX):</span>
                  <span className="font-bold text-gray-900">${totals.subtotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Markup ({markup}%):</span>
                  <span className="font-semibold text-green-700">+${totals.markupAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">After Markup:</span>
                  <span className="font-semibold text-gray-700">${totals.afterMarkup.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({tax}%):</span>
                  <span className="font-semibold text-red-700">+${totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t">
                  <span className="text-gray-900 font-bold">Grand Total:</span>
                  <span className="font-bold text-green-600">${totals.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm bg-indigo-50 p-2 rounded">
                  <span className="text-indigo-700 font-semibold">Final Per Person:</span>
                  <span className="font-bold text-indigo-700">${totals.finalPerPerson.toFixed(2)}</span>
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
