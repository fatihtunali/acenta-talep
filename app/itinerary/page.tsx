'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Suspense } from 'react';
import Link from 'next/link';

interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  mealCode: string;
  description: string;
}

interface HotelStay {
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType?: string;
  category?: string;
}

interface PricingSlab {
  pax: number;
  pricePerPerson: number;
  totalPrice: number;
}

interface HotelCategoryPricing {
  category: string;
  pricingSlabs: PricingSlab[];
}

function ItineraryPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tourName, setTourName] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [hotels, setHotels] = useState<HotelStay[]>([]);
  const [hotelCategoryPricing, setHotelCategoryPricing] = useState<HotelCategoryPricing[]>([]);
  const [inclusions, setInclusions] = useState<string>('');
  const [exclusions, setExclusions] = useState<string>('');
  const [information, setInformation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load quote if quoteId parameter is present
  useEffect(() => {
    const quoteId = searchParams.get('quote');
    if (quoteId && session) {
      loadQuoteForItinerary(quoteId);
    }
  }, [searchParams, session]);

  // Auto-resize all textareas after content is loaded
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea: any) => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }, [days, inclusions, exclusions, information, hotelCategoryPricing]);

  const generateAIDescription = async (dayData: any) => {
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayData })
      });

      if (response.ok) {
        const { description } = await response.json();
        return description;
      }
    } catch (error) {
      console.error('Error generating AI description:', error);
    }
    return '';
  };

  const loadQuoteForItinerary = async (quoteId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (response.ok) {
        const data = await response.json();

        // Calculate duration
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysCount = nights + 1;

        setTourName(data.quoteName);
        setDuration(`${nights} Nights / ${daysCount} Days`);

        // Initialize itinerary days with AI-generated descriptions
        const itineraryDaysPromises = data.days.map(async (day: any, index: number) => {
          const location = day.hotelAccommodation?.[0]?.location || 'Location';

          // For SIC tours, get tour details from sicTourCost, for Private tours use entranceFees
          const isSIC = data.tourType === 'SIC';
          let activities = [];
          let tourName = '';

          if (isSIC && day.sicTourCost && day.sicTourCost.length > 0) {
            // SIC Tour - extract tour name and location
            const sicTour = day.sicTourCost[0];
            tourName = sicTour.description || '';
            const tourLocation = sicTour.location || '';
            activities = tourName ? [tourName] : [];

            // Also add any entrance fees mentioned
            if (day.entranceFees && day.entranceFees.length > 0) {
              const entrances = day.entranceFees.map((e: any) => e.description).filter(Boolean);
              activities = [...activities, ...entrances];
            }
          } else {
            // Private Tour - use entrance fees as activities
            activities = day.entranceFees?.map((e: any) => e.description).filter(Boolean) || [];
          }

          // Keep full hotel info for AI context (but we won't show specific names in UI)
          const accommodation = day.hotelAccommodation?.[0]?.description || '';
          const meals = day.meals?.map((m: any) => m.description).filter(Boolean) || [];
          const transportation = day.transportation?.[0]?.description || '';
          const transportLocation = day.transportation?.[0]?.location || '';

          // Get all transfer information
          const transfers = day.transportation?.map((t: any) => ({
            description: t.description,
            location: t.location
          })).filter((t: any) => t.description) || [];

          // Determine if this is first day (arrival) or last day (departure)
          const isFirstDay = index === 0;
          const isLastDay = index === data.days.length - 1;

          // Check if there's a city change (intercity transfer)
          const previousLocation = index > 0 ? data.days[index - 1].hotelAccommodation?.[0]?.location : null;
          const currentLocation = location;
          const isCityChange = previousLocation && previousLocation !== currentLocation;

          // Determine transfer type based on ALL transportation descriptions
          let transferMode = '';
          let hasAirportTransfer = false;
          let airportTransferCount = 0;

          transfers.forEach((t: any) => {
            const desc = t.description.toLowerCase();
            if (desc.includes('flight') || desc.includes('fly') || desc.includes('domestic')) {
              transferMode = 'flight';
            } else if (desc.includes('airport')) {
              airportTransferCount++;
              hasAirportTransfer = true;
              if (!transferMode) transferMode = 'airport';
            } else if (desc.includes('transfer') || desc.includes('drive')) {
              if (!transferMode) transferMode = 'road';
            }
          });

          // If there are 2+ airport transfers on a city change day, it means flight
          // (one transfer to airport in origin city, one transfer from airport in destination city)
          if (isCityChange && airportTransferCount >= 2 && !isFirstDay && !isLastDay) {
            transferMode = 'flight';
          }

          // For first day, it's always an airport arrival
          if (isFirstDay) {
            transferMode = 'airport_arrival';
            hasAirportTransfer = true;
          }

          // For last day, it's airport departure
          if (isLastDay) {
            transferMode = 'airport_departure';
            hasAirportTransfer = true;
          }

          // Determine meal code based on meals
          let mealCode = '(';

          // Breakfast is included on all days except arrival day (Day 1)
          if (!isFirstDay) {
            mealCode += 'B';
          }

          // For SIC tours, lunch is included on full day tours
          if (isSIC && tourName && tourName.toLowerCase().includes('full day')) {
            mealCode += mealCode.length > 1 ? '/L' : 'L';
          }

          // Check for explicitly mentioned meals
          if (meals.some((m: string) => m.toLowerCase().includes('lunch')) && !mealCode.includes('L')) {
            mealCode += mealCode.length > 1 ? '/L' : 'L';
          }
          if (meals.some((m: string) => m.toLowerCase().includes('dinner'))) {
            mealCode += mealCode.length > 1 ? '/D' : 'D';
          }

          if (mealCode === '(') mealCode = '(-)';
          else mealCode += ')';
          mealCode = mealCode.replace('(/', '(');

          // Generate AI description
          const aiDescription = await generateAIDescription({
            dayNumber: day.dayNumber,
            location,
            previousLocation,
            activities,
            accommodation,
            meals,
            transfers,
            transportation,
            transportLocation,
            isFirstDay,
            isLastDay,
            isCityChange,
            transferMode,
            hasAirportTransfer,
            tourType: data.tourType,
            tourName
          });

          return {
            dayNumber: day.dayNumber,
            date: day.date,
            title: `Day ${day.dayNumber} - ${location}`,
            mealCode,
            description: aiDescription || `After breakfast, your tour includes ${activities.join(', ') || 'various activities'}. Overnight in ${location}.`
          };
        });

        const itineraryDays = await Promise.all(itineraryDaysPromises);
        setDays(itineraryDays);

        // Extract hotel information and determine category
        const hotelStays: HotelStay[] = [];
        let currentHotel = '';
        let checkInDate = '';
        let checkInCity = '';

        data.days.forEach((day: any, index: number) => {
          const hotelInfo = day.hotelAccommodation?.[0];
          if (hotelInfo?.description) {
            if (currentHotel !== hotelInfo.description) {
              // New hotel detected
              if (currentHotel) {
                // Extract hotel category from name (e.g., "5 Star", "4 Star")
                const categoryMatch = currentHotel.match(/(\d)\s*[Ss]tar/);
                const category = categoryMatch ? `${categoryMatch[1]}-Star` : '4-Star';

                // Save previous hotel stay
                hotelStays.push({
                  hotelName: currentHotel,
                  city: checkInCity,
                  checkIn: checkInDate,
                  checkOut: day.date,
                  nights: index - data.days.findIndex((d: any) => d.hotelAccommodation?.[0]?.description === currentHotel),
                  category
                });
              }
              currentHotel = hotelInfo.description;
              checkInDate = day.date;
              checkInCity = hotelInfo.location || 'N/A';
            }
          }
        });

        // Add the last hotel
        if (currentHotel) {
          const categoryMatch = currentHotel.match(/(\d)\s*[Ss]tar/);
          const category = categoryMatch ? `${categoryMatch[1]}-Star` : '4-Star';

          hotelStays.push({
            hotelName: currentHotel,
            city: checkInCity,
            checkIn: checkInDate,
            checkOut: data.endDate,
            nights: data.days.filter((d: any) => d.hotelAccommodation?.[0]?.description === currentHotel).length,
            category
          });
        }

        setHotels(hotelStays);

        // Create pricing tables for 3-star, 4-star, and 5-star hotel options
        const paxValues = [2, 4, 6, 8, 10];
        const categories = ['3-Star Hotels', '4-Star Hotels', '5-Star Hotels'];

        const categoryPricing: HotelCategoryPricing[] = categories.map(category => ({
          category,
          pricingSlabs: paxValues.map(pax => ({
            pax,
            pricePerPerson: 0,
            totalPrice: 0
          }))
        }));

        setHotelCategoryPricing(categoryPricing);

        // Set default inclusions/exclusions/information
        setInclusions(`• ${nights} nights accommodation in the mentioned hotels,\n• Meals are as per itinerary with code letters (B=Breakfast, L=Lunch, D=Dinner),\n• Return airport transfers on Private basis,\n• Professional English-Speaking Guidance on tour days,\n• Sightseeings as per itinerary on ${data.tourType === 'SIC' ? 'SIC (Group Tours)' : 'Private'} basis with entrance fees for mentioned places,\n• Local Taxes.`);

        setExclusions(`• Flights,\n• Personal expenses,\n• Drinks at meals,\n• Tips and porterage at hotels,\n• Tips to the driver and the guide.`);

        setInformation(`• Official Holidays and Religious Festivals: Grand Bazaar and Spice Market will be closed.\n• Grand Bazaar is closed on Sundays,\n• Please be ready on lobby floor minimum 5 minutes prior to pick up time for the tours and transfers.`);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDay = (dayIndex: number, field: keyof DayItinerary, value: any) => {
    const newDays = [...days];
    newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
    setDays(newDays);
  };

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        /* Make inputs look like regular text */
        .text-input, .text-area {
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          font-family: inherit;
          line-height: inherit;
        }

        .text-input:hover, .text-area:hover {
          background: rgba(229, 231, 235, 0.3);
        }

        .text-input:focus, .text-area:focus {
          background: white;
          outline: 2px solid #e5e7eb;
          outline-offset: 2px;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 2cm;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print\\:break-before {
            break-before: page;
            page-break-before: always;
          }

          /* Ensure backgrounds and borders print */
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Remove shadows for cleaner print */
          .shadow, .shadow-sm, .shadow-lg {
            box-shadow: none !important;
          }

          /* Remove borders from inputs when printing */
          input, textarea {
            border: none !important;
            outline: none !important;
            background: transparent !important;
          }

          /* Optimize table for print */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-sm print:hidden border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Itinerary Builder
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {days.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No itinerary loaded. Select a quote to get started.</p>
            <Link
              href="/quotes"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
            >
              Select Quote
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md print:shadow-none">
            {/* Header with Logo */}
            <div className="px-12 pt-10 pb-6">
              <div className="flex items-start justify-between mb-8">
                <img
                  src="/images/Funny_Logo.png"
                  alt="Funny Tourism"
                  className="h-20 object-contain"
                />
                <div className="text-right text-xs text-gray-600 leading-relaxed">
                  <p className="font-semibold text-sm text-gray-800">Funny Tourism</p>
                  <p className="mt-1">Mehmet Akif Ersoy Mah.</p>
                  <p>Hanımeli Sok No 5/B</p>
                  <p>Uskudar - Istanbul</p>
                  <p className="mt-2">www.funnytourism.com</p>
                  <p>info@funnytourism.com</p>
                </div>
              </div>

              {/* Tour Title and Duration */}
              <div className="text-center border-b-2 border-indigo-600 pb-6">
                <input
                  type="text"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  className="text-input text-4xl font-bold text-indigo-900 w-full text-center mb-2"
                  placeholder="Tour Package Name"
                />
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="text-input text-lg text-gray-600 w-full text-center"
                  placeholder="X Nights / X Days"
                />
              </div>
            </div>

            {/* Day by Day Itinerary */}
            <div className="px-12 py-8 space-y-6">
              {days.map((day, index) => (
                <div key={index} className="mb-6 print:break-inside-avoid">
                  <div className="flex items-baseline justify-between mb-3">
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateDay(index, 'title', e.target.value)}
                      className="text-input flex-1 text-xl font-bold text-gray-900"
                      placeholder="Day X - Location"
                    />
                    <input
                      type="text"
                      value={day.mealCode}
                      onChange={(e) => updateDay(index, 'mealCode', e.target.value)}
                      className="text-input w-20 text-right text-gray-600 font-medium ml-4"
                      placeholder="(B/L/D)"
                    />
                  </div>
                  <textarea
                    value={day.description}
                    onChange={(e) => {
                      updateDay(index, 'description', e.target.value);
                      autoResizeTextarea(e);
                    }}
                    onInput={autoResizeTextarea}
                    className="text-area w-full text-gray-700 leading-relaxed text-justify overflow-hidden"
                    style={{ minHeight: '80px' }}
                    placeholder="Enter day description..."
                  />
                </div>
              ))}
            </div>

            {/* Inclusions */}
            <div className="px-12 pb-6 border-t border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Inclusions</h3>
              <textarea
                value={inclusions}
                onChange={(e) => {
                  setInclusions(e.target.value);
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '120px' }}
                placeholder="• List inclusions here..."
              />
            </div>

            {/* Exclusions */}
            <div className="px-12 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Exclusions</h3>
              <textarea
                value={exclusions}
                onChange={(e) => {
                  setExclusions(e.target.value);
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '100px' }}
                placeholder="• List exclusions here..."
              />
            </div>

            {/* Information */}
            <div className="px-12 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Important Information</h3>
              <textarea
                value={information}
                onChange={(e) => {
                  setInformation(e.target.value);
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '100px' }}
                placeholder="• Add important information here..."
              />
            </div>

            {/* Hotels and Rates */}
            {hotels.length > 0 && (
              <div className="px-12 pb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Accommodation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          City
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Check-In
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Check-Out
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Nights
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotels.map((hotel, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                            {hotel.city}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {new Date(hotel.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {new Date(hotel.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-center font-medium">
                            {hotel.nights} {hotel.nights === 1 ? 'Night' : 'Nights'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  * Accommodation will be provided in selected hotel category
                </p>
              </div>
            )}

            {/* Pricing */}
            <div className="px-12 pb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Package Rates</h3>

              {hotelCategoryPricing.map((categoryPricing, catIndex) => (
                <div key={catIndex} className="mb-8">
                  <h4 className="text-lg font-semibold text-indigo-900 mb-3">{categoryPricing.category}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse max-w-2xl">
                      <thead>
                        <tr className="border-b-2 border-gray-800">
                          <th className="px-6 py-3 text-center text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Number of Pax
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Price Per Person (USD)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPricing.pricingSlabs.map((slab, slabIndex) => (
                          <tr key={slabIndex} className="border-b border-gray-200">
                            <td className="px-6 py-3 text-center text-sm font-medium text-gray-900">
                              {slab.pax} {slab.pax === 1 ? 'Person' : 'People'}
                            </td>
                            <td className="px-6 py-3 text-center text-sm text-gray-800">
                              <input
                                type="number"
                                value={slab.pricePerPerson || ''}
                                onChange={(e) => {
                                  const newPricing = [...hotelCategoryPricing];
                                  newPricing[catIndex].pricingSlabs[slabIndex].pricePerPerson = parseFloat(e.target.value) || 0;
                                  setHotelCategoryPricing(newPricing);
                                }}
                                className="text-input w-32 text-center font-medium"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <p className="text-xs text-gray-500 mt-2 italic">
                * Prices are per person in USD and may vary based on season and availability
              </p>
              <p className="text-xs text-gray-500 mt-1 italic">
                * Hotel category will be confirmed at time of booking
              </p>
            </div>

            {/* Footer */}
            <div className="px-12 py-6 border-t-2 border-indigo-600 mt-8">
              <div className="flex items-center justify-between">
                <img
                  src="/images/Funny_Logo.png"
                  alt="Funny Tourism"
                  className="h-14 object-contain opacity-80"
                />
                <div className="text-right text-xs text-gray-600 leading-relaxed">
                  <p className="font-semibold text-sm text-gray-800">Funny Tourism</p>
                  <p className="mt-1">Mehmet Akif Ersoy Mah. Hanımeli Sok No 5/B, Uskudar - Istanbul</p>
                  <p className="mt-1">www.funnytourism.com | info@funnytourism.com</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {days.length > 0 && (
          <div className="mt-6 flex justify-end gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              Print / Save PDF
            </button>
            <button
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-md shadow-sm border border-gray-300 transition-colors"
            >
              Save Itinerary
            </button>
          </div>
        )}
      </main>
      </div>
    </>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <ItineraryPageContent />
    </Suspense>
  );
}
