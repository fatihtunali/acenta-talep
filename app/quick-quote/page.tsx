'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sparkles, Calendar, Users, DollarSign, Hotel, Compass, Car } from 'lucide-react'

interface CityStay {
  id: string
  city: string
  nights: number
}

interface QuotePackage {
  quote: any
  itinerary: {
    days: Array<{
      dayNumber: number
      date: string
      city: string
      description: string
      activities: Array<{
        time: string
        title: string
        description: string
        type: 'hotel' | 'meal' | 'tour' | 'transport' | 'free-time'
      }>
    }>
  }
}

export default function QuickQuotePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotePackage, setQuotePackage] = useState<QuotePackage | null>(null)

  // Form state
  const [quoteName, setQuoteName] = useState('')
  const [cityStays, setCityStays] = useState<CityStay[]>([
    { id: '1', city: '', nights: 1 }
  ])
  const [pax, setPax] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [hotelCategory, setHotelCategory] = useState<'3' | '4' | '5'>('4')
  const [tourType, setTourType] = useState<'Private' | 'SIC'>('Private')

  // Authentication check
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const addCityStay = () => {
    const newId = String(Date.now())
    setCityStays([...cityStays, { id: newId, city: '', nights: 1 }])
  }

  const removeCityStay = (id: string) => {
    if (cityStays.length > 1) {
      setCityStays(cityStays.filter(stay => stay.id !== id))
    }
  }

  const updateCityStay = (id: string, field: 'city' | 'nights', value: string | number) => {
    setCityStays(cityStays.map(stay =>
      stay.id === id ? { ...stay, [field]: value } : stay
    ))
  }

  const handleGenerate = async () => {
    // Validation
    if (!quoteName.trim()) {
      setError('Please enter a quote name')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    const hasEmptyCities = cityStays.some(stay => !stay.city.trim())
    if (hasEmptyCities) {
      setError('Please fill in all city names')
      return
    }

    setError(null)
    setLoading(true)
    setQuotePackage(null) // Clear previous results

    try {
      const response = await fetch('/api/quick-quote/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteName,
          cityStays,
          pax,
          startDate,
          hotelCategory,
          tourType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate quote')
      }

      const result = await response.json()

      // Store results and scroll to them
      setQuotePackage(result)

      setTimeout(() => {
        const resultsSection = document.getElementById('results')
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (err: any) {
      setError(err.message || 'Failed to generate quote')
    } finally {
      setLoading(false)
    }
  }

  const totalNights = cityStays.reduce((sum, stay) => sum + stay.nights, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Quote Generator</h1>
            <p className="text-gray-600">
              Generate a complete quote and itinerary in seconds. You can refine the selections afterwards.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Quote Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quote Name
              </label>
              <input
                type="text"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="e.g., Istanbul & Cappadocia Tour"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            {/* City Stays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cities & Nights
              </label>
              <div className="space-y-3">
                {cityStays.map((stay, index) => (
                  <div key={stay.id} className="flex gap-3 items-center">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={stay.city}
                        onChange={(e) => updateCityStay(stay.id, 'city', e.target.value)}
                        placeholder="City name (e.g., Istanbul)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={stay.nights}
                        onChange={(e) => updateCityStay(stay.id, 'nights', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-16">nights</span>
                    <button
                      onClick={() => removeCityStay(stay.id)}
                      disabled={cityStays.length === 1}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addCityStay}
                className="mt-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                + Add Another City
              </button>
            </div>

            {/* PAX and Date */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Travelers (PAX)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Hotel Category and Tour Type */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Category
                </label>
                <select
                  value={hotelCategory}
                  onChange={(e) => setHotelCategory(e.target.value as '3' | '4' | '5')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="3">3 Star</option>
                  <option value="4">4 Star</option>
                  <option value="5">5 Star</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tour Type
                </label>
                <select
                  value={tourType}
                  onChange={(e) => setTourType(e.target.value as 'Private' | 'SIC')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="Private">Private Tour</option>
                  <option value="SIC">SIC (Seat in Coach)</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Total Duration:</strong> {totalNights} nights</p>
                <p><strong>Cities:</strong> {cityStays.filter(s => s.city.trim()).map(s => s.city).join(' → ')}</p>
                <p><strong>Travelers:</strong> {pax} PAX</p>
                <p><strong>Hotel:</strong> {hotelCategory} Star</p>
                <p><strong>Type:</strong> {tourType}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-all"
              >
                {loading ? (
                  <>
                    <Sparkles className="inline-block w-5 h-5 mr-2 animate-spin" />
                    Generating Your Perfect Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="inline-block w-5 h-5 mr-2" />
                    Generate Quick Quote
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {quotePackage && !loading && (
          <div id="results" className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-xl p-8 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wide">AI Generated Itinerary</span>
              </div>
              <h2 className="text-4xl font-bold mb-2">{quotePackage.quote?.name || quoteName}</h2>
              <div className="flex flex-wrap gap-6 text-blue-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{totalNights} Nights</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{pax} Travelers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  <span>{hotelCategory} Star Hotels</span>
                </div>
              </div>
            </div>

            {/* Day-by-Day Itinerary */}
            {quotePackage.itinerary?.days && quotePackage.itinerary.days.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Day-by-Day Itinerary
                </h3>
                <div className="space-y-6">
                  {quotePackage.itinerary.days.map((day) => (
                    <div key={day.dayNumber} className="border-l-4 border-blue-600 pl-6 py-4">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-bold shrink-0">
                          {day.dayNumber}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-semibold text-gray-900">Day {day.dayNumber}</h4>
                            <span className="text-sm text-gray-600">• {day.date}</span>
                            <span className="text-sm font-medium text-blue-600">{day.city}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed mb-4">{day.description}</p>

                          {/* Activities */}
                          {day.activities && day.activities.length > 0 && (
                            <div className="space-y-3">
                              {day.activities.map((activity, idx) => (
                                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="text-sm font-medium text-gray-600 w-20 shrink-0">{activity.time}</div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{activity.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 h-fit ${
                                    activity.type === 'hotel' ? 'bg-purple-100 text-purple-700' :
                                    activity.type === 'meal' ? 'bg-orange-100 text-orange-700' :
                                    activity.type === 'tour' ? 'bg-green-100 text-green-700' :
                                    activity.type === 'transport' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {activity.type}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hotels Summary */}
            {quotePackage.quote?.days && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Hotel className="w-6 h-6 text-blue-600" />
                  Accommodation
                </h3>
                <div className="space-y-4">
                  {quotePackage.quote.days.map((day: any, idx: number) => {
                    const hotelItems = day.items.filter((item: any) => item.category === 'hotelAccommodation')
                    return hotelItems.map((hotel: any, hotelIdx: number) => (
                      <div key={`${idx}-${hotelIdx}`} className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">{hotel.description}</h4>
                            <p className="text-gray-700 mt-1">{hotel.location}</p>
                            <p className="text-sm text-gray-600 mt-1">{hotel.hotelCategory}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Per Night</div>
                            <div className="text-lg font-bold text-blue-600">€{hotel.price?.toFixed(2) || '0.00'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/quotes/${quotePackage.quote?.id}`)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-all"
              >
                View Full Quote Details
              </button>
              <button
                onClick={() => router.push(`/itinerary?quote=${quotePackage.quote?.id}`)}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold transition-all"
              >
                Create Professional Itinerary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
