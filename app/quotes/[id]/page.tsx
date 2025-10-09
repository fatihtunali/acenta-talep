'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface ExpenseItem {
  location: string;
  description: string;
  price: number;
  pricePerVehicle?: number;
  vehicleCount?: number;
  singleSupplement?: number;
  child0to2?: number;
  child3to5?: number;
  child6to11?: number;
}

interface DayExpenses {
  dayNumber: number;
  date: string;
  hotelAccommodation: ExpenseItem[];
  meals: ExpenseItem[];
  entranceFees: ExpenseItem[];
  sicTourCost: ExpenseItem[];
  tips: ExpenseItem[];
  transportation: ExpenseItem[];
  guide: ExpenseItem[];
  guideDriverAccommodation: ExpenseItem[];
  parking: ExpenseItem[];
}

interface QuoteData {
  id: number;
  quoteName: string;
  startDate: string;
  endDate: string;
  tourType: 'SIC' | 'Private';
  pax: number;
  markup: number;
  tax: number;
  transportPricingMode: 'total' | 'vehicle';
  days: DayExpenses[];
  createdAt: string;
  updatedAt: string;
}

export default function ViewQuotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchQuote = useCallback(async () => {
    if (!quoteId) return;
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();
      if (response.ok) {
        setQuote(data);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchQuote();
    }
  }, [status, fetchQuote]);

  const calculateDayTotals = (day: DayExpenses) => {
    let perPersonTotal = 0;
    let generalTotal = 0;

    // Per person expenses
    [...day.hotelAccommodation, ...day.meals, ...day.entranceFees, ...day.sicTourCost, ...day.tips].forEach(item => {
      if (item.price) perPersonTotal += item.price;
    });

    // General expenses
    day.transportation.forEach(item => {
      if (quote?.transportPricingMode === 'vehicle' && item.pricePerVehicle && item.vehicleCount) {
        generalTotal += item.pricePerVehicle * item.vehicleCount;
      } else if (item.price) {
        generalTotal += item.price;
      }
    });

    [...day.guide, ...day.guideDriverAccommodation, ...day.parking].forEach(item => {
      if (item.price) generalTotal += item.price;
    });

    return { perPersonTotal, generalTotal };
  };

  const calculateGrandTotals = () => {
    if (!quote) return {
      totalPerPerson: 0,
      totalGeneral: 0,
      generalPerPerson: 0,
      costPerPerson: 0,
      subtotal: 0,
      markupAmount: 0,
      afterMarkup: 0,
      taxAmount: 0,
      grandTotal: 0,
      finalPerPerson: 0
    };

    let totalPerPerson = 0;
    let totalGeneral = 0;

    quote.days.forEach(day => {
      const dayTotals = calculateDayTotals(day);
      totalPerPerson += dayTotals.perPersonTotal;
      totalGeneral += dayTotals.generalTotal;
    });

    const generalPerPerson = quote.pax > 0 ? totalGeneral / quote.pax : 0;
    const costPerPerson = totalPerPerson + generalPerPerson;
    const subtotal = costPerPerson * quote.pax;
    const markupAmount = subtotal * (quote.markup / 100);
    const afterMarkup = subtotal + markupAmount;
    const taxAmount = afterMarkup * (quote.tax / 100);
    const grandTotal = afterMarkup + taxAmount;
    const finalPerPerson = grandTotal / quote.pax;

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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !quote) {
    return null;
  }

  const totals = calculateGrandTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">View Quote</h1>
              <Link href="/quotes" className="text-sm text-gray-600 hover:text-gray-900">Back to Quotes</Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
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
        {/* Quote Header */}
        <div className="mb-3 bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{quote.quoteName}</h2>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tour Type: </span>
                  <span className={`font-semibold ${quote.tourType === 'Private' ? 'text-orange-700' : 'text-purple-700'}`}>
                    {quote.tourType}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">PAX: </span>
                  <span className="font-semibold text-gray-900">{quote.pax}</span>
                </div>
                <div>
                  <span className="text-gray-600">Markup: </span>
                  <span className="font-semibold text-green-700">{quote.markup}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Tax: </span>
                  <span className="font-semibold text-red-700">{quote.tax}%</span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Tour Dates: </span>
                <span className="font-semibold text-gray-900">
                  {new Date(quote.startDate).toLocaleDateString()} - {new Date(quote.endDate).toLocaleDateString()}
                </span>
                <span className="mx-2">|</span>
                <span className="text-gray-600">Transport Mode: </span>
                <span className="font-semibold text-blue-700">{quote.transportPricingMode}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Created: {new Date(quote.createdAt).toLocaleDateString()}</div>
              <div className="text-sm text-gray-500">Updated: {new Date(quote.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow rounded-lg p-4">
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div className="text-xs opacity-90">Final Per Person</div>
              <div className="text-2xl font-bold">€{totals.finalPerPerson.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-90">Grand Total</div>
              <div className="text-2xl font-bold">€{totals.grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Days Breakdown */}
        <div className="space-y-3">
          {quote.days.map((day) => {
            const dayTotals = calculateDayTotals(day);
            const hasPerPersonExpenses = dayTotals.perPersonTotal > 0;
            const hasGeneralExpenses = dayTotals.generalTotal > 0;

            return (
              <div key={day.dayNumber} className="bg-white shadow rounded-lg p-3">
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <h2 className="text-base font-bold text-gray-900">
                    Day {day.dayNumber} - {day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Set dates'}
                  </h2>
                  <div className="text-xs">
                    <span className="text-blue-700 font-semibold">Per Person: €{dayTotals.perPersonTotal.toFixed(2)}</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-700 font-semibold">General: €{dayTotals.generalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {hasPerPersonExpenses && (
                  <div className="mb-3">
                    <h3 className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded mb-2">PER PERSON EXPENSES</h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1 text-left w-32">Category</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">City</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                          <th className="border border-gray-300 px-2 py-1 text-right w-24">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { category: 'Hotel', items: day.hotelAccommodation },
                          { category: 'Meals', items: day.meals },
                          { category: 'Entrance Fees', items: day.entranceFees },
                          { category: 'SIC Tour', items: day.sicTourCost },
                          { category: 'Tips', items: day.tips }
                        ].map(({ category, items }) =>
                          items.filter(item => item.price > 0 || item.location || item.description).map((item, idx) => (
                            <tr key={`${category}-${idx}`}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold text-blue-700">{category}</td>
                              <td className="border border-gray-300 px-2 py-1 text-gray-900">{item.location}</td>
                              <td className="border border-gray-300 px-2 py-1 text-gray-900">{item.description}</td>
                              <td className="border border-gray-300 px-2 py-1 text-right font-bold text-gray-900">€{item.price.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {hasGeneralExpenses && (
                  <div>
                    <h3 className="text-xs font-bold text-red-900 bg-red-100 px-2 py-1 rounded mb-2">GENERAL EXPENSES (Divided by PAX)</h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1 text-left w-32">Category</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">City</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                          <th className="border border-gray-300 px-2 py-1 text-right w-24">Total Price</th>
                          <th className="border border-gray-300 px-2 py-1 text-right w-24">Per Person</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { category: 'Transport', items: day.transportation },
                          { category: 'Guide', items: day.guide },
                          { category: 'Guide Accom', items: day.guideDriverAccommodation },
                          { category: 'Parking', items: day.parking }
                        ].map(({ category, items }) =>
                          items.filter(item => item.price > 0 || item.location || item.description).map((item, idx) => {
                            const totalPrice = quote.transportPricingMode === 'vehicle' && item.pricePerVehicle && item.vehicleCount
                              ? item.pricePerVehicle * item.vehicleCount
                              : item.price;
                            return (
                              <tr key={`${category}-${idx}`}>
                                <td className="border border-gray-300 px-2 py-1 font-semibold text-red-700">{category}</td>
                                <td className="border border-gray-300 px-2 py-1 text-gray-900">{item.location}</td>
                                <td className="border border-gray-300 px-2 py-1 text-gray-900">
                                  {item.description}
                                  {quote.transportPricingMode === 'vehicle' && item.vehicleCount && (
                                    <span className="text-blue-600 ml-1">({item.vehicleCount} vehicles)</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-right font-bold text-gray-900">€{totalPrice.toFixed(2)}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right font-semibold text-red-700">
                                  €{(totalPrice / quote.pax).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final Calculations */}
        <div className="mt-3 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Final Calculations</h2>
          <div className="grid grid-cols-2 gap-6">
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
                <span className="text-gray-600">General Per Person ({quote.pax} PAX):</span>
                <span className="font-semibold text-red-700">€{totals.generalPerPerson.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-700 font-semibold">Cost Per Person:</span>
                <span className="font-bold text-gray-900">€{totals.costPerPerson.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-semibold">Subtotal ({quote.pax} PAX):</span>
                <span className="font-bold text-gray-900">€{totals.subtotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Markup ({quote.markup}%):</span>
                <span className="font-semibold text-green-700">+€{totals.markupAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">After Markup:</span>
                <span className="font-semibold text-gray-700">€{totals.afterMarkup.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({quote.tax}%):</span>
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
      </main>
    </div>
  );
}
