'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface CityStay {
  id: string
  city: string
  nights: number
}

export default function QuickQuotePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Redirect to preview page with generated quote data
      router.push(`/quick-quote/preview?data=${encodeURIComponent(JSON.stringify(result))}`)
    } catch (err: any) {
      setError(err.message || 'Failed to generate quote')
    } finally {
      setLoading(false)
    }
  }

  const totalNights = cityStays.reduce((sum, stay) => sum + stay.nights, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
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
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Generating Quote...' : 'Generate Quick Quote'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
