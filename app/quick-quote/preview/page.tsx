'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface ExpenseItem {
  id: string
  location: string
  description: string
  price: number
  singleSupplement?: number
  child0to2?: number
  child3to5?: number
  child6to11?: number
  vehicleCount?: number
  pricePerVehicle?: number
  hotelCategory?: string
}

interface DayExpenses {
  dayNumber: number
  date: string
  hotelAccommodation: ExpenseItem[]
  meals: ExpenseItem[]
  entranceFees: ExpenseItem[]
  sicTourCost: ExpenseItem[]
  tips: ExpenseItem[]
  transportation: ExpenseItem[]
  guide: ExpenseItem[]
  guideDriverAccommodation: ExpenseItem[]
  parking: ExpenseItem[]
}

interface QuoteData {
  quoteName: string
  tourType: 'Private' | 'SIC'
  startDate: string
  endDate: string
  pax: number
  hotelCategory: string
  days: DayExpenses[]
  cityStays: { id: string; city: string; nights: number }[]
  markup: number
  tax: number
  agencyMarkup: number
  hasData?: boolean
  missingData?: string[]
}

function PreviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRefineModal, setShowRefineModal] = useState(false)
  const [refineItemType, setRefineItemType] = useState<string>('')
  const [refineDayIndex, setRefineDayIndex] = useState<number>(0)

  // Load quote data from URL
  useEffect(() => {
    const dataParam = searchParams?.get('data')
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam))
        setQuoteData(parsed)
      } catch (err) {
        setError('Failed to load quote data')
      }
    }
  }, [searchParams])

  if (status === 'loading' || !quoteData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  // Calculate pricing
  const calculateTotals = () => {
    let perPersonTotal = 0
    let generalTotal = 0

    quoteData.days.forEach((day) => {
      // Per person expenses
      day.hotelAccommodation.forEach(item => perPersonTotal += item.price)
      day.meals.forEach(item => perPersonTotal += item.price)
      day.entranceFees.forEach(item => perPersonTotal += item.price)
      day.sicTourCost.forEach(item => perPersonTotal += item.price)
      day.tips.forEach(item => perPersonTotal += item.price)

      // General expenses
      day.transportation.forEach(item => {
        generalTotal += (item.vehicleCount || 0) * (item.pricePerVehicle || item.price)
      })
      day.guide.forEach(item => {
        generalTotal += (item.vehicleCount || 0) * (item.pricePerVehicle || item.price)
      })
      day.guideDriverAccommodation.forEach(item => {
        generalTotal += (item.vehicleCount || 0) * (item.pricePerVehicle || item.price)
      })
      day.parking.forEach(item => {
        generalTotal += (item.vehicleCount || 0) * (item.pricePerVehicle || item.price)
      })
    })

    const subtotal = perPersonTotal + (generalTotal / quoteData.pax)
    const markupAmount = subtotal * (quoteData.markup / 100)
    const afterMarkup = subtotal + markupAmount
    const taxAmount = afterMarkup * (quoteData.tax / 100)
    const operatorPrice = afterMarkup + taxAmount
    const agencyMarkupAmount = operatorPrice * (quoteData.agencyMarkup / 100)
    const finalPrice = operatorPrice + agencyMarkupAmount

    return {
      perPersonTotal,
      generalTotal,
      generalPerPax: generalTotal / quoteData.pax,
      subtotal,
      markupAmount,
      afterMarkup,
      taxAmount,
      operatorPrice,
      agencyMarkupAmount,
      finalPrice
    }
  }

  const totals = calculateTotals()

  const handleSaveQuote = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteName: quoteData.quoteName,
          startDate: quoteData.startDate,
          endDate: quoteData.endDate,
          pax: quoteData.pax,
          tourType: quoteData.tourType,
          markup: quoteData.markup,
          tax: quoteData.tax,
          agencyMarkup: quoteData.agencyMarkup,
          days: quoteData.days
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save quote')
      }

      const result = await response.json()
      router.push(`/quotes/${result.quoteId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save quote')
    } finally {
      setLoading(false)
    }
  }

  const handleEditInFullEditor = () => {
    // Pass the quote data to the pricing page
    const dataStr = encodeURIComponent(JSON.stringify(quoteData))
    router.push(`/pricing?quickQuoteData=${dataStr}`)
  }

  const openRefineModal = (itemType: string, dayIndex: number) => {
    setRefineItemType(itemType)
    setRefineDayIndex(dayIndex)
    setShowRefineModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quoteData.quoteName}</h1>
              <p className="text-gray-600 mt-1">
                {quoteData.cityStays.map(s => s.city).join(' → ')} • {quoteData.pax} PAX • {quoteData.tourType}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Final Price per Person</div>
              <div className="text-3xl font-bold text-blue-600">€{totals.finalPrice.toFixed(2)}</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Warning when no data found */}
          {quoteData.hasData === false && (
            <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">No Master Data Found!</h3>
                  <p className="text-yellow-800 mb-3">
                    The Quick Quote generator couldn't find any hotels, meals, or transfers in your database for the selected cities.
                    You need to add master data first before generating quotes.
                  </p>
                  {quoteData.missingData && quoteData.missingData.length > 0 && (
                    <div className="mb-3">
                      <p className="font-semibold text-yellow-900 mb-1">Missing data:</p>
                      <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                        {quoteData.missingData.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => router.push('/hotels')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                    >
                      Add Hotels
                    </button>
                    <button
                      onClick={() => router.push('/meals')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                    >
                      Add Meals
                    </button>
                    <button
                      onClick={() => router.push('/transfers')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                    >
                      Add Transfers
                    </button>
                    <button
                      onClick={() => router.push('/quick-quote')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Duration</div>
              <div className="text-lg font-semibold">{quoteData.days.length - 1} nights</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Hotel Category</div>
              <div className="text-lg font-semibold">{quoteData.hotelCategory}-star</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Start Date</div>
              <div className="text-lg font-semibold">{new Date(quoteData.startDate).toLocaleDateString()}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">End Date</div>
              <div className="text-lg font-semibold">{new Date(quoteData.endDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Day-by-Day Breakdown */}
          <div className="col-span-2 space-y-4">
            {quoteData.days.map((day, index) => {
              const hasExpenses =
                day.hotelAccommodation.length > 0 ||
                day.meals.length > 0 ||
                day.entranceFees.length > 0 ||
                day.sicTourCost.length > 0 ||
                day.transportation.length > 0 ||
                day.guide.length > 0

              if (!hasExpenses && index === quoteData.days.length - 1) {
                return null // Skip last day if it has no expenses (departure day)
              }

              return (
                <div key={day.dayNumber} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Day {day.dayNumber}</h2>
                      <p className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button
                      onClick={() => handleEditInFullEditor()}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Hotels */}
                  {day.hotelAccommodation.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Hotel</h3>
                      </div>
                      {day.hotelAccommodation.map(item => (
                        <div key={item.id} className="bg-gray-50 p-3 rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">€{item.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">per person</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meals */}
                  {day.meals.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Meals</h3>
                      </div>
                      {day.meals.map(item => (
                        <div key={item.id} className="bg-blue-50 p-3 rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">€{item.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">per person</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SIC Tours */}
                  {day.sicTourCost.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Tours</h3>
                      </div>
                      {day.sicTourCost.map(item => (
                        <div key={item.id} className="bg-green-50 p-3 rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">€{item.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">per person</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transportation */}
                  {day.transportation.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Transportation</h3>
                      </div>
                      {day.transportation.map(item => (
                        <div key={item.id} className="bg-yellow-50 p-3 rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              €{((item.vehicleCount || 0) * (item.pricePerVehicle || item.price)).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.vehicleCount && item.pricePerVehicle ? `${item.vehicleCount} × €${item.pricePerVehicle}` : 'total'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Guide */}
                  {day.guide.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Guide</h3>
                      </div>
                      {day.guide.map(item => (
                        <div key={item.id} className="bg-purple-50 p-3 rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              €{((item.vehicleCount || 0) * (item.pricePerVehicle || item.price)).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">per day</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Edit Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={handleEditInFullEditor}
                className="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
              >
                Open in Full Editor to Refine
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Make detailed adjustments, swap hotels, add tours, or modify any item
              </p>
            </div>
          </div>

          {/* Right: Pricing Summary */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Per Person Base</span>
                  <span className="font-semibold">€{totals.perPersonTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">General Expenses</span>
                  <span className="font-semibold">€{totals.generalTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>General per PAX ({quoteData.pax})</span>
                  <span>€{totals.generalPerPax.toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>€{totals.subtotal.toFixed(2)}</span>
                </div>

                {quoteData.markup > 0 && (
                  <>
                    <div className="flex justify-between text-green-700">
                      <span>Cost Markup ({quoteData.markup}%)</span>
                      <span>€{totals.markupAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">After Markup</span>
                      <span className="font-semibold">€{totals.afterMarkup.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {quoteData.tax > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>Tax ({quoteData.tax}%)</span>
                    <span>€{totals.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Operator Price</span>
                  <span>€{totals.operatorPrice.toFixed(2)}</span>
                </div>

                {quoteData.agencyMarkup > 0 && (
                  <>
                    <div className="flex justify-between text-blue-700">
                      <span>Agency Markup ({quoteData.agencyMarkup}%)</span>
                      <span>€{totals.agencyMarkupAmount.toFixed(2)}</span>
                    </div>

                    <div className="border-t pt-3 flex justify-between font-bold text-xl text-blue-600">
                      <span>Final Client Price</span>
                      <span>€{totals.finalPrice.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSaveQuote}
                  disabled={loading || quoteData.hasData === false}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Quote'}
                </button>
                {quoteData.hasData === false && (
                  <p className="text-xs text-center text-gray-600">
                    Cannot save quote without master data. Please add hotels, meals, and transfers first.
                  </p>
                )}

                <button
                  onClick={() => router.push('/quick-quote')}
                  className="w-full border border-gray-300 py-3 px-6 rounded-lg hover:bg-gray-50"
                >
                  Start New Quote
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 text-sm mb-2">Next Steps</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Review the auto-generated selections</li>
                  <li>• Use Full Editor to refine details</li>
                  <li>• Save quote to generate itinerary</li>
                  <li>• Share with your client</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QuickQuotePreviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PreviewContent />
    </Suspense>
  )
}
